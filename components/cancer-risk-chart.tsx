"use client"

import { PieChart } from "./pie-chart"
import { CheckCircle } from "lucide-react"

interface CancerRiskChartProps {
  cancerRisk: number // percentage 0-100
  melanoma: number // 0-1
  bcc: number // 0-1
  labels: {
    melanoma: string
    bcc: string
    nonCancerous: string
    noCancerRisk: string
    cancerRisk: string
  }
}

export function CancerRiskChart({ cancerRisk, melanoma, bcc, labels }: CancerRiskChartProps) {
  const showNoRisk = cancerRisk < 5

  if (showNoRisk) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-32 h-32 rounded-full bg-sky-50 border-4 border-sky-200 flex items-center justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-sky-500" />
        </div>
        <p className="text-2xl font-bold text-black">{labels.noCancerRisk}</p>
        <p className="text-sm text-gray-600 mt-2">
          {labels.cancerRisk}: {cancerRisk.toFixed(1)}%
        </p>
      </div>
    )
  }

  // Show pie chart when there's cancer risk
  const data = [
    { label: labels.melanoma, value: melanoma * 100, color: "#E57373" }, // soft red
    { label: labels.bcc, value: bcc * 100, color: "#FFAB91" }, // soft orange
    { label: labels.nonCancerous, value: (1 - melanoma - bcc) * 100, color: "#90CAF9" }, // soft blue
  ]

  return (
    <div className="flex flex-col items-center">
      <PieChart data={data} size={180} />
      <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-bold text-black text-center">
          {labels.cancerRisk}: {cancerRisk.toFixed(1)}%
        </p>
      </div>
    </div>
  )
}
