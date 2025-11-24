"use client";

import { useState, useEffect, useRef } from "react";

// 定义挖掘机控制状态的接口
export interface ExcavatorControls {
  leftTrack: number; // 左履带: -1 (后) to 1 (前)
  rightTrack: number; // 右履带: -1 (后) to 1 (前)
  swing: number; // 驾驶室旋转: -1 (左) to 1 (右)
  boom: number; // 大臂: -1 (降) to 1 (提)
  stick: number; // 小臂: -1 (收) to 1 (伸)
  bucket: number; // 铲斗: -1 (收) to 1 (翻)
}

// 定义手柄映射配置
const MAPPING = {
  // 左手柄
  LEFT_GAMEPAD_INDEX: 0,
  SWING_AXIS: 0, // 驾驶室旋转 (X轴)
  STICK_AXIS: 1, // 小臂伸缩 (Y轴)
  LEFT_TRACK_AXIS: 6, // 左履带 (轴6)

  // 右手柄
  RIGHT_GAMEPAD_INDEX: 1,
  BUCKET_AXIS: 0, // 铲斗开合 (X轴)
  BOOM_AXIS: 1, // 大臂提降 (Y轴)
  RIGHT_TRACK_AXIS: 6, // 右履带 (轴6)
};

// 死区，避免摇杆轻微晃动产生误操作
const DEADZONE = 0.1;

/**
 * 标准化普通摇杆轴的函数
 * @param value - 原始轴值 (-1 to 1)
 * @returns - 处理死区后的值
 */
const normalizeAxisValue = (value: number): number => {
  return Math.abs(value) > DEADZONE ? value : 0;
};

export const useExcavatorGamepad = () => {
  const [controls, setControls] = useState<ExcavatorControls>({
    leftTrack: 0,
    rightTrack: 0,
    swing: 0,
    boom: 0,
    stick: 0,
    bucket: 0,
  });

  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    console.log("开始监听手柄");
    const updateControls = () => {
      const gamepads = navigator.getGamepads();
      const leftGamepad = gamepads[MAPPING.LEFT_GAMEPAD_INDEX];
      const rightGamepad = gamepads[MAPPING.RIGHT_GAMEPAD_INDEX];
      // console.log("左手柄", leftGamepad?.axes);
      // console.log("右手柄", rightGamepad?.axes);

      const newControls = {
        swing: leftGamepad
          ? normalizeAxisValue(leftGamepad.axes[MAPPING.SWING_AXIS])
          : 0,
        stick: leftGamepad
          ? normalizeAxisValue(leftGamepad.axes[MAPPING.STICK_AXIS])
          : 0,
        leftTrack: leftGamepad
          ? normalizeAxisValue(leftGamepad.axes[MAPPING.LEFT_TRACK_AXIS])
          : 0,
        bucket: rightGamepad
          ? normalizeAxisValue(rightGamepad.axes[MAPPING.BUCKET_AXIS])
          : 0,
        boom: rightGamepad
          ? normalizeAxisValue(rightGamepad.axes[MAPPING.BOOM_AXIS])
          : 0,
        rightTrack: rightGamepad
          ? normalizeAxisValue(rightGamepad.axes[MAPPING.RIGHT_TRACK_AXIS])
          : 0,
      };
      // console.log("发送指令", newControls);

      setControls(newControls);

      animationFrameRef.current = requestAnimationFrame(updateControls);
    };
    updateControls();
    return () => {
      console.log("停止监听手柄");
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return controls;
};
