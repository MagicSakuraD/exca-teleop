import React from "react";
import { LucideIcon } from "lucide-react";

interface GlassButtonProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  color?: string;
  isEmergency?: boolean;
  disabled?: boolean; // 🎤 添加禁用状态
  onClick: () => void;
}

export const GlassButton: React.FC<GlassButtonProps> = ({ 
  icon: Icon, 
  label, 
  isActive = false, 
  color = "text-white", 
  isEmergency = false, 
  disabled = false, // 🎤 默认不禁用
  onClick 
}) => {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        group relative flex flex-col items-center justify-center 
        w-20 h-20 md:w-24 md:h-24 rounded-3xl backdrop-blur-xl transition-all duration-300 ease-out
        border border-white/20 shadow-lg pointer-events-auto
        
        /* 悬浮态 */
        hover:scale-105 hover:bg-white/20 hover:border-white/40
        
        /* 点击态 */
        active:scale-95
        
        /* 禁用态 */
        ${disabled ? "opacity-50 cursor-not-allowed hover:scale-100 hover:bg-white/10" : ""}
        
        ${isEmergency 
          ? "bg-red-500/30 hover:bg-red-500/50 shadow-red-900/20" 
          : isActive 
            ? "bg-white/30 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
            : "bg-white/10"
        }
      `}
    >
      <div className={`
        p-3 rounded-full transition-all duration-300
        ${isEmergency ? "text-white drop-shadow-md" : color}
        ${isActive && !isEmergency ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : ""}
      `}>
        <Icon size={28} strokeWidth={1.5} className="md:w-8 md:h-8" />
      </div>
      <span className="mt-1 text-[10px] md:text-xs font-medium text-white/80 tracking-wide group-hover:text-white">
        {label}
      </span>
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
};

