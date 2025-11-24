"use client";

import { useState, useEffect, useRef } from "react";

const GamepadTestPage = () => {
  const [gamepads, setGamepads] = useState<Record<number, Gamepad | null>>({});
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const pollGamepads = () => {
      const allGamepads = navigator.getGamepads();
      setGamepads(Array.from(allGamepads));
      animationFrameRef.current = requestAnimationFrame(pollGamepads);
    };

    pollGamepads();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getAxisColor = (value: number) => {
    const intensity = Math.abs(value);
    if (intensity > 0.8) return "bg-red-400";
    if (intensity > 0.5) return "bg-yellow-400";
    if (intensity > 0.2) return "bg-blue-400";
    return "bg-gray-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 标题区域 */}
        <div className="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <h1 className="text-5xl font-light text-white mb-3 tracking-tight">游戏手柄测试</h1>
          <p className="text-white/70 text-lg font-light">
            连接您的游戏手柄，实时查看输入数据
          </p>
        </div>

        {/* 手柄列表 */}
        {Object.values(gamepads).filter(p => p).length > 0 ? (
          <div className="space-y-6">
            {Object.values(gamepads).map((gamepad) => {
              if (!gamepad) return null;
              return (
                <div 
                  key={gamepad.index} 
                  className="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300"
                >
                  {/* 手柄标题 */}
                  <div className="mb-6 pb-6 border-b border-white/20">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                      <h2 className="text-3xl font-light text-white">手柄 {gamepad.index}</h2>
                    </div>
                    <p className="text-white/60 text-sm font-light ml-6">{gamepad.id}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* 轴数据 */}
                    <div>
                      <h3 className="text-xl font-light text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">🎮</span>
                        摇杆轴向
                      </h3>
                      <div className="space-y-3">
                        {gamepad.axes.map((axis, index) => (
                          <div key={index} className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white/80 text-sm font-light">轴 {index}</span>
                              <span className="text-white font-mono text-sm">{axis.toFixed(4)}</span>
                            </div>
                            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`absolute h-full ${getAxisColor(axis)} rounded-full transition-all duration-75 shadow-lg`}
                                style={{ 
                                  width: `${Math.abs(axis) * 100}%`,
                                  left: axis < 0 ? `${50 - Math.abs(axis) * 50}%` : '50%',
                                  right: axis > 0 ? `${50 - Math.abs(axis) * 50}%` : '50%'
                                }}
                              ></div>
                              <div className="absolute left-1/2 top-0 w-0.5 h-full bg-white/30"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 按钮数据 */}
                    <div>
                      <h3 className="text-xl font-light text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">🔘</span>
                        按钮状态
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {gamepad.buttons.map((button, index) => (
                          <div 
                            key={index} 
                            className={`backdrop-blur-xl rounded-2xl p-4 border transition-all duration-150 ${
                              button.pressed 
                                ? 'bg-purple-500/30 border-purple-400/50 shadow-lg shadow-purple-500/30' 
                                : 'bg-white/5 border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white/80 text-sm font-light">按钮 {index}</span>
                              <div className={`w-2 h-2 rounded-full ${button.pressed ? 'bg-purple-400 shadow-lg shadow-purple-400/50' : 'bg-white/30'}`}></div>
                            </div>
                            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-75 ${
                                  button.value > 0 ? 'bg-gradient-to-r from-purple-400 to-pink-400' : 'bg-white/20'
                                }`}
                                style={{ width: `${button.value * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="backdrop-blur-2xl bg-white/10 rounded-3xl p-16 border border-white/20 shadow-2xl text-center">
            <div className="text-6xl mb-6 animate-bounce">🎮</div>
            <p className="text-white/70 text-xl font-light mb-2">未检测到游戏手柄</p>
            <p className="text-white/50 text-sm font-light">请连接手柄并按任意键激活</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamepadTestPage;