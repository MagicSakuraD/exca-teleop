import React from 'react';
import { TelemetryData } from '@/hooks/useWebRTC';
import { Zap } from 'lucide-react';

interface DashboardProps {
  telemetry: TelemetryData | null;
}

// 档位数值转显示字符 (1=D, 2=N, 3=R)
const gearToString = (gear: number): string => {
  switch (gear) {
    case 1: return 'D';
    case 2: return 'N';
    case 3: return 'R';
    default: return 'N';
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ telemetry }) => {
  const currentGear = gearToString(telemetry?.drive.gear ?? 2);
  const currentSpeed = telemetry?.drive.speed ?? 0;
  const currentSpeedMode = telemetry?.drive.spd_mode ?? 'T';

  return (
    <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 border border-white/5 flex flex-col items-center gap-2 pointer-events-auto">
      {/* 档位 + 模式 */}
      <div className="flex flex-col items-center gap-1">
         <div className="flex items-center gap-1">
           <span className="text-4xl font-black font-mono text-white tracking-tighter shadow-black drop-shadow-md">
             {currentGear}
           </span>
           {currentSpeedMode === 'R' && (
             <Zap size={14} className="text-cyan-400 fill-current" />
           )}
         </div>
         <span className="text-[10px] text-gray-400 font-bold uppercase">GEAR</span>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* 车速 */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-mono font-bold text-white tracking-tighter drop-shadow-md">
            {currentSpeed.toFixed(1)}
          </span>
          <span className="text-[10px] text-gray-400 font-bold uppercase">km/h</span>
        </div>
        <span className="text-[10px] text-gray-400 font-bold uppercase">SPEED</span>
      </div>
    </div>
  );
};

