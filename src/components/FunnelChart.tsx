"use client"

import ReactECharts from "echarts-for-react"

/** 从 DOM 读取 CSS 变量的实际值 */
function cssVar(name: string): string {
  if (typeof window === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

interface FunnelChartProps {
  data: Array<{ name: string; value: number; rate?: number }>
  showRate?: boolean
}

export function FunnelChart({ data, showRate = false }: FunnelChartProps) {
  const c = {
    bg: cssVar("--background-secondary"),
    fg: cssVar("--foreground"),
    primary: cssVar("--primary"),
    accent: cssVar("--accent"),
    success: cssVar("--success"),
    warning: cssVar("--warning"),
  }

  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}",
      backgroundColor: c.bg,
      borderColor: c.primary,
      textStyle: { color: c.fg },
    },
    series: [
      {
        name: "客户漏斗",
        type: "funnel",
        left: "10%",
        top: 60,
        bottom: 60,
        width: "80%",
        min: 0,
        max: Math.max(...data.map((d) => d.value), 1),
        minSize: "0%",
        maxSize: "100%",
        sort: "descending",
        gap: 4,
        label: {
          show: true,
          position: "inside",
          formatter: (params: any) => {
            const rate = params.data.rate
            return showRate && rate !== undefined
              ? `${params.name}\n${params.value} (${rate}%)`
              : `${params.name}\n${params.value}`
          },
          color: c.bg,
          fontSize: 13,
          fontWeight: "bold",
        },
        itemStyle: {
          borderColor: c.bg,
          borderWidth: 2,
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: {
            color: [c.primary, c.accent, c.success, c.warning][index % 4],
          },
        })),
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: "300px" }} />
}
