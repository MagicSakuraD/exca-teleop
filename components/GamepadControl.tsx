"use client";

import { useEffect } from 'react';
import { useExcavatorGamepad } from "@/hooks/useExcavatorGamepad";

// 定义发送到 ROS 的消息格式
interface RosControlMessage {
  // --- 基础识别 ---
  device_type: 'excavator' | 'wheel_loader';
  timestamp: number;

  // --- 运动控制 ---
  left_track: number;
  right_track: number;
  swing: number;
  boom: number;
  stick: number;
  bucket: number;
  rotation: number; // 兼容旧定义

  // --- 装载机/通用扩展 ---
  steering: number;      // 转向
  throttle: number;      // 油门
  brake: number;         // 刹车
  gear: string;          // 档位 'N', 'D', 'R'
  
  // --- 辅助信号 ---
  emergency_stop: boolean;
  parking_brake: boolean;
  horn: boolean;
  speed_mode: 'turtle' | 'rabbit';
  light_code: number;
  hydraulic_lock: boolean;
  power_enable: boolean;
}

interface GamepadControlProps {
  dataChannel: RTCDataChannel | null;
}

export const GamepadControl = ({ dataChannel }: GamepadControlProps) => {
  const controls = useExcavatorGamepad();

  useEffect(() => {
    // 确保 dataChannel 存在且处于 'open' 状态
    if (dataChannel && dataChannel.readyState === 'open') {
      const { 
        leftTrack, rightTrack, swing, boom, stick, bucket,
        steering, throttle, brake, gear, emergency_stop, parking_brake,
        horn, speed_mode, light_code, hydraulic_lock, power_enable
      } = controls;

      // 构建消息
      const message: RosControlMessage = {
        // 基础字段
        device_type: "excavator", // 默认为挖掘机，后续可由 Props 传入
        timestamp: Date.now(),
        
        // 挖掘机特有
        left_track: leftTrack,
        right_track: rightTrack,
        swing: swing,
        boom: boom,
        stick: stick,
        bucket: bucket,
        rotation: 0, // 旧字段，保留兼容
        
        // 扩展字段 (透传)
        steering,
        throttle,
        brake,
        gear,
        emergency_stop,
        parking_brake,
        horn,
        speed_mode,
        light_code,
        hydraulic_lock,
        power_enable,
      };

      // 发送 JSON 字符串
      // 注意：由于 useExcavatorGamepad 已经在源头做了 30Hz 节流，
      // 这里不需要再次节流，直接发送即可
      dataChannel.send(JSON.stringify(message));
    }
  }, [controls, dataChannel]); // 当 controls 或 dataChannel 变化时触发

  return null; // 此组件不渲染任何 UI
};
