"use client"

import { useState } from "react"
import { X, Video, Camera, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const [videoQuality, setVideoQuality] = useState("high")
  const [camera, setCamera] = useState("main")
  const [brightness, setBrightness] = useState([100])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      {/* Settings Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-gray-900 border-l border-white/10 shadow-2xl overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">设置</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Video Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Video className="h-5 w-5" />
                <h3 className="text-lg font-semibold">视频设置</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-quality" className="text-gray-300">
                  视频质量
                </Label>
                <Select value={videoQuality} onValueChange={setVideoQuality}>
                  <SelectTrigger id="video-quality" className="bg-gray-800 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低 (480p)</SelectItem>
                    <SelectItem value="medium">中 (720p)</SelectItem>
                    <SelectItem value="high">高 (1080p)</SelectItem>
                    <SelectItem value="ultra">超高 (4K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brightness" className="text-gray-300">
                  亮度: {brightness[0]}%
                </Label>
                <Slider
                  id="brightness"
                  value={brightness}
                  onValueChange={setBrightness}
                  max={200}
                  step={10}
                  className="py-4"
                />
              </div>
            </div>

            {/* Camera Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Camera className="h-5 w-5" />
                <h3 className="text-lg font-semibold">摄像头</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="camera" className="text-gray-300">
                  选择摄像头
                </Label>
                <Select value={camera} onValueChange={setCamera}>
                  <SelectTrigger id="camera" className="bg-gray-800 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">主摄像头</SelectItem>
                    <SelectItem value="cabin">驾驶舱</SelectItem>
                    <SelectItem value="arm">机械臂</SelectItem>
                    <SelectItem value="rear">后视</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Connection Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Wifi className="h-5 w-5" />
                <h3 className="text-lg font-semibold">连接设置</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="server-url" className="text-gray-300">
                  服务器地址
                </Label>
                <Input
                  id="server-url"
                  type="text"
                  placeholder="wss://example.com"
                  className="bg-gray-800 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token" className="text-gray-300">
                  访问令牌
                </Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="输入访问令牌"
                  className="bg-gray-800 border-white/10 text-white"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              <Button className="w-full" size="lg">
                保存设置
              </Button>
              <Button variant="outline" className="w-full bg-transparent" size="lg" onClick={() => onOpenChange(false)}>
                取消
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
