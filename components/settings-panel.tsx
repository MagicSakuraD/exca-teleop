"use client"

import type React from "react"

import { useState } from "react"
import { X, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isLoggedIn: boolean
  username: string
  onLogin: (username: string, password: string) => void
  onLogout: () => void
  excavatorName: string
  onExcavatorNameChange: (name: string) => void
  signalingServer: string
  onSignalingServerChange: (server: string) => void
  showConnectionLog?: boolean
  connectionLogs?: React.ReactNode
}

export function SettingsPanel({
  open,
  onOpenChange,
  isLoggedIn,
  username,
  onLogin,
  onLogout,
  excavatorName,
  onExcavatorNameChange,
  signalingServer,
  onSignalingServerChange,
  showConnectionLog = false,
  connectionLogs,
}: SettingsPanelProps) {
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [tempExcavatorName, setTempExcavatorName] = useState(excavatorName)
  const [tempSignalingServer, setTempSignalingServer] = useState(signalingServer)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginUsername.trim() && loginPassword.trim()) {
      onLogin(loginUsername, loginPassword)
      setLoginPassword("")
    }
  }

  const handleSave = () => {
    onExcavatorNameChange(tempExcavatorName)
    onSignalingServerChange(tempSignalingServer)
    onOpenChange(false)
  }

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
            <h2 className="text-2xl font-bold text-white">{isLoggedIn ? "用户中心" : "用户登录"}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {!isLoggedIn ? (
            // Login Form
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gray-800 p-4 rounded-full">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300">
                    用户名
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="bg-gray-800 border-white/10 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">
                    密码
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-gray-800 border-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" size="lg">
                  登录
                </Button>
              </div>

              <div className="text-center text-sm text-gray-400">登录后可连接远程装载机</div>
            </form>
          ) : (
            // User Info and Excavator Connection
            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-gray-800 p-4 rounded-lg border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    <User className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">当前用户</div>
                    <div className="text-lg font-semibold text-white">{username}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="w-full bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </Button>
              </div>

              {/* Excavator Connection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                  <h3 className="text-lg font-semibold">装载机连接</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excavator-name" className="text-gray-300">
                    装载机名称
                  </Label>
                  <Input
                    id="excavator-name"
                    type="text"
                    placeholder="请输入装载机名称"
                    value={tempExcavatorName}
                    onChange={(e) => setTempExcavatorName(e.target.value)}
                    className="bg-gray-800 border-white/10 text-white"
                  />
                  <p className="text-xs text-gray-400">输入您要远程连接的装载机设备名称</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signaling-server" className="text-gray-300">
                    信令服务器地址
                  </Label>
                  <Input
                    id="signaling-server"
                    type="text"
                    placeholder="ws://111.186.56.118:8090/ws"
                    value={tempSignalingServer}
                    onChange={(e) => setTempSignalingServer(e.target.value)}
                    className="bg-gray-800 border-white/10 text-white font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400">WebSocket 信令服务器 URL</p>
                </div>
              </div>

              {/* Connection Log */}
              {showConnectionLog && connectionLogs && (
                <div className="space-y-2">
                  <Label className="text-gray-300">连接日志</Label>
                  {connectionLogs}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <Button className="w-full" size="lg" onClick={handleSave}>
                  保存并连接
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  size="lg"
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
