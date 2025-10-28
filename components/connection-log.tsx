import { LogEntry } from "@/hooks/useWebRTC"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ConnectionLogProps {
  logs: LogEntry[]
}

export function ConnectionLog({ logs }: ConnectionLogProps) {
  return (
    <ScrollArea className="h-48 w-full rounded-md bg-gray-950 border border-gray-800">
      <div className="p-3 font-mono text-xs space-y-1">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">暂无日志</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`${
                log.type === 'success'
                  ? 'text-green-400'
                  : log.type === 'error'
                  ? 'text-red-400'
                  : 'text-blue-400'
              }`}
            >
              <span className="text-gray-500">[{log.time}]</span> {log.message}
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}

