"use client";

import { useEffect } from 'react';
import { useExcavatorGamepad } from "@/hooks/useExcavatorGamepad";

// 定义发送到 ROS 的消息格式
interface RosControlMessage {
  rotation: number;
  brake: number;
  throttle: number;
  gear: string;
  boom: number;
  bucket: number;
  left_track: number;
  right_track: number;
  swing: number;
  stick: number;
  device_type: string;
  timestamp: number;
}

interface GamepadControlProps {
  dataChannel: RTCDataChannel | null;
}

export const GamepadControl = ({ dataChannel }: GamepadControlProps) => {
  const controls = useExcavatorGamepad();

  useEffect(() => {
    // 确保 dataChannel 存在且处于 'open' 状态
    if (dataChannel && dataChannel.readyState === 'open') {
      const { leftTrack, rightTrack, swing, boom, stick, bucket } = controls;

      // 构建消息
      const message: RosControlMessage = {
        left_track: leftTrack,
        right_track: rightTrack,
        swing: swing,
        boom: boom,
        stick: stick,
        bucket: bucket,
        rotation: 0,
        brake: 0,
        throttle: 0,
        gear: "N",
        device_type: "excavator",
        timestamp: Date.now(),
      };

      // 发送 JSON 字符串
    //   console.log("发送控制指令:", JSON.stringify(message));
      dataChannel.send(JSON.stringify(message));
    }
  }, [controls, dataChannel]); // 当 controls 或 dataChannel 变化时触发

  return null; // 此组件不渲染任何 UI
};
