import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

export type ConnectionState = 'connected' | 'connecting' | 'disconnected'

export interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'error'
}

interface UseWebRTCOptions {
  signalingServer: string
  identity: 'controller' | 'excavator'
  targetPeer?: string
  enabled?: boolean
  enableMicrophone?: boolean // 🎤 是否启用麦克风（语音通话）
  onVideoTrack?: (stream: MediaStream) => void
  onDataChannel?: (channel: RTCDataChannel) => void
}

export interface WebRTCStats {
  rtt: number // 往返时间 (ms)
  jitter: number // 抖动 (ms)
  packetsReceived: number // 收到的包数
  bytesReceived: number // 收到的字节数
  frameRate: number // 帧率
}

// 📡 定义遥测数据接口 (匹配 Go 端结构)
export interface TelemetryData {
  device_id: string;
  timestamp: number;
  connection: {
    status: string;
    latency_ms: number;
    frame_rate: number;
    seq?: number; // [新增] 包序号，用于检测丢包
  };
  safety: {
    emergency_stop: boolean;
    parking_brake: boolean;
    hydraulic_lock: boolean;
    power_enable: boolean;
    fault_code: number;
  };
  motion: {
    gear: string;
    speed_mode: string;
    speed_kph: number;
    engine_rpm: number;
    steering_angle_deg: number;
    steering_norm: number;
    left_track_speed: number;
    right_track_speed: number;
    throttle_feedback: number;
    brake_feedback: number;
  };
  attitude: {
    pitch_deg: number;
    roll_deg: number;
    yaw_deg: number;
  };
  // 忽略 arm 和 vitals 的详细定义以简化，需要时再加
  vitals: {
    fuel_percent: number;
    coolant_temp_c: number;
    hydraulic_pressure_bar: number;
    battery_voltage_v: number;
  };
  aux: { // [修改] 替代 lights，扩展性更强
    light_code: number;
    horn_status: boolean; // [移入] 喇叭状态
  };
}

