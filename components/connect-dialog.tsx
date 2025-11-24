"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Zap } from "lucide-react"

interface ConnectDialogProps {
  open: boolean
  onConnect: (excavatorName: string) => void
}

export function ConnectDialog({ open, onConnect }: ConnectDialogProps) {
  const [excavatorName, setExcavatorName] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = () => {
    if (excavatorName.trim()) {
      setIsConnecting(true)
      // Simulate a small delay for user feedback, then call the parent connect handler
      setTimeout(() => {
        onConnect(excavatorName)
        // No need to set isConnecting to false here, as the dialog will be unmounted
      }, 500)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect()
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900/80 backdrop-blur-xl border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="text-yellow-400" />
            连接到设备
          </DialogTitle>
          <DialogDescription>
            请输入您要远程控制的设备ID以建立连接。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="excavator-id" className="text-right text-gray-300">
              设备ID
            </Label>
            <Input
              id="excavator-id"
              value={excavatorName}
              onChange={(e) => setExcavatorName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="col-span-3 bg-gray-800 border-gray-600 focus:border-yellow-500 focus:ring-yellow-500/30"
              placeholder="例如：EXCA-001"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleConnect}
            disabled={isConnecting || !excavatorName.trim()}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                连接中...
              </>
            ) : (
              "建立连接"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
