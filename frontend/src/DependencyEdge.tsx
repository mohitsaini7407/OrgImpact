import { EdgeLabelRenderer, type Edge, type EdgeProps } from "@xyflow/react";
import { useMemo } from "react";
import { buildDependencyPathGeometry, type Point } from "./graphRelationships";

type DependencyEdgeData = {
  points?: Point[];
  crossings?: Point[];
  labelPosition?: Point;
  relationshipType?: string;
  relationshipLabel?: string;
  relationshipIds?: string[];
  forwardRelationshipTypes?: string[];
  reverseRelationshipTypes?: string[];
  bidirectional?: boolean;
  showLabel?: boolean;
};

type DependencyEdgeModel = Edge<DependencyEdgeData, "dependency">;

/**
 * Smooth dependency wires. Crossings are rendered as small bridge arcs, while
 * the path beneath each arc is interrupted so wires never look connected.
 * Geometry stays in graph coordinates, so wires follow node drag and viewport
 * movement without DOM measurements.
 */
export default function DependencyEdge(props: EdgeProps<DependencyEdgeModel>) {
  const {
    id,
    data,
    markerStart,
    markerEnd,
    style,
    selected,
  } = props;

  const points = data?.points ?? [];
  const crossings = data?.crossings ?? [];
  let bridgeSeed = 0;
  for (let index = 0; index < id.length; index += 1) bridgeSeed = (bridgeSeed * 31 + id.charCodeAt(index)) >>> 0;
  const geometry = useMemo(
    () => buildDependencyPathGeometry(points, crossings, 10, bridgeSeed % 2 ? 1 : 0),
    [points, crossings, bridgeSeed],
  );

  if (!geometry.path) return null;

  const stroke = String(style?.stroke ?? "#6d94c7");
  const strokeWidth = Number(style?.strokeWidth ?? 2);
  const bridgePaths = geometry.bridges;
  const labelPosition = data?.labelPosition;
  const relationshipLabel = data?.relationshipLabel ?? data?.relationshipType;
  const showLabel = Boolean(data?.showLabel && relationshipLabel && labelPosition);

  return (
    <>
      <path
        id={`${id}-path`}
        className="react-flow__edge-path dependency-edge-path"
        d={geometry.path}
        fill="none"
        style={{
          ...style,
          stroke,
          strokeWidth: selected ? strokeWidth + 0.6 : strokeWidth,
        }}
        strokeDasharray={style?.strokeDasharray}
        markerStart={markerStart}
        markerEnd={markerEnd}
        vectorEffect="non-scaling-stroke"
      />
      {bridgePaths.map((bridge, index) => (
        <g key={`${id}-bridge-${index}`} className="dependency-edge-bridge" pointerEvents="none">
          <path
            d={bridge.path}
            fill="none"
            stroke="var(--map-bg, #071120)"
            strokeWidth={strokeWidth + 6}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={bridge.path}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {showLabel && labelPosition && (
        <EdgeLabelRenderer>
          <div
            className="graph-relationship-label nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelPosition.x}px, ${labelPosition.y}px)`,
              pointerEvents: "none",
            }}
          >
            {relationshipLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
