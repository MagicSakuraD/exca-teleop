import React from 'react';
import { Lock, ParkingSquare } from 'lucide-react';
import { TelemetryData } from '@/hooks/useWebRTC';

interface SafetyIndicatorsProps {
  telemetry: TelemetryData | null;
}

export const SafetyIndicators: React.FC<SafetyIndicatorsProps> = ({ telemetry }) => {
  const isHydraulicLocked = telemetry?.safety.hydraulic_lock ?? true;
  const isParkingBrakeActive = telemetry?.safety.parking_brake ?? true;

  if (!isHydraulicLocked && !isParkingBrakeActive) return null;

  return (
    <div className="flex flex-col gap-2 pointer-events-none">
      {isHydraulicLocked && (
        <div className="bg-transparent text-yellow-500 w-10 h-10 rounded-xl shadow-lg flex items-center justify-center backdrop-blur-sm" title="液压锁已锁定">
          <Lock size={20} strokeWidth={3} />
        </div>
      )}
      {isParkingBrakeActive && (
        <div className="bg-transparent text-red-600 w-10 h-10 rounded-xl shadow-lg flex items-center justify-center backdrop-blur-sm" title="手刹已拉起">
          <ParkingSquare size={20} strokeWidth={3} />
        </div>
      )}
    </div>
  );
};

