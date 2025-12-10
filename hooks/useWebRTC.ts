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
  packetLossRate: number // 当前丢包率（%）
  packetsReceived: number // 收到的包数
  bytesReceived: number // 收到的字节数
  frameRate: number // 帧率
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
  
  // 🎤 麦克风相关状态
  const [isMuted, setIsMuted] = useState<boolean>(false) // 默认开启
  const [microphoneReady, setMicrophoneReady] = useState<boolean>(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null) // 🎤 本地麦克风流
  const remoteStreamRef = useRef<MediaStream | null>(null) // 🔊 远程合并流（音视频）
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null) // 心跳定时器
  const prevPacketsLostRef = useRef<number | null>(null)
  const prevPacketsReceivedRef = useRef<number | null>(null)

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
      let cumulativePacketsLost = 0

      stats.forEach((report: any) => {
        // inbound-rtp: 接收端统计
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          cumulativePacketsLost = report.packetsLost || 0
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

      // 计算当前时间窗口丢包率（基于增量）
      let packetLossRate = 0
      if (prevPacketsLostRef.current !== null && prevPacketsReceivedRef.current !== null) {
        const deltaLost = Math.max(0, cumulativePacketsLost - prevPacketsLostRef.current)
        const deltaRecv = Math.max(0, packetsReceived - prevPacketsReceivedRef.current)
        const deltaTotal = deltaLost + deltaRecv
        if (deltaTotal > 0) {
          packetLossRate = (deltaLost / deltaTotal) * 100
        }
      }

      // 更新历史计数（用于下次计算增量）
      prevPacketsLostRef.current = cumulativePacketsLost
      prevPacketsReceivedRef.current = packetsReceived

      // 更新统计信息
      setStats({
        rtt,
        jitter,
        packetLossRate,
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
      const dc = pc.createDataChannel('controls', { ordered: false, maxRetransmits: 0 })
      dc.onopen = () => addLog('✅ 数据通道已打开', 'success')
      dc.onclose = () => addLog('🔌 数据通道已关闭', 'info')
      dc.onerror = (e) => addLog(`❌ 数据通道错误: ${e}`, 'error')
      setDataChannel(dc)
    } else {
      // 为挖掘机设置数据通道回调
      pc.ondatachannel = (event) => {
        addLog('✅ 接收到数据通道', 'success')
        const dc = event.channel
        dc.onopen = () => addLog('✅ 数据通道已打开', 'success')
        dc.onclose = () => addLog('🔌 数据通道已关闭', 'info')
        dc.onerror = (e) => addLog(`❌ 数据通道错误: ${e}`, 'error')
        if (onDataChannel) {
          onDataChannel(dc)
        }
        setDataChannel(dc)
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

  const connect = useCallback(() => {
    if (!enabled || wsRef.current) return

    try {
      addLog('正在连接信令服务器...', 'info')
      setConnectionState('connecting')
      
      const ws = new WebSocket(signalingServer)
      
      ws.onopen = () => {
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
        
        // 清除心跳定时器
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
      }
      
      wsRef.current = ws
      
    } catch (error) {
      addLog(`❌ 连接失败: ${error}`, 'error')
      setConnectionState('disconnected')
    }
  }, [enabled, signalingServer, identity, addLog, createPeerConnection, handleSignalingMessage])

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
    prevPacketsLostRef.current = null
    prevPacketsReceivedRef.current = null
    addLog('已断开所有连接', 'info')
    setConnectionState('disconnected')
    setPing(0)
    setStats(null)
  }, [addLog])

  // 使用 ref 保存最新的 connect 和 disconnect
  const connectRef = useRef(connect)
  const disconnectRef = useRef(disconnect)
  
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
    connect,
    disconnect,
    // 🎤 麦克风相关
    isMuted,
    microphoneReady,
    toggleMute,
  }
}

