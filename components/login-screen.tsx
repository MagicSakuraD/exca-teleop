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
      await new Promise(resolve => setTimeout(resolve, 1000))
      onLogin(username, password)
      setIsLoading(false)
    }
  }

  return (
    <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden bg-black">
      {/* 动画背景网格 */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* 光晕效果 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-500/40 to-blue-700/40 rounded-full blur-[160px] animate-pulse duration-[4000ms]" />

      {/* 登录卡片 */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden">
          <div className="p-8">
            {/* Logo和标题 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-white/10 border border-white/10">
                <svg
                  className="w-10 h-10 text-white/80"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="4" fill="currentColor"/>
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-neutral-200 mb-2">
                远程控制系统
              </h1>
              <p className="text-neutral-400 text-sm">
                挖掘机远程监控与操作平台
              </p>
            </div>

            {/* 登录表单 */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-neutral-300 text-sm font-medium">
                  用户名
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-neutral-400 focus:bg-white/10 focus:border-white/20 focus:ring-0 h-12 rounded-lg transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-300 text-sm font-medium">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-neutral-400 focus:bg-white/10 focus:border-white/20 focus:ring-0 h-12 rounded-lg transition-all"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                className="w-full h-12 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold shadow-lg shadow-black/20 transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "安全登录"
                )}
              </Button>
            </form>

            {/* 提示信息 */}
            <div className="mt-6 text-center">
              <p className="text-xs text-neutral-500">
                首次使用？输入任意用户名和密码即可登录
              </p>
            </div>
          </div>

          {/* 底部装饰 */}
          <div className="px-8 py-3 bg-white/5 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>© 2025 Exca-Teleop</span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                服务在线
              </span>
            </div>
          </div>
        </div>

        {/* 底部链接 */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-neutral-400">
            WebRTC 实时视频传输 · 低延迟控制
          </p>
        </div>
      </div>
    </div>
  )
}



