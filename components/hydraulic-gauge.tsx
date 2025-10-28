interface HydraulicGaugeProps {
  value: number
  max: number
}

export function HydraulicGauge({ value, max }: HydraulicGaugeProps) {
  const percentage = (value / max) * 100

  const getColor = () => {
    if (percentage < 30) return "bg-red-500"
    if (percentage < 50) return "bg-yellow-500"
    return "bg-blue-500"
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-32 h-4 bg-gray-800 rounded-full overflow-hidden border border-white/20">
        <div
          className={`h-full ${getColor()} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="font-mono text-2xl font-bold text-white">
        {value}
        <span className="text-sm text-gray-400 ml-1">bar</span>
      </div>
    </div>
  )
}
