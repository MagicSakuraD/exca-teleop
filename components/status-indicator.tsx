import { Circle } from "lucide-react"

type ConnectionState = "connected" | "connecting" | "disconnected"

interface StatusIndicatorProps {
  state: ConnectionState
}

export function StatusIndicator({ state }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (state) {
      case "connected":
        return {
          color: "text-green-400",
          label: "在线",
          sublabel: "LIVE",
          animate: false,
        }
      case "connecting":
        return {
          color: "text-yellow-400",
          label: "连接中",
          sublabel: "CONNECTING",
          animate: true,
        }
      case "disconnected":
        return {
          color: "text-red-400",
          label: "离线",
          sublabel: "OFFLINE",
          animate: true,
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex items-center gap-2">
      <Circle className={`h-3 w-3 fill-current ${config.color} ${config.animate ? "animate-pulse" : ""}`} />
      <div className="flex flex-col">
        <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{config.sublabel}</span>
      </div>
    </div>
  )
}
