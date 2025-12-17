import React from 'react';
import { TelemetryData } from '@/hooks/useWebRTC';
import { Zap, AlertTriangle, Battery, ArrowLeftRight, MoveVertical, RotateCw, Rabbit, Turtle } from 'lucide-react';

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
  const currentSteer = telemetry?.drive.steer ?? 0;
  const currentBoom = telemetry?.pose.boom ?? 0;
  const currentBucket = telemetry?.pose.bucket ?? 0;
  const currentBatt = telemetry?.batt ?? 0;
  const currentFault = telemetry?.fault ?? 0;

  return (
    <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 border border-white/5 flex flex-col items-center gap-3 pointer-events-auto">
      {/* 故障指示 (仅在故障时显示) */}
      {currentFault > 0 && (
        <div className="flex items-center gap-1 text-red-500 animate-pulse mb-1">
          <AlertTriangle size={16} />
          <span className="text-xs font-bold">E-{currentFault}</span>
        </div>
      )}

      {/* 档位 + 模式 */}
      <div className="flex flex-col items-center gap-1">
         <div className="flex items-center gap-1">
           <span className="text-4xl font-black font-mono text-white tracking-tighter shadow-black drop-shadow-md">
             {currentGear}
           </span>
           {/* 速度模式显示 */}
           <div className="flex flex-col items-center ml-1">
              {currentSpeedMode === 'R' ? (
                 <Rabbit size={20} className="text-cyan-400 fill-current" />
              ) : (
                 <Turtle size={20} className="text-green-500 fill-current" />
              )}
           </div>
         </div>
         <span className="text-sm text-gray-400 font-bold uppercase">挡位</span>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* 车速 */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-mono font-bold text-white tracking-tighter drop-shadow-md">
            {currentSpeed.toFixed(1)}
          </span>
          <span className="text-md text-gray-400 font-bold uppercase">km/h</span>
        </div>
        <span className="text-sm text-gray-400 font-bold uppercase">速度</span>
      </div>

      <div className="w-full h-px bg-white/10" />

      {/* 辅助数据网格 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full px-1">
        
        {/* 转向角度 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-white/80">
            <ArrowLeftRight size={12} className="text-blue-400" />
            <span className="text-md font-mono font-bold">{currentSteer.toFixed(1)}°</span>
          </div>
          <span className="text-sm text-gray-500 uppercase">转向</span>
        </div>

        {/* 电池电量 */}
        <div className="flex flex-col items-center">
           <div className={`flex items-center gap-1 ${currentBatt < 20 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
            <Battery size={12} />
            <span className="text-md font-mono font-bold">{currentBatt}%</span>
          </div>
          <span className="text-sm text-gray-500 uppercase">电量</span>
        </div>

        {/* 大臂角度 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-white/80">
            <MoveVertical size={12} className="text-orange-400" />
            <span className="text-md font-mono font-bold">{currentBoom.toFixed(1)}°</span>
          </div>
          <span className="text-sm text-gray-500 uppercase">大臂</span>
        </div>

        {/* 铲斗角度 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-white/80">
             <RotateCw size={12} className="text-yellow-400" />
            <span className="text-md font-mono font-bold">{currentBucket.toFixed(1)}°</span>
          </div>
          <span className="text-sm text-gray-500 uppercase">铲斗</span>
        </div>

      </div>
    </div>
  );
};

