"use client";

import React, { useState } from "react";
import { 
  Power, 
  Lightbulb, 
  Megaphone, 
  Zap, 
  OctagonAlert, 
  Gauge 
} from "lucide-react";

// ---------------------------------------------------------------------
// 哼，这就是那个模拟 VisionOS 玻璃质感的按钮组件
// 别乱改 border-white/20 这种参数，光感全靠它了
// ---------------------------------------------------------------------
interface GlassButtonProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean; // 记录状态，比如灯开了没
  color?: string;     // 这种为了区分不同功能的强调色
  isEmergency?: boolean;
  onClick: () => void;
}

const GlassButton: React.FC<GlassButtonProps> = ({ 
  icon: Icon, 
  label, 
  isActive = false, 
  color = "text-white", 
  isEmergency = false, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-center 
        w-24 h-24 rounded-3xl backdrop-blur-xl transition-all duration-300 ease-out
        border border-white/20 shadow-lg
        
        /* 悬浮态：稍微放大，背景变亮 */
        hover:scale-105 hover:bg-white/20 hover:border-white/40
        
        /* 点击态：缩小 */
        active:scale-95
        
        /* 如果是紧急按钮，给它更强的红色背景，否则就是普通的玻璃白 */
        ${isEmergency 
          ? "bg-red-500/30 hover:bg-red-500/50 shadow-red-900/20" 
          : isActive 
            ? "bg-white/30 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
            : "bg-white/10"
        }
      `}
    >
      {/* 图标层 */}
      <div className={`
        p-3 rounded-full transition-all duration-300
        ${isEmergency ? "text-white drop-shadow-md" : color}
        ${isActive && !isEmergency ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : ""}
      `}>
        <Icon size={32} strokeWidth={1.5} />
      </div>

      {/* 文字标签 */}
      <span className="mt-1 text-xs font-medium text-white/80 tracking-wide group-hover:text-white">
        {label}
      </span>

      {/* 模拟 VisionOS 的高光反射效果 (Gloss) */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
};

// ---------------------------------------------------------------------
// 主页面
// ---------------------------------------------------------------------
export default function RemoteExcavatorPage() {
  // 模拟一些状态，免得你按了没反应以为坏了
  const [isEngineOn, setIsEngineOn] = useState(false);
  const [isLightOn, setIsLightOn] = useState(false);
  const [speedMode, setSpeedMode] = useState<"TURTLE" | "RABBIT">("TURTLE");

  const handleHorn = () => {
    console.log("📢 滴滴！！");
    // 这里以后接你的 WebRTC DataChannel 发送逻辑
  };

  const handleEmergency = () => {
    console.warn("🛑 紧急停机触发！！！");
    setIsEngineOn(false);
    alert("已发送紧急停机指令！");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* 1. 背景层：模拟挖掘机传回来的实时画面 */}
      {/* 实际上这里你应该放 <video> 标签接 WebRTC 流 */}
      <div className="absolute inset-0 z-0">
        {/* 随便搞个渐变模拟一下泥土和天空，哼 */}
        <div className="w-full h-full bg-gradient-to-b from-slate-800 via-stone-700 to-stone-900 opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-4xl font-bold select-none pointer-events-none">
          [ REMOTE CAMERA FEED: NO SIGNAL ]
        </div>
        
        {/* 网格线模拟 HUD */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
      </div>

      {/* 2. 顶部状态栏 (HUD) */}
      <div className="absolute top-8 left-0 right-0 flex justify-center z-10">
        <div className="px-6 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-6 shadow-xl">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isEngineOn ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500"}`} />
            <span className="text-sm text-white/90 font-mono">SYS: {isEngineOn ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <Gauge size={16} className="text-blue-400" />
            <span className="text-sm text-white/90 font-mono">LATENCY: 45ms</span>
          </div>
        </div>
      </div>

      {/* 3. 底部控制面板 (核心区域) */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
        {/* 玻璃容器 */}
        <div className="flex items-center gap-4 p-4 rounded-[3rem] bg-white/5 backdrop-blur-2xl border border-white/15 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          
          {/* --- 引擎与动力组 --- */}
          <div className="flex gap-3">
            <GlassButton 
              icon={Power} 
              label={isEngineOn ? "运行中" : "启动"} 
              isActive={isEngineOn}
              color={isEngineOn ? "text-green-400" : "text-white"}
              onClick={() => setIsEngineOn(!isEngineOn)} 
            />
          </div>

          <div className="w-px h-16 bg-white/10 mx-2" />

          {/* --- 作业辅助组 --- */}
          <div className="flex gap-3">
            <GlassButton 
              icon={Lightbulb} 
              label="工作灯" 
              isActive={isLightOn}
              color="text-yellow-400"
              onClick={() => setIsLightOn(!isLightOn)} 
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
              onClick={() => setSpeedMode(prev => prev === "RABBIT" ? "TURTLE" : "RABBIT")} 
            />
          </div>

          <div className="w-px h-16 bg-white/10 mx-2" />

          {/* --- 紧急停机组 (E-STOP) --- */}
          <div className="flex gap-3 pl-2">
            <GlassButton 
              icon={OctagonAlert} 
              label="紧急停机" 
              isEmergency={true}
              onClick={handleEmergency} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}