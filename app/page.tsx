"use client"

import { useState, useEffect, useRef } from "react"
import { LogInIcon, Settings, Wifi, WifiOff, AlertTriangle, Power, Lightbulb, Megaphone, Zap, OctagonAlert, Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsPanel } from "@/components/settings-panel"
import { HydraulicGauge } from "@/components/hydraulic-gauge"
import { StatusIndicator } from "@/components/status-indicator"
import { ConnectionLog } from "@/components/connection-log"
import { LoginScreen } from "@/components/login-screen"
import { ConnectDialog } from "@/components/connect-dialog"
import { useWebRTC, type ConnectionState } from "@/hooks/useWebRTC"
import { GamepadControl } from "@/components/GamepadControl"
import { GlassButton } from "@/components/GlassButton"

type ConnectionQuality = "excellent" | "good" | "poor" | "critical"

export default function RemoteExcavatorControl() {
  const [hydraulicPressure, setHydraulicPressure] = useState<number>(0)
  const [armAngle, setArmAngle] = useState<number>(0)
  const [bucketAngle, setBucketAngle] = useState<number>(0)
  const [engineTemp, setEngineTemp] = useState<number>(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState("")
  const [excavatorName, setExcavatorName] = useState("")
  const [signalingServer, setSignalingServer] = useState("wss://cyberc3-cloud-server.sjtu.edu.cn/ws")
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasBeenConnected, setHasBeenConnected] = useState(false)

  // 3. 添加新的控制状态
  const [isLightOn, setIsLightOn] = useState(false);
  const [speedMode, setSpeedMode] = useState<"TURTLE" | "RABBIT">("TURTLE");
  const [micEnabled, setMicEnabled] = useState(true); // 🎤 是否启用麦克风功能
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(true); // 🔊 远程音频默认关闭（确保视频自动播放）

  // WebRTC 连接
  const { 
    connectionState, 
    logs, 
    ping, 
    stats, 
    dataChannel,
    // 🎤 麦克风相关
    isMuted,
    microphoneReady,
    toggleMute,
  } = useWebRTC({
    signalingServer,
    identity: "controller",
    targetPeer: excavatorName,
    enabled: isLoggedIn && excavatorName.length > 0,
    enableMicrophone: micEnabled, // 🎤 启用麦克风
    onVideoTrack: (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    },
  })

  const handleLogin = (user: string, password: string) => {
    // In a real app, this would validate against a backend
    setIsLoggedIn(true)
    setUsername(user)
  }

  const handleConnect = (name: string) => {
    setExcavatorName(name)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername("")
    setExcavatorName("")
    setHydraulicPressure(0)
    setArmAngle(0)
    setBucketAngle(0)
    setEngineTemp(0)
    setHasBeenConnected(false)
  }

  const handleExcavatorNameChange = (name: string) => {
    setExcavatorName(name)
  }

  const handleSignalingServerChange = (server: string) => {
    setSignalingServer(server)
  }

  // 4. 添加控制处理函数 (尝试通过 DataChannel 发送)
  const sendCommand = (cmd: string, value: any) => {
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(JSON.stringify({ type: cmd, value }));
    } else {
      console.warn("DataChannel not ready", cmd);
    }
  };

  const handleHorn = () => {
    console.log("📢 滴滴！！");
    sendCommand("horn", true);
    // 简单的防抖或延时关闭逻辑可以在这里添加
    setTimeout(() => sendCommand("horn", false), 200);
  };

  const handleEmergency = () => {
    console.warn("🛑 紧急停机触发！！！");
    sendCommand("emergency_stop", true);
    alert("已发送紧急停机指令！");
  };

  const toggleLight = () => {
    const newState = !isLightOn;
    setIsLightOn(newState);
    sendCommand("light", newState);
  };

  const toggleSpeed = () => {
    const newMode = speedMode === "RABBIT" ? "TURTLE" : "RABBIT";
    setSpeedMode(newMode);
    sendCommand("speed_mode", newMode);
  };

  // 🔊 切换远程音频（扬声器）静音状态
  const toggleSpeaker = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsSpeakerMuted(videoRef.current.muted);
      console.log(videoRef.current.muted ? "🔇 扬声器已静音" : "🔊 扬声器已开启");
    }
  };

  // Simulate real-time sensor data when connected
  useEffect(() => {
    if (connectionState === "connected") {
      setHasBeenConnected(true)
    }

    if (connectionState !== "connected") {
      // Reset data when not connected
      setHydraulicPressure(0)
      setArmAngle(0)
      setBucketAngle(0)
      setEngineTemp(0)
      return
    }

    // Simulate real-time data updates only when connected
    const dataInterval = setInterval(() => {
      setHydraulicPressure(Math.floor(Math.random() * 30) + 50)
      setArmAngle(Math.floor(Math.random() * 90))
      setBucketAngle(Math.floor(Math.random() * 60))
      setEngineTemp(Math.floor(Math.random() * 20) + 75)
    }, 1000)

    return () => {
      clearInterval(dataInterval)
    }
  }, [connectionState])

  const getConnectionQuality = (): ConnectionQuality => {
    if (ping < 50) return "excellent"
    if (ping < 100) return "good"
    if (ping < 200) return "poor"
    return "critical"
  }

  const getQualityColor = (quality: ConnectionQuality) => {
    switch (quality) {
      case "excellent":
        return "text-green-400"
      case "good":
        return "text-green-400"
      case "poor":
        return "text-yellow-400"
      case "critical":
        return "text-red-400"
    }
  }

  // 如果未登录，显示登录界面
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-950">
      {/* Video Stream Background */}
      <div className="absolute inset-0 bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted={isSpeakerMuted}
        />
        {/* Subtle overlay for better text readability */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Gamepad Control Logic */}
      <GamepadControl dataChannel={dataChannel} />

      {/* Connect Dialog */}
      <ConnectDialog 
        open={isLoggedIn && !excavatorName} 
        onConnect={handleConnect} 
      />

      {/* HUD Overlay - pointer-events-none on container, enable on interactive elements */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
        {/* Top Bar - Status and Connection Info */}
        <div className="flex justify-between items-start">
          {isLoggedIn && excavatorName && (
            <div className="bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-white/10 pointer-events-auto">
              <div className="flex items-center gap-4">
                <StatusIndicator state={connectionState} />
                {connectionState === "connected" && stats && (
                  <>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-green-400" />
                      <span className="text-xs uppercase tracking-wider text-gray-300">RTT</span>
                      <span className={`font-mono text-lg font-bold ${getQualityColor(getConnectionQuality())}`}>
                        {ping}ms
                      </span>
                    </div>
                    {stats.jitter > 0 && (
                      <>
                        <div className="h-8 w-px bg-white/20" />
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-gray-300">抖动</span>
                          <span className="font-mono text-sm font-bold text-yellow-400">
                            {stats.jitter.toFixed(1)}ms
                          </span>
                        </div>
                      </>
                    )}
                    {stats.frameRate > 0 && (
                      <>
                        <div className="h-8 w-px bg-white/20" />
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-gray-300">帧率</span>
                          <span className="font-mono text-sm font-bold text-cyan-400">
                            {stats.frameRate.toFixed(0)}fps
                          </span>
                        </div>
                      </>
                    )}
                    {stats && (
                      <>
                        <div className="h-8 w-px bg-white/20" />
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-gray-300">丢包率</span>
                          <span className={`font-mono text-sm font-bold ${
                            stats.packetLossRate > 0.1 ? "text-red-400" : "text-green-400"
                          }`}>
                            {stats.packetLossRate.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Right: Equipment ID and Settings */}
          <div className="flex items-start gap-3">
            {isLoggedIn && excavatorName && (
              <div className="bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                <div className="text-sm font-mono text-gray-300">
                  <span className="text-xs uppercase tracking-wider text-gray-400">设备</span>
                  <div className="text-lg font-bold text-white">{excavatorName}</div>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/60 backdrop-blur-sm border border-white/10 hover:bg-black/80 pointer-events-auto"
              onClick={() => setSettingsOpen(true)}
            >
              {isLoggedIn ? (
                <Settings className="h-5 w-5 text-gray-300" />
              ) : (
                <LogInIcon className="h-5 w-5 text-gray-300" />
              )}
            </Button>
          </div>
        </div>

        {/* Bottom Control Panel - VisionOS Style */}
        {isLoggedIn && (
          <div className="flex justify-center pb-8 animate-in slide-in-from-bottom-10 duration-700 fade-in pointer-events-none">
            {/* Glass Container */}
            <div className="flex items-center gap-2 md:gap-4 p-3 md:p-4 rounded-[2.5rem] md:rounded-[3rem] bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-auto">
              
              {/* --- Engine & Power Group --- */}
              <div className="flex gap-2 md:gap-3">
                <GlassButton 
                  icon={Power} 
                  label={connectionState === "connected" ? "运行中" : "待机"} 
                  isActive={connectionState === "connected"}
                  color={connectionState === "connected" ? "text-green-400" : "text-white"}
                  onClick={() => console.log("Toggle Engine")} 
                />
              </div>
              
              <div className="w-px h-12 md:h-16 bg-white/10 mx-1 md:mx-2" />

              {/* --- Auxiliaries Group --- */}
              <div className="flex gap-2 md:gap-3">
                <GlassButton 
                  icon={Lightbulb} 
                  label="工作灯" 
                  isActive={isLightOn}
                  color="text-yellow-400"
                  onClick={toggleLight} 
                />
                <GlassButton 
                  icon={Megaphone} 
                  label="鸣笛" 
                  color="text-orange-400"
                  onClick={handleHorn} 
                />
                <GlassButton 
                  icon={Zap} 
                  label={speedMode === "RABBIT" ? "高速" : "低速"} 
                  isActive={speedMode === "RABBIT"}
                  color="text-cyan-400"
                  onClick={toggleSpeed} 
                />
                {/* 🎤 麦克风按钮（发送语音） */}
                <GlassButton 
                  icon={isMuted ? MicOff : Mic} 
                  label={!microphoneReady ? "无麦克风" : (isMuted ? "静音中" : "发送中")} 
                  isActive={!isMuted && microphoneReady}
                  color={!microphoneReady ? "text-gray-500" : (isMuted ? "text-red-400" : "text-green-400")}
                  onClick={toggleMute}
                  disabled={!microphoneReady}
                />
                {/* 🔊 扬声器按钮（接收语音） */}
                <GlassButton 
                  icon={isSpeakerMuted ? VolumeX : Volume2} 
                  label={isSpeakerMuted ? "扬声器关" : "扬声器开"} 
                  isActive={!isSpeakerMuted}
                  color={isSpeakerMuted ? "text-red-400" : "text-green-400"}
                  onClick={toggleSpeaker}
                />
              </div>

              <div className="w-px h-12 md:h-16 bg-white/10 mx-1 md:mx-2" />

              {/* --- E-Stop Group --- */}
              <div className="flex gap-2 md:gap-3 pl-1 md:pl-2">
                <GlassButton 
                  icon={OctagonAlert} 
                  label="急停" 
                  isEmergency={true}
                  onClick={handleEmergency} 
                />
              </div>

            </div>
          </div>
        )}
      </div>

      {hasBeenConnected && connectionState === "disconnected" && (
        <div className="absolute inset-0 z-50 bg-red-900/90 backdrop-blur-sm flex flex-col items-center justify-center">
          <WifiOff className="h-24 w-24 text-red-200 mb-6 animate-pulse" />
          <h1 className="text-6xl font-bold text-red-100 animate-pulse mb-4">连接中断</h1>
          <p className="text-xl text-red-200">CONNECTION LOST</p>
        </div>
      )}

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        username={username}
        onLogout={handleLogout}
        excavatorName={excavatorName}
        showConnectionLog={isLoggedIn}
        connectionLogs={<ConnectionLog logs={logs} />}
      />
    </div>
  )
}
