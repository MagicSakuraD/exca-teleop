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
  onVideoTrack?: (stream: MediaStream) => void
}

export function useWebRTC({
  signalingServer,
  identity,
  targetPeer = 'excavator',
  enabled = false,
  onVideoTrack,
}: UseWebRTCOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [ping, setPing] = useState<number>(0)
  
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPingRef = useRef<number>(0)

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
      } else if (pc.iceConnectionState === 'failed') {
        addLog('❌ WebRTC 连接失败', 'error')
        setConnectionState('disconnected')
      } else if (pc.iceConnectionState === 'disconnected') {
        addLog('⚠️ WebRTC 连接断开', 'info')
        setConnectionState('disconnected')
      }
    }
    
    // 监听远程视频流
    pc.ontrack = (event) => {
      addLog(`✅ 接收到 ${event.track.kind} 流`, 'success')
      if (event.streams && event.streams[0] && onVideoTrack) {
        onVideoTrack(event.streams[0])
      }
    }
    
    // 添加接收器（controller 只接收）
    pc.addTransceiver('audio', { direction: 'recvonly' })
    pc.addTransceiver('video', { direction: 'recvonly' })
    
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
  }, [addLog, sendSignaling, targetPeer, onVideoTrack])

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
    } else if (msg.type === 'pong') {
      const latency = Date.now() - lastPingRef.current
      setPing(latency)
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
        
        // 创建 PeerConnection
        createPeerConnection()
        
        // 启动 ping 检测
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingRef.current = Date.now()
            ws.send(JSON.stringify({ type: 'ping', from: identity }))
          }
        }, 2000)
      }
      
      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
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
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }
      }
      
      wsRef.current = ws
      
    } catch (error) {
      addLog(`❌ 连接失败: ${error}`, 'error')
      setConnectionState('disconnected')
    }
  }, [enabled, signalingServer, identity, addLog, createPeerConnection, handleSignalingMessage])

  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    addLog('已断开所有连接', 'info')
    setConnectionState('disconnected')
    setPing(0)
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
    connect,
    disconnect,
  }
}

