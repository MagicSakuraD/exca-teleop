"use client";

import { useState, useEffect, useRef } from "react";

// 定义挖掘机控制状态的接口 (兼容装载机)
export interface ExcavatorControls {
  // --- 通用挖掘臂控制 ---
  leftTrack: number; // 左履带: -1 (后) to 1 (前)
  rightTrack: number; // 右履带: -1 (后) to 1 (前)
  swing: number; // 驾驶室旋转: -1 (左) to 1 (右)
  boom: number; // 大臂: -1 (降) to 1 (提)
  stick: number; // 小臂: -1 (收) to 1 (伸)
  bucket: number; // 铲斗: -1 (收) to 1 (翻)

  // --- 装载机/线控底盘扩展信号 ---
  steering: number; // 铰接转向: -1 (左) to 1 (右)
  throttle: number; // 油门: 0 to 1
  brake: number;    // 刹车: 0 to 1
  
  // --- 关键辅助信号 (Excel "必须") ---
  emergency_stop: boolean; // 紧急急停 (红色蘑菇头)
  parking_brake: boolean;  // 停车制动 (手刹)
  horn: boolean;           // 喇叭
  gear: 'N' | 'D' | 'R';   // 档位: 空/前/后
  speed_mode: 'turtle' | 'rabbit'; // 速度模式: 乌龟/兔子
  
  // --- 灯光信号 (位掩码或独立布尔值，这里用位掩码更高效) ---
  // 0x01: 左转, 0x02: 右转, 0x04: 远光, 0x08: 近光, 0x10: 工作灯
  light_code: number; 
  
  // --- 其他安全信号 ---
  hydraulic_lock: boolean; // 液压锁
  power_enable: boolean;   // 上高压
}

// 定义手柄映射配置 (挖掘机 - 双摇杆)
const EXCAVATOR_MAPPING = {
  // 左手柄
  LEFT_GAMEPAD_INDEX: 0,
  SWING_AXIS: 0, // 驾驶室旋转 (X轴)
  STICK_AXIS: 1, // 小臂伸缩 (Y轴)
  LEFT_TRACK_AXIS: 6, // 左履带 (轴6 - 滑块)

  // 右手柄
  RIGHT_GAMEPAD_INDEX: 1,
  BUCKET_AXIS: 0, // 铲斗开合 (X轴)
  BOOM_AXIS: 1, // 大臂提降 (Y轴)
  RIGHT_TRACK_AXIS: 6, // 右履带 (轴6 - 滑块)
};

// 定义手柄映射配置 (装载机 - 方向盘 + 摇杆)
// 方向盘通常是 Index 0, 摇杆是 Index 1 (取决于连接顺序)
const LOADER_MAPPING = {
  // 罗技方向盘 (G29/G923 等)
  STEERING_AXIS: 0, // 方向盘 (左负右正)
  THROTTLE_AXIS: 2, // 油门踏板 (默认1, 踩下-1)
  BRAKE_AXIS: 3,    // 刹车踏板 (默认1, 踩下-1) - 通常刹车是轴3，离合是轴1，需根据实际情况微调
  
  // 按钮索引 (实测 G923/Xbox模式)
  BTN_CROSS: 0,   // A
  BTN_CIRCLE: 1,  // B
  BTN_SQUARE: 2,  // X
  BTN_TRIANGLE: 3,// Y
  
  // 使用拨片进行换挡 (Shuttle Shift) - 用户确认 L1/R1 为左右拨片
  BTN_L1: 4, // 左拨片 (Index 4) -> 倒车 (R)
  BTN_R1: 5, // 右拨片 (Index 5) -> 前进 (D)
  
  BTN_HORN: 10,    // 喇叭 (R3)
  BTN_OPTIONS: 9,  // 急停 (Start/Menu)

  // 右手摇杆 (Extreme 3D Pro) - 控制作业装置
  JOYSTICK_BOOM_AXIS: 1, // Y轴 - 大臂
  JOYSTICK_BUCKET_AXIS: 0, // X轴 - 铲斗
};

