"use client"

import { useCallback, useState, useEffect } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { StageNode, type StageNodeData } from "./StageNode"
import { Plus, Phone, MessageCircle, MapPin, Mail } from "lucide-react"

const nodeTypes = {
  stage: StageNode,
}

const touchpointOptions = [
  { type: "phone" as const, icon: Phone, label: "电话" },
  { type: "wechat" as const, icon: MessageCircle, label: "微信" },
  { type: "visit" as const, icon: MapPin, label: "到店" },
  { type: "sms" as const, icon: Mail, label: "短信" },
]

interface SopStage {
  id: string
  label: string
  description?: string
  touchpointType: "phone" | "wechat" | "visit" | "sms"
  scriptTemplate?: string
  delayDays: number
  positionX: number
  positionY: number
}

interface SopEditorProps {
  initialStages?: SopStage[]
  onChange?: (stages: SopStage[]) => void
  readOnly?: boolean
}

export function SopEditor({ initialStages = [], onChange, readOnly = false }: SopEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])
  const [showAddMenu, setShowAddMenu] = useState(false)

  useEffect(() => {
    if (initialStages.length > 0) {
      const flowNodes: Node[] = initialStages.map((stage) => ({
        id: stage.id,
        type: "stage",
        position: { x: stage.positionX, y: stage.positionY },
        data: {
          label: stage.label,
          description: stage.description,
          touchpointType: stage.touchpointType,
          scriptTemplate: stage.scriptTemplate,
          delayDays: stage.delayDays,
        },
      }))

      const flowEdges: Edge[] = []
      for (let i = 0; i < initialStages.length - 1; i++) {
        flowEdges.push({
          id: `e-${initialStages[i].id}-${initialStages[i + 1].id}`,
          source: initialStages[i].id,
          target: initialStages[i + 1].id,
          animated: true,
          style: { stroke: "var(--primary)", strokeWidth: 2 },
        })
      }

      setNodes(flowNodes)
      setEdges(flowEdges)
    }
  }, [])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "var(--primary)", strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const addStage = (touchpointType: "phone" | "wechat" | "visit" | "sms") => {
    const newId = `stage-${Date.now()}`
    const newNode: Node = {
      id: newId,
      type: "stage",
      position: { x: 250, y: (nodes.length + 1) * 150 },
      data: {
        label: `新阶段 ${nodes.length + 1}`,
        touchpointType,
        delayDays: nodes.length * 7,
      },
    }

    setNodes((nds) => {
      if (nds.length > 0) {
        const lastNode = nds[nds.length - 1]
        setEdges((eds) => [
          ...eds,
          {
            id: `e-${lastNode.id}-${newId}`,
            source: lastNode.id,
            target: newId,
            animated: true,
            style: { stroke: "var(--primary)", strokeWidth: 2 },
          },
        ])
      }
      return [...nds, newNode]
    })

    setShowAddMenu(false)
  }

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }

  useEffect(() => {
    if (onChange) {
      const stages: SopStage[] = nodes.map((node) => ({
        id: node.id,
        label: (node.data as StageNodeData).label,
        description: (node.data as StageNodeData).description,
        touchpointType: (node.data as StageNodeData).touchpointType,
        scriptTemplate: (node.data as StageNodeData).scriptTemplate,
        delayDays: (node.data as StageNodeData).delayDays,
        positionX: node.position.x,
        positionY: node.position.y,
      }))
      onChange(stages)
    }
  }, [nodes, onChange])

  return (
    <div className="relative h-[500px] w-full rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            onDelete: deleteNode,
          },
          draggable: !readOnly,
        }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--border)"
        />
        <Controls
          className="!bg-[var(--card)] !border-[var(--border)] !rounded-lg"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-[var(--card)] !border-[var(--border)] !rounded-lg"
          nodeColor="var(--primary)"
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>

      {!readOnly && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              <Plus className="w-4 h-4" />
              添加阶段
            </button>

            {showAddMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                {touchpointOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => addStage(option.type)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {nodes.length === 0 && !readOnly && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[var(--foreground-secondary)]">点击「添加阶段」开始构建 SOP 流程</p>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">拖拽节点调整位置，拖拽连线建立关系</p>
          </div>
        </div>
      )}
    </div>
  )
}
