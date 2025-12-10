# 🚜 远程挖掘机控制系统

基于 Next.js + WebRTC 的现代化远程挖掘机/装载机控制系统，支持实时视频流、游戏手柄控制和语音通话。

## ✨ 功能特性

- 🎮 **游戏手柄控制** - 支持挖掘机（双摇杆）和装载机（方向盘+摇杆）两种模式
- 📹 **实时视频流** - WebRTC 低延迟视频传输
- 🎤 **语音通话** - 双向语音通信（麦克风 + 扬声器）
- 📊 **实时监控** - 连接质量、帧率、丢包率等统计信息
- 🔐 **用户认证** - 基于 Supabase 的 OTP 邮箱验证
- 🎨 **现代化 UI** - VisionOS 风格的玻璃态界面设计

## 🛠️ 技术栈

- **前端框架**: Next.js 16 (App Router)
- **WebRTC**: 实时音视频通信
- **认证服务**: Supabase
- **UI 组件**: shadcn/ui + Tailwind CSS
- **信令服务器**: Go (gorilla/websocket)

## 📋 前置要求

- Node.js 18+ 
- npm / yarn / pnpm
- 运行中的信令服务器（Go 程序）
- Supabase 项目（用于用户认证）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd exca-teleop
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3001](http://localhost:3001)

### 4. 启动信令服务器

在另一个终端中，启动 Go 信令服务器：

```bash
cd ../excavator
./bin/signaling -addr :8090
```

信令服务器将监听 `:8090` 端口，WebSocket 端点为 `ws://localhost:8090/ws`

## ⚙️ 配置说明

### 信令服务器地址

默认配置在 `app/page.tsx` 中：

```typescript
const [signalingServer, setSignalingServer] = useState("wss://cyberc3-cloud-server.sjtu.edu.cn/ws")
```

可以通过设置面板修改，或直接编辑代码。

### 游戏手柄映射

系统会自动检测手柄类型：
- **挖掘机模式**: 双摇杆操作（ISO 标准）
- **装载机模式**: 方向盘 + 摇杆操作

手柄映射配置在 `hooks/useExcavatorGamepad.ts` 中。

### 音频设置

- **麦克风**: 默认开启，连接后自动发送语音
- **扬声器**: 默认关闭（确保视频自动播放），需要手动点击开启

## 🎮 使用说明

### 登录

1. 输入交大邮箱地址
2. 点击"发送验证码"
3. 查收邮件并输入 6 位验证码
4. 登录成功后进入控制界面

### 连接设备

1. 输入挖掘机/装载机设备名称
2. 点击"连接"
3. 等待 WebRTC 连接建立
4. 看到视频画面后即可开始控制

### 控制操作

- **游戏手柄**: 连接手柄后自动识别，支持实时控制
- **工作灯**: 点击工作灯按钮切换
- **鸣笛**: 点击鸣笛按钮
- **速度模式**: 切换低速/高速模式
- **麦克风**: 点击麦克风按钮切换静音
- **扬声器**: 点击扬声器按钮开启/关闭远程音频
- **紧急停机**: 点击红色急停按钮

## 📊 连接状态指示

- 🟢 **已连接**: WebRTC 连接成功
- 🟡 **连接中**: 正在建立连接
- 🔴 **已断开**: 连接失败或断开

连接成功后显示：
- **RTT**: 往返延迟（毫秒）
- **抖动**: 网络抖动（毫秒）
- **帧率**: 视频帧率（fps）
- **丢包率**: 网络丢包百分比

## 🔧 开发

### 项目结构

```
exca-teleop/
├── app/                    # Next.js App Router
│   └── page.tsx            # 主控制页面
├── components/             # React 组件
│   ├── GamepadControl.tsx  # 游戏手柄控制
│   ├── GlassButton.tsx    # 玻璃态按钮
│   └── ...
├── hooks/                  # React Hooks
│   ├── useWebRTC.ts        # WebRTC 连接逻辑
│   └── useExcavatorGamepad.ts  # 手柄输入处理
└── lib/                    # 工具库
```

### 关键文件

- `hooks/useWebRTC.ts` - WebRTC 连接、信令、音视频处理
- `hooks/useExcavatorGamepad.ts` - 游戏手柄输入映射和节流
- `components/GamepadControl.tsx` - 控制命令发送
- `app/page.tsx` - 主界面和状态管理

## 🐛 故障排除

### 视频无法自动播放

如果视频画面停在第一帧：
- 点击页面任意位置（用户交互）
- 或在浏览器设置中允许该网站自动播放音频

### 麦克风权限被拒绝

- 检查浏览器权限设置
- 确保使用 HTTPS 或 localhost（某些浏览器要求）

### 连接失败

1. 检查信令服务器是否运行：`curl http://localhost:8090/status`
2. 检查 WebSocket 连接：`wscat -c ws://localhost:8090/ws`
3. 查看浏览器控制台日志
4. 检查网络防火墙设置

### 手柄无法识别

- 确保手柄已连接并激活（按任意键）
- 刷新页面重新检测
- 检查浏览器是否支持 Gamepad API

## 📝 许可证

本项目为内部项目，仅供学习和研究使用。

## 🔗 相关文档

- [信令服务器文档](../excavator/README.md)
- [部署指南](../excavator/CLOUD_DEPLOYMENT.md)
- [ROS2 集成](../excavator/ROS2_INTEGRATION.md)

---

**注意**: 生产环境部署时，请确保：
- 使用 HTTPS/WSS 加密连接
- 配置正确的 CORS 策略
- 启用 Supabase Row Level Security (RLS)
- 配置 Nginx 反向代理（如需要）
