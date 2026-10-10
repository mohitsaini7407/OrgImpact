import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";

export type GraphPort = { id: string; top: number; side: "left" | "right" | "top" | "bottom" };

export type GraphEntityNodeData = {
  label: ReactNode;
  sourceHandles: GraphPort[];
  targetHandles: GraphPort[];
};

export default function GraphEntityNode({ data }: NodeProps<Node<GraphEntityNodeData>>) {
  const hiddenPortStyle = {
    width: 2,
    height: 2,
    opacity: 0,
    border: 0,
    background: "transparent",
    pointerEvents: "none" as const,
  };
  const positionBySide = {
    left: Position.Left,
    right: Position.Right,
    top: Position.Top,
    bottom: Position.Bottom,
  };
  const portStyle = (side: GraphPort["side"], offset: number) =>
    side === "left" || side === "right" ? { top: offset } : { left: offset };

  return (
    <>
      {data.label}
      {data.targetHandles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={positionBySide[handle.side]}
          isConnectable={false}
          style={{ ...hiddenPortStyle, ...portStyle(handle.side, handle.top) }}
        />
      ))}
      {data.sourceHandles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={positionBySide[handle.side]}
          isConnectable={false}
          style={{ ...hiddenPortStyle, ...portStyle(handle.side, handle.top) }}
        />
      ))}
    </>
  );
}
