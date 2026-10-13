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
 * Smooth dependency wires. Crossings render as ordinary intersections.
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
    sourceX,
    sourceY,
    targetX,
    targetY,
  } = props;

  const points = data?.points ?? [];
  const geometry = useMemo(
    () => buildDependencyPathGeometry(
      points.length >= 2
        ? points
        : [{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }],
      [],
    ),
    [points, sourceX, sourceY, targetX, targetY],
  );

  if (!geometry.path) return null;

  const stroke = String(style?.stroke ?? "#6d94c7");
  const strokeWidth = Number(style?.strokeWidth ?? 2);
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
