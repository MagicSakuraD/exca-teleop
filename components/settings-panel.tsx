"use client"

import type React from "react"
import { X, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  onLogout: () => void
  excavatorName: string
  showConnectionLog?: boolean
  connectionLogs?: React.ReactNode
}

export function SettingsPanel({
  open,
  onOpenChange,
  username,
  onLogout,
  excavatorName,
  showConnectionLog = false,
  connectionLogs,
}: SettingsPanelProps) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)} 
      />

      {/* Settings Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-black/50 backdrop-blur-2xl border-l border-white/20 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
            <h2 className="text-2xl font-semibold text-neutral-200">用户中心</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 space-y-8 overflow-y-auto">
            {/* User Info & Device */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-purple-500/40 to-blue-700/40 w-12 h-12 flex items-center justify-center rounded-full">
                  <User className="h-6 w-6 text-white/80" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{username}</div>
                  <div className="text-sm text-neutral-400">
                    已连接设备: <span className="font-medium text-neutral-300">{excavatorName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Log */}
            {showConnectionLog && connectionLogs && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-white">连接日志</Label>
                <div className="bg-black/40 p-4 rounded-lg border border-white/10 max-h-96 overflow-y-auto font-mono text-sm">
                  {connectionLogs}
                </div>
              </div>
            )}
          </div>

          {/* Footer with Logout Button */}
          <div className="p-6 border-t border-white/10 flex-shrink-0">
            <Button
              variant="outline"
              onClick={onLogout}
              className="w-full h-12 bg-white/5 hover:bg-red-500/20 border-red-500/30 text-red-400 hover:text-red-300 transition-colors rounded-lg"
            >
              <LogOut className="h-5 w-5 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
 