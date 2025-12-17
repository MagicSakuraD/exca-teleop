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
  throttle: number; // 油门: -1 (踩死) to 1 (松开) - G293 原始值
  brake: number;    // 刹车: -1 (踩死) to 1 (松开) - G293 原始值
  
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
  BRAKE_AXIS: 5,    // 刹车踏板 (默认1, 踩下-1) - 通常刹车是轴3，离合是轴1，需根据实际情况微调
  
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

// Xbox 360 / One / Series 控制器映射 (标准 XInput)
const XBOX_MAPPING = {
  STEERING_AXIS: 0, // 左摇杆 X轴
  DRIVE_AXIS: 1,    // 左摇杆 Y轴 (前推油门，后拉刹车)
  BUCKET_AXIS: 2,   // 右摇杆 X轴 (铲斗)
  BOOM_AXIS: 3,     // 右摇杆 Y轴 (大臂)

  // 按钮
  BTN_A: 0,
  BTN_B: 1,
  BTN_X: 2,
  BTN_Y: 3,
  BTN_LB: 4,        // 倒档
  BTN_RB: 5,        // 前进档
  BTN_LT: 6,
  BTN_RT: 7,
  BTN_BACK: 8,      // 急停
  BTN_START: 9,
  BTN_LS: 10,       // 喇叭
  BTN_RS: 11,
  BTN_UP: 12,       // 灯光
  BTN_DOWN: 13,
  BTN_LEFT: 14,
  BTN_RIGHT: 15,
};



// 死区，避免摇杆轻微晃动产生误操作
const DEADZONE = 0.05;

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
    // 初始化扩展字段（踏板默认值：1 = 松开）
    steering: 0,
    throttle: 1,  // G293: 1 = 松开
    brake: 1,     // G293: 1 = 松开
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
      
      let mode: 'excavator' | 'loader' | 'xbox' = 'excavator';
      let wheel: Gamepad | null = null;
      let joystick: Gamepad | null = null;
      let xbox: Gamepad | null = null;
      const leftGamepad = gamepads[EXCAVATOR_MAPPING.LEFT_GAMEPAD_INDEX];
      const rightGamepad = gamepads[EXCAVATOR_MAPPING.RIGHT_GAMEPAD_INDEX];

      // 遍历寻找方向盘或 Xbox 手柄
      for (const gp of gamepads) {
        if (!gp) continue;
        const id = gp.id.toLowerCase();
        
        if (id.includes('wheel') || id.includes('g29') || id.includes('g923')) {
          mode = 'loader';
          wheel = gp;
          break; // 优先方向盘
        }
        
        if (id.includes('xbox') || id.includes('xinput') || id.includes('microsoft')) {
          mode = 'xbox';
          xbox = gp;
        }
        
        if (id.includes('extreme') || id.includes('joystick')) {
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
          throttle: wheel.axes[LOADER_MAPPING.THROTTLE_AXIS], // 直接读取硬件原始值，未定义时默认1（松开）
          brake: wheel.axes[LOADER_MAPPING.BRAKE_AXIS] ,       // 直接读取硬件原始值，未定义时默认1（松开）
          
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
      } else if (mode === 'xbox' && xbox) {
        // ===========================
        // Xbox 模式 (户外调试用)
        // ===========================

        // --- 档位逻辑 ---
        // RB -> D, LB -> R
        const isDPressed = xbox.buttons[XBOX_MAPPING.BTN_RB].pressed;
        const isRPressed = xbox.buttons[XBOX_MAPPING.BTN_LB].pressed;

        if (isDPressed && !prevGearButtonsRef.current.r1) gearRef.current = 'D';
        if (isRPressed && !prevGearButtonsRef.current.l1) gearRef.current = 'R';
        if (isDPressed && isRPressed) gearRef.current = 'N';

        prevGearButtonsRef.current = { r1: isDPressed, l1: isRPressed };

        // --- 油门/刹车分离逻辑 (左摇杆 Y轴: Axis 1) ---
        // 原始值: -1 (上/前) ~ 1 (下/后)
        const driveAxis = xbox.axes[XBOX_MAPPING.DRIVE_AXIS];
        let throttle = 0;
        let brake = 0;

        if (driveAxis < -DEADZONE) {
          // 前推 -> 油门
          throttle = Math.abs(driveAxis);
        } else if (driveAxis > DEADZONE) {
          // 后拉 -> 刹车
          brake = Math.abs(driveAxis);
        }

        newControls = {
          leftTrack: 0, rightTrack: 0, swing: 0, stick: 0,

          // 1. 驾驶 (左摇杆 X)
          steering: normalizeAxisValue(xbox.axes[XBOX_MAPPING.STEERING_AXIS]),
          throttle: throttle,
          brake: brake,

          // 2. 档位
          gear: gearRef.current,

          // 3. 作业 (右摇杆)
          // 主流操作: 右摇杆 Y (Axis 3) 控制大臂 (Up/Down), 右摇杆 X (Axis 2) 控制铲斗 (Left/Right)
          // 注意: 摇杆 Y 向下是正值 (+1), 向上是负值 (-1)
          // ExcavatorControls 定义: boom -1(降) to 1(提)
          // 物理习惯: 拉杆(向下/后) -> 提大臂 -> 需要正值
          // 物理习惯: 推杆(向上/前) -> 降大臂 -> 需要负值
          // XInput Axis 3: 下是 +1, 上是 -1.
          // 目标: 1(提), -1(降). 
          // 这里的映射取决于操作习惯。 ISO模式: 拉杆(下)是提臂(Up)。
          // 所以 Axis > 0 (下) -> Boom > 0 (提). 
          // 结论: 不需要乘 -1。
          boom: normalizeAxisValue(xbox.axes[XBOX_MAPPING.BOOM_AXIS]), 

          // 铲斗: -1(收) to 1(翻)
          // 物理习惯: 左推(收) -> Axis 2 负值; 右推(翻) -> Axis 2 正值
          bucket: normalizeAxisValue(xbox.axes[XBOX_MAPPING.BUCKET_AXIS]),

          // 4. 辅助功能
          horn: xbox.buttons[XBOX_MAPPING.BTN_LS].pressed || xbox.buttons[XBOX_MAPPING.BTN_Y].pressed, // LS按下或Y键
          parking_brake: xbox.buttons[XBOX_MAPPING.BTN_B].pressed, // B键手刹
          emergency_stop: xbox.buttons[XBOX_MAPPING.BTN_BACK].pressed, // Back键急停
          
          light_code: xbox.buttons[XBOX_MAPPING.BTN_UP].pressed ? 0x10 : 0, // D-Pad上 开灯
          speed_mode: xbox.buttons[XBOX_MAPPING.BTN_X].pressed ? 'rabbit' : 'turtle', // X键切换速度(暂定按住兔子)

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
      console.log("newControls", newControls);
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