export function useWebRTC({
  signalingServer,
  identity,
  targetPeer = 'excavator',
  enabled = false,
  enableMicrophone = false, // 🎤 默认不启用麦克风
  onVideoTrack,
  onDataChannel,
}: UseWebRTCOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [ping, setPing] = useState<number>(0)
  const [stats, setStats] = useState<WebRTCStats | null>(null)
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null) // 📡 遥测数据状态
  const lastTelemetryTimeRef = useRef<number>(0) // 看门狗计时
  
  // 🎤 麦克风相关状态
  const [isMuted, setIsMuted] = useState<boolean>(false) // 默认开启
  const [microphoneReady, setMicrophoneReady] = useState<boolean>(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null) // 🎤 本地麦克风流
  const remoteStreamRef = useRef<MediaStream | null>(null) // 🔊 远程合并流（音视频）
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null) // 心跳定时器
  const prevPacketsReceivedRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef<number>(0)
  const isIntentionalDisconnectRef = useRef<boolean>(false)
  
  // Forward refs for connect/disconnect to break dependency cycles
  const connectRef = useRef<() => void>(() => {})
  const disconnectRef = useRef<() => void>(() => {})

  // 使用 useRef 避免依赖问题
  const addLogRef = useRef((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
    setLogs(prev => [...prev, { time, message, type }])
    console.log(`[${time}] ${message}`)
  })

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    addLogRef.current(message, type)
  }, [])

  // 获取 WebRTC 统计信息
  const getWebRTCStats = useCallback(async () => {
    if (!pcRef.current) return

    try {
      const stats = await pcRef.current.getStats()
      let rtt = 0
      let jitter = 0
      let packetsReceived = 0
      let bytesReceived = 0
      let frameRate = 0

      stats.forEach((report: any) => {
        // inbound-rtp: 接收端统计
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsReceived = report.packetsReceived || 0
          bytesReceived = report.bytesReceived || 0
          jitter = report.jitter ? report.jitter * 1000 : 0 // 转换为毫秒
          frameRate = report.framesPerSecond || 0
        }

        // remote-inbound-rtp: 远程入站统计（包含 RTT）
        if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
          rtt = report.roundTripTime ? report.roundTripTime * 1000 : 0 // 转换为毫秒
        }

        // candidate-pair: 连接候选对（也可能包含 RTT）
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime) {
            rtt = report.currentRoundTripTime * 1000 // 转换为毫秒
          }
        }
      })

      // 更新历史计数（用于下次计算增量）
      prevPacketsReceivedRef.current = packetsReceived

      // 更新统计信息
      setStats({
        rtt,
        jitter,
        packetsReceived,
        bytesReceived,
        frameRate,
      })

      // 更新 ping 显示（使用 RTT）
      if (rtt > 0) {
        setPing(Math.round(rtt))
      }
    } catch (error) {
      console.error('Failed to get WebRTC stats:', error)
    }
  }, [])

  const sendSignaling = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg = {
        type,
        from: identity,
        to: targetPeer,
        payload,
      }
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [identity, targetPeer])

  const createPeerConnection = useCallback(async () => {
    addLog('创建 PeerConnection...', 'info')
    
    const pc = new RTCPeerConnection({
      iceServers: [] // 本地网络不需要 STUN
    })
    
    // 为控制器创建数据通道
    if (identity === 'controller') {
      addLog('为控制器创建数据通道...', 'info')
      
      // 1. 创建控制通道 (Controls) - 用于发送指令
      const dc = pc.createDataChannel('controls', { ordered: false, maxRetransmits: 0 })
      dc.onopen = () => addLog('✅ 控制通道已打开', 'success')
      dc.onclose = () => addLog('🔌 控制通道已关闭', 'info')
      dc.onerror = (e) => addLog(`❌ 控制通道错误: ${e}`, 'error')
      setDataChannel(dc)

      // 2. 创建遥测通道 (Telemetry) - 用于接收状态
      // 前端主动创建，Go 端监听到后会开始推送数据
      addLog('为控制器创建遥测通道...', 'info')
      const dcTelemetry = pc.createDataChannel('telemetry', { ordered: false, maxRetransmits: 0 })
      
      dcTelemetry.onopen = () => addLog('✅ 遥测通道已打开', 'success')
      dcTelemetry.onclose = () => addLog('🔌 遥测通道已关闭', 'info')
      dcTelemetry.onerror = (e) => addLog(`❌ 遥测通道错误: ${e}`, 'error')
      
      dcTelemetry.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as TelemetryData
          // 🐛 调试用：打印接收到的遥测数据 (每30帧打印一次，防止刷屏)
          if (data.connection.seq && data.connection.seq % 30 === 0) {
            console.log('📡 Telemetry:', data)
          }
          setTelemetry(data)
          lastTelemetryTimeRef.current = Date.now()
        } catch (err) {
          console.warn('解析遥测数据失败:', err)
        }
      }

    } else {
      // 为挖掘机设置数据通道回调
      pc.ondatachannel = (event) => {
        const dc = event.channel
        addLog(`✅ 接收到数据通道: ${dc.label}`, 'success')
        
        if (dc.label === 'telemetry') {
          // 📡 处理遥测数据通道
          dc.onopen = () => addLog('✅ 遥测通道已打开', 'success')
          dc.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data) as TelemetryData
              // 🐛 调试用：打印接收到的遥测数据 (每30帧打印一次，防止刷屏)
              if (data.connection.seq && data.connection.seq % 30 === 0) {
                console.log('📡 Telemetry:', data)
              }
              setTelemetry(data)
              lastTelemetryTimeRef.current = Date.now()
            } catch (err) {
              console.warn('解析遥测数据失败:', err)
            }
          }
        } else {
          // 处理其他通道 (如 controls 回显或视频信令)
          dc.onopen = () => addLog('✅ 数据通道已打开', 'success')
          dc.onclose = () => addLog('🔌 数据通道已关闭', 'info')
          dc.onerror = (e) => addLog(`❌ 数据通道错误: ${e}`, 'error')
          
          if (onDataChannel) {
            onDataChannel(dc)
          }
          setDataChannel(dc)
        }
      }
    }

    // 监听 ICE 候选
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addLog('发送 ICE 候选', 'info')
        sendSignaling('candidate', event.candidate)
      }
    }
    
    // 监听连接状态
    pc.oniceconnectionstatechange = () => {
      addLog(`ICE 连接状态: ${pc.iceConnectionState}`, 'info')
      
      if (pc.iceConnectionState === 'connected') {
        addLog('✅ WebRTC 连接成功！', 'success')
        setConnectionState('connected')
        
        // 启动定期获取 WebRTC 统计信息（每秒一次）
        statsIntervalRef.current = setInterval(() => {
          getWebRTCStats()
        }, 1000)
      } else if (pc.iceConnectionState === 'failed') {
        addLog('❌ WebRTC 连接失败', 'error')
        setConnectionState('disconnected')
        
        // 停止统计信息收集
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current)
          statsIntervalRef.current = null
        }
      } else if (pc.iceConnectionState === 'disconnected') {
        addLog('⚠️ WebRTC 连接断开', 'info')
        setConnectionState('disconnected')
        
        // 停止统计信息收集
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current)
          statsIntervalRef.current = null
        }
      }
    }
    
    // 监听远程流（音频和视频可能在不同的流中，需要合并）
    pc.ontrack = (event) => {
      addLog(`✅ 接收到 ${event.track.kind} 轨道`, 'success')
      
      // 创建或获取合并后的远程流
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream()
        addLog('🔊 创建远程媒体流', 'info')
      }
      
      // 将新轨道添加到合并流中（避免重复添加）
      const existingTrack = remoteStreamRef.current.getTracks().find(
        t => t.kind === event.track.kind
      )
      if (existingTrack) {
        remoteStreamRef.current.removeTrack(existingTrack)
        addLog(`🔄 替换已有的 ${event.track.kind} 轨道`, 'info')
      }
      remoteStreamRef.current.addTrack(event.track)
      
      // 通知外部（使用合并后的流）
      if (onVideoTrack) {
        onVideoTrack(remoteStreamRef.current)
      }
      
      // 打印当前流的轨道信息
      const tracks = remoteStreamRef.current.getTracks()
      addLog(`📊 远程流包含 ${tracks.length} 个轨道: ${tracks.map(t => t.kind).join(', ')}`, 'info')
    }
    
    // 🎤 麦克风处理：如果启用麦克风，获取本地音频流并添加到 PeerConnection
    if (enableMicrophone && identity === 'controller') {
      try {
        addLog('🎤 正在请求麦克风权限...', 'info')
        const localStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,  // 回声消除
            noiseSuppression: true,  // 噪音抑制
            autoGainControl: true,   // 自动增益
          } 
        })
        localStreamRef.current = localStream
        
        // 将音频轨道添加到 PeerConnection
        localStream.getAudioTracks().forEach(track => {
          pc.addTrack(track, localStream)
          // 默认开启（发送语音）
          track.enabled = true
          addLog(`🎤 已添加音频轨道: ${track.label}`, 'success')
        })
        
        setMicrophoneReady(true)
        addLog('🎤 麦克风已就绪（默认开启）', 'success')
        
        // 添加接收器（双向音频 + 接收视频）
        pc.addTransceiver('video', { direction: 'recvonly' })
        // 注意：音频轨道已通过 addTrack 添加，transceiver 会自动创建为 sendrecv
        
      } catch (error) {
        addLog(`🎤 麦克风获取失败: ${error}`, 'error')
        setMicrophoneReady(false)
        // 即使麦克风失败，也继续连接（只是没有语音）
        pc.addTransceiver('audio', { direction: 'recvonly' })
        pc.addTransceiver('video', { direction: 'recvonly' })
      }
    } else {
      // 不启用麦克风时，只接收音视频
    pc.addTransceiver('audio', { direction: 'recvonly' })
    pc.addTransceiver('video', { direction: 'recvonly' })
    }
    
    pcRef.current = pc
    
    // 创建 Offer
    addLog('创建 Offer...', 'info')
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    // 等待 ICE 收集完成
    await new Promise<void>(resolve => {
      if (pc.iceGatheringState === 'complete') {
        resolve()
      } else {
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            resolve()
          }
        }
      }
    })
    
    addLog(`发送 Offer 到 ${targetPeer}...`, 'info')
    sendSignaling('offer', pc.localDescription)
  }, [addLog, sendSignaling, targetPeer, onVideoTrack, getWebRTCStats, identity, onDataChannel, enableMicrophone])

  const handleSignalingMessage = useCallback(async (msg: any) => {
    addLog(`收到信令: ${msg.type} (来自 ${msg.from})`, 'info')
    
    if (!pcRef.current) return
    
    if (msg.type === 'answer') {
      addLog('收到 Answer，设置 RemoteDescription...', 'info')
      await pcRef.current.setRemoteDescription(msg.payload)
      addLog('✅ Answer 已设置', 'success')
      
    } else if (msg.type === 'candidate') {
      addLog('添加 ICE 候选', 'info')
      try {
        await pcRef.current.addIceCandidate(msg.payload)
      } catch (error) {
        addLog(`ICE 候选添加失败: ${error}`, 'error')
      }
    }
  }, [addLog])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= 10) {
      addLogRef.current('❌ 重连失败次数过多，停止自动重连', 'error')
      return
    }

    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000)
    addLogRef.current(`⚠️ 连接断开，${(delay / 1000).toFixed(1)}秒后尝试重连...`, 'info')
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1
      connectRef.current()
    }, delay)
  }, [])

  const connect = useCallback(() => {
    if (!enabled || wsRef.current) return

    try {
      isIntentionalDisconnectRef.current = false
      addLog('正在连接信令服务器...', 'info')
      setConnectionState('connecting')
      
      const ws = new WebSocket(signalingServer)
      
      ws.onopen = () => {
        reconnectAttemptsRef.current = 0 // 重置重连次数
        addLog('✅ 信令服务器连接成功', 'success')
        
        // 注册身份
        ws.send(JSON.stringify({
          type: 'register',
          identity,
        }))
        
        addLog(`已注册为 ${identity}`, 'success')
        
        // 启动心跳机制：每 30 秒发送一次 ping，防止 NAT/防火墙超时断开
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ping',
              from: identity,
            }))
          }
        }, 30000) // 30 秒
        
        // 创建 PeerConnection
        createPeerConnection()
      }
      
      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
          
          // 处理心跳响应（pong）
          if (msg.type === 'pong') {
            // 心跳响应，无需处理，仅用于保持连接活跃
            return
          }
          
          await handleSignalingMessage(msg)
        } catch (error) {
          addLog(`处理消息失败: ${error}`, 'error')
        }
      }
      
      ws.onerror = () => {
        addLog('❌ WebSocket 错误', 'error')
        setConnectionState('disconnected')
      }
      
      ws.onclose = () => {
        addLog('🔌 信令服务器断开', 'info')
        setConnectionState('disconnected')
        wsRef.current = null // 确保引用被清空
        
        // 清除心跳定时器
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }

        // 尝试重连
        if (!isIntentionalDisconnectRef.current) {
          scheduleReconnect()
        }
      }
      
      wsRef.current = ws
      
    } catch (error) {
      addLog(`❌ 连接失败: ${error}`, 'error')
      setConnectionState('disconnected')
    }
  }, [enabled, signalingServer, identity, addLog, createPeerConnection, handleSignalingMessage, scheduleReconnect])

  // 🎤 切换麦克风静音状态
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      const newMutedState = !audioTracks[0]?.enabled
      setIsMuted(newMutedState)
      addLog(newMutedState ? '🔇 麦克风已静音' : '🎤 麦克风已开启', 'info')
    } else {
      addLog('⚠️ 麦克风未就绪', 'error')
    }
  }, [addLog])

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true
    
    // 清除重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    reconnectAttemptsRef.current = 0

    // 🎤 停止本地麦克风流
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      setMicrophoneReady(false)
      setIsMuted(true)
    }
    
    // 🔊 清理远程流
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop())
      remoteStreamRef.current = null
    }
    
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    prevPacketsReceivedRef.current = null
    addLog('已断开所有连接', 'info')
    setConnectionState('disconnected')
    setPing(0)
    setStats(null)
    setTelemetry(null)
  }, [addLog])

  // 🐶 看门狗: 检查遥测数据是否超时 (500ms)
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      if (connectionState === 'connected' && lastTelemetryTimeRef.current > 0) {
        const now = Date.now()
        if (now - lastTelemetryTimeRef.current > 500) {
          // 超过 500ms 未收到数据，认为遥测丢失
        }
      }
    }, 500)
    return () => clearInterval(watchdogInterval)
  }, [connectionState])

  useEffect(() => {
    connectRef.current = connect
    disconnectRef.current = disconnect
  }, [connect, disconnect])

  // 自动连接/断开
  useEffect(() => {
    if (enabled) {
      connectRef.current()
    } else {
      disconnectRef.current()
    }
    
    return () => {
      disconnectRef.current()
    }
  }, [enabled])

  return {
    connectionState,
    logs,
    ping,
    stats,
    dataChannel,
    telemetry, // 导出遥测数据
    connect,
    disconnect,
    // 🎤 麦克风相关
    isMuted,
    microphoneReady,
    toggleMute,
  }
}

