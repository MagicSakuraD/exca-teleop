"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { LogInIcon, Settings, Wifi, WifiOff, HelpCircle, OctagonAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsPanel } from "@/components/settings-panel"
import { StatusIndicator } from "@/components/status-indicator"
import { ConnectionLog } from "@/components/connection-log"
import { LoginScreen } from "@/components/login-screen"
import { ConnectDialog } from "@/components/connect-dialog"
import { ControlsHelpDialog } from "@/components/ControlsHelpDialog"
import { useWebRTC, type ConnectionState } from "@/hooks/useWebRTC"
import { GamepadControl } from "@/components/GamepadControl"
import { GlassButton } from "@/components/GlassButton"
import { useExcavatorGamepad, type ExcavatorControls } from "@/hooks/useExcavatorGamepad" 

// 新组件导入
import { SafetyIndicators } from "@/components/telemetry/SafetyIndicators"
import { Dashboard } from "@/components/telemetry/Dashboard"
import { CommunicationBar } from "@/components/controls/CommunicationBar"

type ConnectionQuality = "excellent" | "good" | "poor" | "critical"

export default function RemoteExcavatorControl() {
  const [hydraulicPressure, setHydraulicPressure] = useState<number>(0)
  const [armAngle, setArmAngle] = useState<number>(0)
  const [bucketAngle, setBucketAngle] = useState<number>(0)
  const [engineTemp, setEngineTemp] = useState<number>(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false) // ❓ 帮助弹窗状态
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState("")
  const [excavatorName, setExcavatorName] = useState("")
  const [signalingServer, setSignalingServer] = useState("ws://192.168.124.3:8090/ws")
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasBeenConnected, setHasBeenConnected] = useState(false)

  // 3. UI 覆盖状态 (用于合并到手柄控制中)
  const [uiOverrides, setUiOverrides] = useState<Partial<ExcavatorControls>>({
    horn: false,
    emergency_stop: false,
    light_code: 0,
    speed_mode: "turtle",
  });

  const [micEnabled, setMicEnabled] = useState(true); // 🎤 是否启用麦克风功能
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(true); // 🔊 远程音频默认关闭（确保视频自动播放）

  // 🎮 获取手柄实时状态，用于 UI 反馈
  const gamepadState = useExcavatorGamepad();

  // WebRTC 连接
  const { 
    connectionState, 
    logs, 
    ping, 
    stats, 
    dataChannel,
    telemetry, // 📡 获取遥测数据
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

  const handleHorn = (active: boolean) => {
    setUiOverrides(prev => ({ ...prev, horn: active }));
  };

  const handleEmergency = () => {
    setUiOverrides(prev => {
      const newState = !prev.emergency_stop;
      console.warn(newState ? "🛑 紧急停机触发！！！" : "🟢 紧急停机解除");
      return { ...prev, emergency_stop: newState };
    });
  };

  const toggleLight = () => {
    setUiOverrides(prev => ({ 
      ...prev, 
      light_code: prev.light_code === 0 ? 0x10 : 0 
    }));
  };

  const toggleSpeed = () => {
    setUiOverrides(prev => ({ 
      ...prev, 
      speed_mode: prev.speed_mode === "turtle" ? "rabbit" : "turtle" 
    }));
  };

  // 🔊 切换远程音频（扬声器）静音状态
  const toggleSpeaker = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsSpeakerMuted(videoRef.current.muted);
      console.log(videoRef.current.muted ? "🔇 扬声器已静音" : "🔊 扬声器已开启");
    }
  }, []);

  // 🛡️ 安全状态解析
  const isEmergencyStopped = telemetry?.safety.emergency_stop ?? uiOverrides.emergency_stop;
  
  // ⌨️ 全局键盘监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space': // 急停
          e.preventDefault(); 
          if (!e.repeat) handleEmergency();
          break;
        case 'KeyH': // 鸣笛
          if (!e.repeat) handleHorn(true);
          break;
        case 'KeyL': // 灯光
          if (!e.repeat) toggleLight();
          break;
        case 'KeyR': // 速度切换
          if (!e.repeat) toggleSpeed();
          break;
        case 'KeyM': // 麦克风
          if (!e.repeat && microphoneReady) toggleMute();
          break;
        case 'KeyK': // 扬声器
          if (!e.repeat) toggleSpeaker();
          break;
        case 'F1': // 帮助
          e.preventDefault();
          if (!e.repeat) setHelpOpen(true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyH': // 鸣笛
          handleHorn(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [microphoneReady, toggleMute, toggleSpeaker]); 

  // Simulate real-time sensor data when connected (Legacy fallback)
  useEffect(() => {
    if (connectionState === "connected") {
      setHasBeenConnected(true)
    }

    if (connectionState !== "connected") {
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
          className="h-full w-full object-contain"
          autoPlay
          playsInline
          muted={isSpeakerMuted}
        />
        {/* Subtle overlay for better text readability */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Gamepad Control Logic */}
      <GamepadControl dataChannel={dataChannel} overrides={uiOverrides} />

      {/* Connect Dialog */}
      <ConnectDialog 
        open={isLoggedIn && !excavatorName} 
        onConnect={handleConnect} 
      />

      {/* HUD Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
        
        {/* --- 1. 致命警告 (急停) --- */}
        {isEmergencyStopped && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-red-950/60 backdrop-blur-lg animate-pulse">
            <div className="bg-red-600 text-white px-12 py-8 rounded-3xl border-4 border-white/20 shadow-[0_0_50px_rgba(220,38,38,0.8)] flex flex-col items-center">
              <OctagonAlert size={64} className="mb-4" />
              <span className="text-5xl font-black tracking-tighter">急停已触发</span>
              <span className="text-xl mt-2 font-mono opacity-80">EMERGENCY STOP ACTIVE</span>
            </div>
          </div>
        )}

        {/* --- 2. 顶部状态栏 (极简版, 稍微变大一点) --- */}
        <div className="flex justify-between items-start pointer-events-none">
          {/* 左上: 仅保留延迟和FPS，稍微变大一点 */}
          {connectionState === "connected" && stats && (
            <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/5 flex items-center gap-4 text-xs font-mono text-white/70 pointer-events-auto">
              <span className={getQualityColor(getConnectionQuality()) + " text-base"}>{ping}ms</span>
              <span className="text-white/30 text-base">|</span>
              <span className="text-base">{stats.frameRate.toFixed(0)} FPS</span>
            </div>
          )}

          {/* 右上: 设置与帮助 (图标稍微变大) */}
          <div className="flex items-start gap-3 pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/20 hover:bg-black/40 text-white/50 hover:text-white"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/20 hover:bg-black/40 text-white/50 hover:text-white"
              onClick={() => setSettingsOpen(true)}
            >
              {isLoggedIn ? <Settings className="h-5 w-5" /> : <LogInIcon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* --- 3. 侧边 HUD (垂直居中布局) --- */}
        {isLoggedIn && (
          <>
            {/* 左侧中间: 通讯控制 + 安全指示器 (垂直排列) */}
            <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4">
              <CommunicationBar 
                isMuted={isMuted}
                microphoneReady={microphoneReady}
                toggleMute={toggleMute}
                isSpeakerMuted={isSpeakerMuted}
                toggleSpeaker={toggleSpeaker}
              />
              <SafetyIndicators telemetry={telemetry} />
            </div>

            {/* 底部中间: 急停 (触发时才显示) */}
            {isEmergencyStopped && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
                 <div className="bg-red-600 text-white px-8 py-2 rounded-full font-black text-xl shadow-[0_0_30px_rgba(220,38,38,1)] border-2 border-white flex items-center gap-2">
                    <OctagonAlert size={24} />
                    EMERGENCY STOP
                 </div>
              </div>
            )}

            {/* 右侧中间: 极简仪表盘 (垂直排列) */}
            {connectionState === "connected" && (
              <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
                <Dashboard telemetry={telemetry} />
              </div>
            )}
          </>
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

      {/* 帮助/操作说明弹窗 */}
      <ControlsHelpDialog 
        open={helpOpen} 
        onOpenChange={setHelpOpen} 
      />
    </div>
  )
}
