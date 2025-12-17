"use client";

import { useEffect } from 'react';
import { ExcavatorControls, useExcavatorGamepad } from "@/hooks/useExcavatorGamepad";

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
  overrides?: Partial<ExcavatorControls>; // 允许外部覆盖部分状态
}

export const GamepadControl = ({ dataChannel, overrides }: GamepadControlProps) => {
  const controls = useExcavatorGamepad();

  useEffect(() => {
    // 确保 dataChannel 存在且处于 'open' 状态
    if (dataChannel && dataChannel.readyState === 'open') {
      // 智能合并策略：
      // 对于布尔值（horn, emergency_stop等），采用 "OR" 逻辑 (手柄按了 OR UI按了 => 触发)
      // 对于数值/枚举（gear, speed_mode等），如果 UI 有明确覆盖值则优先 UI，否则用手柄
      // 注意：uiOverrides 通常包含的是默认值(false/0)，简单的覆盖会导致手柄输入无效。
      
      const mergedControls: RosControlMessage = {
        // 基础字段
        device_type: "excavator", 
        timestamp: Date.now(),
        
        // --- 运动控制 (优先手柄，UI通常不控制这些) ---
        left_track: controls.leftTrack,
        right_track: controls.rightTrack,
        swing: controls.swing,
        boom: controls.boom,
        stick: controls.stick,
        bucket: controls.bucket,
        rotation: 0, 
        
        // --- 扩展运动 (同上) ---
        steering: controls.steering,
        throttle: controls.throttle,
        brake: controls.brake,

        // --- 混合逻辑字段 ---
        
        // 档位：手柄变了用手柄，UI变了用UI？比较复杂。
        // 简化策略：如果手柄是 N (默认)，则允许 UI 覆盖。如果手柄挂了 D/R，则优先手柄。
        // 或者：UI overrides 只在非默认值时生效。
        // 但目前 uiOverrides 里的 gear 没被用到，我们先假设 gear 主要靠手柄，或者 UI 设置
        gear: overrides?.gear || controls.gear, 

        // 急停：任一触发即触发 (OR)
        emergency_stop: controls.emergency_stop || !!overrides?.emergency_stop,
        
        // 手刹：任一触发即触发 (OR)
        parking_brake: controls.parking_brake || !!overrides?.parking_brake,
        
        // 喇叭：任一触发即触发 (OR)
        horn: controls.horn || !!overrides?.horn,
        
        // 速度模式：UI 覆盖优先 (因为通常手柄按键是瞬时的，而 UI 是状态保持的)
        // 但如果手柄也有切换逻辑，这里需要看谁是“最新”的。
        // 鉴于 page.tsx 里 toggleSpeed 是切换 uiOverrides，这里我们优先取 overrides 的值，
        // 除非 overrides 是 undefined。但 page.tsx 初始化了默认值。
        // 修正：应该让手柄也能改这个状态吗？
        // 目前架构下，手柄改的是 hook 内部状态，UI 改的是 page 状态。
        // 为了避免冲突，我们约定：速度模式以 UI (页面状态) 为主。
        // 如果想让手柄也能切，手柄逻辑应该去调用 setUiOverrides (但这太远了)。
        // 妥协方案：如果手柄检测到 Rabbit，就发 Rabbit。
        speed_mode: (overrides?.speed_mode === 'rabbit' || controls.speed_mode === 'rabbit') ? 'rabbit' : 'turtle',

        // 灯光：位运算 OR
        light_code: controls.light_code | (overrides?.light_code || 0),
        
        hydraulic_lock: controls.hydraulic_lock, // UI 暂无控制
        power_enable: controls.power_enable,     // UI 暂无控制
      };

      // 发送 JSON 字符串
      dataChannel.send(JSON.stringify(mergedControls));
    }
  }, [controls, dataChannel, overrides]); // 当 controls, dataChannel 或 overrides 变化时触发

  return null; 
};
