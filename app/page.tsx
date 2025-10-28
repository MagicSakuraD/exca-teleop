"use client"

import { useState, useEffect, useRef } from "react"
import { LogInIcon, Settings, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsPanel } from "@/components/settings-panel"
import { HydraulicGauge } from "@/components/hydraulic-gauge"
import { StatusIndicator } from "@/components/status-indicator"
import { ConnectionLog } from "@/components/connection-log"
import { LoginScreen } from "@/components/login-screen"
import { useWebRTC, type ConnectionState } from "@/hooks/useWebRTC"

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
  const [signalingServer, setSignalingServer] = useState("ws://111.186.56.118:8090/ws")
  const videoRef = useRef<HTMLVideoElement>(null)

  // WebRTC 连接
  const { connectionState, logs, ping } = useWebRTC({
    signalingServer,
    identity: 'controller',
    targetPeer: 'excavator',
    enabled: isLoggedIn && excavatorName.length > 0,
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

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername("")
    setExcavatorName("")
    setHydraulicPressure(0)
    setArmAngle(0)
    setBucketAngle(0)
    setEngineTemp(0)
  }

  const handleExcavatorNameChange = (name: string) => {
    setExcavatorName(name)
  }

  const handleSignalingServerChange = (server: string) => {
    setSignalingServer(server)
  }

  // Simulate real-time sensor data when connected
  useEffect(() => {
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
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted
          loop
          poster="/excavator-construction-site-view.jpg"
        >
          <source src="/placeholder-video.mp4" type="video/mp4" />
        </video>
        {/* Subtle overlay for better text readability */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* HUD Overlay - pointer-events-none on container, enable on interactive elements */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
        {/* Top Bar - Status and Connection Info */}
        <div className="flex justify-between items-start">
          {isLoggedIn && excavatorName && (
            <div className="bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-white/10 pointer-events-auto">
              <div className="flex items-center gap-4">
                <StatusIndicator state={connectionState} />
                {connectionState === "connected" && (
                  <>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-green-400" />
                      <span className="text-xs uppercase tracking-wider text-gray-300">延迟</span>
                      <span className={`font-mono text-lg font-bold ${getQualityColor(getConnectionQuality())}`}>
                        {ping}ms
                      </span>
                    </div>
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

        {connectionState === "connected" && engineTemp > 95 && (
          <div className="flex justify-center pointer-events-none">
            <div className="bg-red-900/80 backdrop-blur-sm border-2 border-red-500 p-4 rounded-lg animate-pulse">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-200" />
                <span className="text-lg font-bold text-red-100">引擎温度过高</span>
              </div>
            </div>
          </div>
        )}

        {connectionState === "connected" && (
          <div className="flex justify-center">
            <div className="bg-black/60 backdrop-blur-sm p-4 rounded-lg border border-white/10">
              <div className="flex gap-8">
                {/* Hydraulic Pressure */}
                <div className="flex flex-col items-center">
                  <span className="text-xs uppercase tracking-wider text-gray-400 mb-2">液压压力</span>
                  <HydraulicGauge value={hydraulicPressure} max={100} />
                </div>

                <div className="w-px bg-white/20" />

                {/* Arm Angle */}
                <div className="flex flex-col items-center min-w-[100px]">
                  <span className="text-xs uppercase tracking-wider text-gray-400 mb-2">臂角度</span>
                  <div className="font-mono text-3xl font-bold text-blue-400">{armAngle}°</div>
                </div>

                <div className="w-px bg-white/20" />

                {/* Bucket Angle */}
                <div className="flex flex-col items-center min-w-[100px]">
                  <span className="text-xs uppercase tracking-wider text-gray-400 mb-2">铲斗角度</span>
                  <div className="font-mono text-3xl font-bold text-cyan-400">{bucketAngle}°</div>
                </div>

                <div className="w-px bg-white/20" />

                {/* Engine Temperature */}
                <div className="flex flex-col items-center min-w-[100px]">
                  <span className="text-xs uppercase tracking-wider text-gray-400 mb-2">引擎温度</span>
                  <div
                    className={`font-mono text-3xl font-bold ${
                      engineTemp > 95 ? "text-red-400" : engineTemp > 90 ? "text-yellow-400" : "text-green-400"
                    }`}
                  >
                    {engineTemp}°C
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoggedIn && excavatorName && connectionState === "disconnected" && (
        <div className="absolute inset-0 z-50 bg-red-900/90 backdrop-blur-sm flex flex-col items-center justify-center">
          <WifiOff className="h-24 w-24 text-red-200 mb-6 animate-pulse" />
          <h1 className="text-6xl font-bold text-red-100 animate-pulse mb-4">连接中断</h1>
          <p className="text-xl text-red-200">CONNECTION LOST</p>
        </div>
      )}

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        isLoggedIn={isLoggedIn}
        username={username}
        onLogin={handleLogin}
        onLogout={handleLogout}
        excavatorName={excavatorName}
        onExcavatorNameChange={handleExcavatorNameChange}
        signalingServer={signalingServer}
        onSignalingServerChange={handleSignalingServerChange}
        showConnectionLog={isLoggedIn}
        connectionLogs={<ConnectionLog logs={logs} />}
      />
    </div>
  )
}
