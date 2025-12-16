import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { GlassButton } from '@/components/GlassButton';

interface CommunicationBarProps {
  isMuted: boolean;
  microphoneReady: boolean;
  toggleMute: () => void;
  isSpeakerMuted: boolean;
  toggleSpeaker: () => void;
}

export const CommunicationBar: React.FC<CommunicationBarProps> = ({
  isMuted,
  microphoneReady,
  toggleMute,
  isSpeakerMuted,
  toggleSpeaker
}) => {
  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      <GlassButton 
        icon={isMuted ? MicOff : Mic} 
        label=""
        isActive={!isMuted && microphoneReady}
        color={!microphoneReady ? "text-gray-500" : (isMuted ? "text-white/40" : "text-green-400")}
        shortcut="M"
        onClick={toggleMute}
        disabled={!microphoneReady}
        className="w-8 h-8 rounded-xl bg-black/20 border-white/5 hover:bg-black/40 backdrop-blur-sm"
      />
      <GlassButton 
        icon={isSpeakerMuted ? VolumeX : Volume2} 
        label=""
        isActive={!isSpeakerMuted}
        color={isSpeakerMuted ? "text-red-400" : "text-green-400"}
        shortcut="K"
        onClick={toggleSpeaker}
        className="w-8 h-8 rounded-xl bg-black/20 border-white/5 hover:bg-black/40 backdrop-blur-sm"
      />
    </div>
  );
};

