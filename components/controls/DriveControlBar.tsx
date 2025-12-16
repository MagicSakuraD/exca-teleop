import React from 'react';
import { Lightbulb, Megaphone, Zap } from 'lucide-react';
import { GlassButton } from '@/components/GlassButton';
import { TelemetryData } from '@/hooks/useWebRTC';
import { ExcavatorControls } from '@/hooks/useExcavatorGamepad';

interface DriveControlBarProps {
  telemetry: TelemetryData | null;
  uiOverrides: Partial<ExcavatorControls>;
  gamepadState: ExcavatorControls;
  toggleLight: () => void;
  toggleSpeed: () => void;
  handleHorn: (active: boolean) => void;
}

export const DriveControlBar: React.FC<DriveControlBarProps> = ({
  telemetry,
  uiOverrides,
  gamepadState,
  toggleLight,
  toggleSpeed,
  handleHorn
}) => {
  // 状态解析
  const currentLightCode = telemetry?.aux.light_code ?? uiOverrides.light_code;
  const currentSpeedMode = telemetry?.motion.speed_mode ?? uiOverrides.speed_mode;
  
  // 🔊 真实的喇叭状态 (后端反馈 || UI操作 || 手柄操作)
  // 注意：后端将 horn_status 移到了 aux 块中
  const isHornActive = telemetry?.aux.horn_status || !!uiOverrides.horn || !!gamepadState.horn;

  return (
    <div className="flex items-end gap-4 pointer-events-auto">
      {/* 辅助开关组 */}
      <div className="flex gap-2 mb-1">
        <GlassButton 
          icon={Lightbulb} 
          label="" // 极简，不显示文字
          isActive={(currentLightCode || 0) !== 0} 
          color="text-yellow-400"
          shortcut="L"
          onClick={toggleLight}
          className="w-12 h-12 rounded-full bg-black/40 border-white/10"
        />
        <GlassButton 
          icon={Zap} 
          label="" 
          isActive={currentSpeedMode === "rabbit"}
          color="text-cyan-400"
          shortcut="R"
          onClick={toggleSpeed} 
          className="w-12 h-12 rounded-full bg-black/40 border-white/10"
        />
      </div>

      {/* 鸣笛 (拇指位 - 大按钮) */}
      <GlassButton 
        icon={Megaphone} 
        label=""
        isActive={isHornActive}
        color="text-orange-400"
        shortcut="H"
        onClick={() => {
          handleHorn(true);
          setTimeout(() => handleHorn(false), 200);
        }} 
        className={`w-16 h-16 rounded-full border-2 ${isHornActive ? "bg-orange-500/20 border-orange-500 scale-95" : "bg-black/40 border-white/10 hover:bg-black/60"}`}
      />
    </div>
  );
};

