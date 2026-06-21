"use client"

import ReactECharts from "echarts-for-react"

interface FunnelChartProps {
  data: Array<{ name: string; value: number }>
}

export function FunnelChart({ data }: FunnelChartProps) {
  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}",
      backgroundColor: "rgba(13, 19, 38, 0.9)",
      borderColor: "rgba(0, 229, 255, 0.3)",
      textStyle: { color: "#E8EDF5" },
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
          formatter: "{b}\n{c}",
          color: "#000000",
          fontSize: 13,
          fontWeight: "bold",
        },
        itemStyle: {
          borderColor: "#0A0E1A",
          borderWidth: 2,
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: {
            color: index === 0
              ? "#00E5FF"
              : index === 1
              ? "#7C4DFF"
              : index === 2
              ? "#00FFA3"
              : "#FFB300",
          },
        })),
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: "300px" }} />
}