// 踏板归一化工具：将 1(松) ~ -1(踩) 转换为 0(松) ~ 1(踩)
// 用户实测: 默认1, 踩死-1
const normalizePedal = (val: number) => {
  // (1 - 1) / 2 = 0
  // (1 - (-1)) / 2 = 1
  return (1 - val) / 2; 
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
    // 初始化扩展字段
    steering: 0,
    throttle: 0,
    brake: 0,
    emergency_stop: false,
    parking_brake: true, // 默认拉起手刹
    horn: false,
    gear: 'N',
    speed_mode: 'turtle',
    light_code: 0,
    hydraulic_lock: true, // 默认锁定
    power_enable: false,
  });

  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0); // ⏱️ 记录上次更新时间
  const gearRef = useRef<'N' | 'D' | 'R'>('N'); // 🔒 记录档位状态
  const prevGearButtonsRef = useRef({ r1: false, l1: false }); // 记录上一帧按键状态

  // 设定目标帧率：30FPS -> 约 33ms 一次
  // 对于控制挖掘机这种重型机械，30Hz 已经非常丝滑了
  const THROTTLE_INTERVAL = 33;

  useEffect(() => {
    console.log("开始监听手柄");
    const updateControls = () => {
      // 1. 获取当前时间
      const now = Date.now();

      // 2. 检查是否满足时间间隔
      // 如果距离上次更新不足 33ms，直接请求下一帧并"提前返回"，不执行后面的重逻辑
      if (now - lastUpdateRef.current < THROTTLE_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(updateControls);
        return;
      }

      // --- 下面是原本的逻辑，现在只有每 33ms 才会执行一次 ---
      const gamepads = navigator.getGamepads();
      
      // 简单的设备识别逻辑：
      // 如果有两个手柄，且名字都像摇杆 -> 挖掘机模式
      // 如果有一个是方向盘 (Wheel) -> 装载机模式
      
      let mode: 'excavator' | 'loader' = 'excavator';
      let wheel: Gamepad | null = null;
      let joystick: Gamepad | null = null;
      const leftGamepad = gamepads[EXCAVATOR_MAPPING.LEFT_GAMEPAD_INDEX];
      const rightGamepad = gamepads[EXCAVATOR_MAPPING.RIGHT_GAMEPAD_INDEX];

      // 遍历寻找方向盘
      for (const gp of gamepads) {
        if (gp && (gp.id.toLowerCase().includes('wheel') || gp.id.toLowerCase().includes('g29') || gp.id.toLowerCase().includes('g923'))) {
          mode = 'loader';
          wheel = gp;
        }
        if (gp && (gp.id.toLowerCase().includes('extreme') || gp.id.toLowerCase().includes('joystick'))) {
          joystick = gp; // 找到一个摇杆作为右手
        }
      }

      let newControls: ExcavatorControls;

      if (mode === 'loader' && wheel) {
        // ===========================
        // 装载机模式 (Wheel Loader)
        // ===========================

        // --- 档位逻辑 (带锁存) ---
        const isDPressed = wheel.buttons[LOADER_MAPPING.BTN_R1].pressed;
        const isRPressed = wheel.buttons[LOADER_MAPPING.BTN_L1].pressed;
        
        // 检测上升沿 (按下瞬间)
        if (isDPressed && !prevGearButtonsRef.current.r1) {
          gearRef.current = 'D'; // 切换到前进
        }
        if (isRPressed && !prevGearButtonsRef.current.l1) {
          gearRef.current = 'R'; // 切换到后退
        }
        // 同时按下 -> 空档 (或者你可以指定其他逻辑)
        if (isDPressed && isRPressed) {
          gearRef.current = 'N';
        }
        
        // 更新按键状态记录
        prevGearButtonsRef.current = { r1: isDPressed, l1: isRPressed };

        newControls = {
          // 默认值填充
          leftTrack: 0, rightTrack: 0, swing: 0, stick: 0,
          
          // 1. 驾驶 (方向盘)
          steering: normalizeAxisValue(wheel.axes[LOADER_MAPPING.STEERING_AXIS]),
          throttle: normalizePedal(wheel.axes[LOADER_MAPPING.THROTTLE_AXIS]),
          brake: normalizePedal(wheel.axes[LOADER_MAPPING.BRAKE_AXIS]),
          
          // 2. 档位 (使用锁存状态)
          gear: gearRef.current,
              
          // 3. 作业 (右手摇杆 - 如果有)
          boom: joystick ? normalizeAxisValue(joystick.axes[LOADER_MAPPING.JOYSTICK_BOOM_AXIS]) : 0,
          bucket: joystick ? normalizeAxisValue(joystick.axes[LOADER_MAPPING.JOYSTICK_BUCKET_AXIS]) : 0,
          
          // 4. 辅助功能
          horn: wheel.buttons[LOADER_MAPPING.BTN_HORN].pressed,
          parking_brake: wheel.buttons[LOADER_MAPPING.BTN_CIRCLE].pressed, // O/B键手刹
          emergency_stop: wheel.buttons[LOADER_MAPPING.BTN_OPTIONS].pressed,
          
          // 其他默认
          speed_mode: 'turtle',
          light_code: 0,
          hydraulic_lock: false,
          power_enable: true,
        };
      } else {
        // ===========================
        // 挖掘机模式 (Excavator) - 保持原样
        // ===========================
        newControls = {
          swing: leftGamepad
            ? normalizeAxisValue(leftGamepad.axes[EXCAVATOR_MAPPING.SWING_AXIS])
            : 0,
          stick: leftGamepad
            ? normalizeAxisValue(leftGamepad.axes[EXCAVATOR_MAPPING.STICK_AXIS])
            : 0,
          leftTrack: leftGamepad
            ? normalizeAxisValue(leftGamepad.axes[EXCAVATOR_MAPPING.LEFT_TRACK_AXIS])
            : 0,
          bucket: rightGamepad
            ? normalizeAxisValue(rightGamepad.axes[EXCAVATOR_MAPPING.BUCKET_AXIS])
            : 0,
          boom: rightGamepad
            ? normalizeAxisValue(rightGamepad.axes[EXCAVATOR_MAPPING.BOOM_AXIS])
            : 0,
          rightTrack: rightGamepad
            ? normalizeAxisValue(rightGamepad.axes[EXCAVATOR_MAPPING.RIGHT_TRACK_AXIS])
            : 0,
            
          // 扩展字段默认值
          steering: 0,
          throttle: 0,
          brake: 0,
          emergency_stop: false,
          parking_brake: false,
          horn: false,
          gear: 'N',
          speed_mode: 'turtle',
          light_code: 0,
          hydraulic_lock: false,
          power_enable: true,
        };
      }
      // 3. 更新状态 (这会触发 React 重新渲染)
      setControls(newControls);

      // 4. 更新时间戳
      lastUpdateRef.current = now;

      // 继续循环
      animationFrameRef.current = requestAnimationFrame(updateControls);

      //打印newControls
      // console.log("newControls", newControls);
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
