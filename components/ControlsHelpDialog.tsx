import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Keyboard, Gamepad2, Info } from "lucide-react";

interface ControlsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ControlsHelpDialog({ open, onOpenChange }: ControlsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-gray-950/90 backdrop-blur-xl border-white/10 text-white max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="text-blue-400" />
            操作说明
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            支持 键盘 / Xbox 手柄 / 罗技方向盘 (G29/G923)
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="keyboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            <TabsTrigger value="keyboard" className="data-[state=active]:bg-white/10 text-white">
              <Keyboard className="w-4 h-4 mr-2" />
              键盘快捷键
            </TabsTrigger>
            <TabsTrigger value="xbox" className="data-[state=active]:bg-white/10 text-white">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Xbox 手柄
            </TabsTrigger>
            <TabsTrigger value="wheel" className="data-[state=active]:bg-white/10 text-white">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="2" />
                <path d="M12 2v8" />
                <path d="M12 14v8" />
                <path d="M2 12h8" />
                <path d="M14 12h8" />
              </svg>
              方向盘 (G29/G923)
            </TabsTrigger>
          </TabsList>

          {/* --- Keyboard --- */}
          <TabsContent value="keyboard" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-blue-300">🎮 基础控制</h3>
                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm border-b border-white/10 pb-2">
                  <span>Space (空格)</span>
                  <span className="font-mono text-red-400 font-bold">🚨 紧急停机</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-yellow-300">⚡ 辅助功能</h3>
                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm border-b border-white/10 pb-2">
                  <span>H</span>
                  <span className="font-mono text-gray-400">📢 鸣笛 (Horn)</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm border-b border-white/10 pb-2">
                  <span>L</span>
                  <span className="font-mono text-gray-400">💡 开关灯光 (Lights)</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm border-b border-white/10 pb-2">
                  <span>R</span>
                  <span className="font-mono text-gray-400">🐇 切换速度 (Rabbit/Turtle)</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm border-b border-white/10 pb-2">
                  <span>M</span>
                  <span className="font-mono text-gray-400">🎤 麦克风开/关 (Mic)</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm border-b border-white/10 pb-2">
                  <span>K</span>
                  <span className="font-mono text-gray-400">🔊 扬声器开/关 (Speaker)</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* --- Xbox --- */}
          <TabsContent value="xbox" className="mt-4">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <h3 className="text-lg font-medium text-green-400 mb-4">Xbox Controller (户外调试)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-300 border-b border-white/20 pb-1">🕹️ 左摇杆</h4>
                  <div className="flex justify-between"><span>X轴 (左右)</span> <span className="text-green-300">转向</span></div>
                  <div className="flex justify-between"><span>Y轴 (前推)</span> <span className="text-green-300">油门 (0 ~ -1)</span></div>
                  <div className="flex justify-between"><span>Y轴 (后拉)</span> <span className="text-red-300">刹车 (0 ~ 1)</span></div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-300 border-b border-white/20 pb-1">🕹️ 右摇杆 (作业)</h4>
                  <div className="flex justify-between"><span>Y轴 (后拉)</span> <span className="text-blue-300">提大臂 (Boom Up)</span></div>
                  <div className="flex justify-between"><span>Y轴 (前推)</span> <span className="text-blue-300">降大臂 (Boom Down)</span></div>
                  <div className="flex justify-between"><span>X轴 (左)</span> <span className="text-blue-300">收铲斗 (Curl)</span></div>
                  <div className="flex justify-between"><span>X轴 (右)</span> <span className="text-blue-300">翻铲斗 (Dump)</span></div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-300 border-b border-white/20 pb-1">🎮 按键 (Buttons)</h4>
                  <div className="flex justify-between"><span>RB (R1)</span> <span className="text-yellow-300">前进档 (D)</span></div>
                  <div className="flex justify-between"><span>LB (L1)</span> <span className="text-yellow-300">倒档 (R)</span></div>
                  <div className="flex justify-between"><span>LS (按下左摇杆) / Y</span> <span className="text-orange-300">📢 鸣笛</span></div>
                  <div className="flex justify-between"><span>B</span> <span className="text-red-400">手刹</span></div>
                  <div className="flex justify-between"><span>Back / View</span> <span className="text-red-500 font-bold">🚨 急停</span></div>
                  <div className="flex justify-between"><span>X (长按)</span> <span className="text-cyan-300">🐇 高速模式</span></div>
                  <div className="flex justify-between"><span>D-Pad 上</span> <span className="text-yellow-200">💡 开灯</span></div>
                </div>

              </div>
            </div>
          </TabsContent>

          {/* --- Wheel --- */}
          <TabsContent value="wheel" className="mt-4">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <h3 className="text-lg font-medium text-purple-400 mb-4">罗技方向盘 + 摇杆 (Loader Mode)</h3>
              <p className="text-sm text-gray-400 mb-4">
                标准装载机操作模式：左手方向盘驾驶，右手飞行摇杆控制作业。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-300 border-b border-white/20 pb-1">🚗 方向盘 (G29/G923)</h4>
                  <div className="flex justify-between"><span>方向盘</span> <span className="text-purple-300">铰接转向</span></div>
                  <div className="flex justify-between"><span>右踏板</span> <span className="text-green-300">油门</span></div>
                  <div className="flex justify-between"><span>中/左踏板</span> <span className="text-red-300">刹车/寸进</span></div>
                  <div className="flex justify-between"><span>右拨片 (R1)</span> <span className="text-yellow-300">前进档 (D)</span></div>
                  <div className="flex justify-between"><span>左拨片 (L1)</span> <span className="text-yellow-300">倒档 (R)</span></div>
                  <div className="flex justify-between"><span>R3 / 喇叭键</span> <span className="text-orange-300">📢 鸣笛</span></div>
                  <div className="flex justify-between"><span>O / Circle</span> <span className="text-red-400">手刹</span></div>
                  <div className="flex justify-between"><span>Option / Menu</span> <span className="text-red-500 font-bold">🚨 急停</span></div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-300 border-b border-white/20 pb-1">🕹️ 右手飞行摇杆</h4>
                  <div className="flex justify-between"><span>Y轴 (后拉)</span> <span className="text-blue-300">提大臂</span></div>
                  <div className="flex justify-between"><span>Y轴 (前推)</span> <span className="text-blue-300">降大臂</span></div>
                  <div className="flex justify-between"><span>X轴 (左)</span> <span className="text-blue-300">收铲斗</span></div>
                  <div className="flex justify-between"><span>X轴 (右)</span> <span className="text-blue-300">翻铲斗</span></div>
                </div>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

