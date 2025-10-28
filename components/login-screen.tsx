"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim() && password.trim()) {
      setIsLoading(true)
      // 模拟登录延迟
      await new Promise(resolve => setTimeout(resolve, 800))
      onLogin(username, password)
    }
  }

  return (
    <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* 动画背景网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
      
      {/* 光晕效果 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[128px] animate-pulse" />
      
      {/* 登录卡片 */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800/50 overflow-hidden">
          {/* 顶部装饰条 */}
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          
          <div className="p-8">
            {/* Logo和标题 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                远程控制系统
              </h1>
              <p className="text-slate-400 text-sm">
                挖掘机远程监控与操作平台
              </p>
            </div>

            {/* 登录表单 */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300 text-sm font-medium">
                  用户名
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 h-11 transition-all"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </Button>
            </form>

            {/* 提示信息 */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                首次使用？输入任意用户名和密码即可登录
              </p>
            </div>
          </div>

          {/* 底部装饰 */}
          <div className="px-8 py-4 bg-slate-800/30 border-t border-slate-800/50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>© 2025 远程控制系统</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                服务在线
              </span>
            </div>
          </div>
        </div>

        {/* 底部链接 */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-slate-400">
            WebRTC 实时视频传输 · 低延迟控制
          </p>
        </div>
      </div>
    </div>
  )
}

