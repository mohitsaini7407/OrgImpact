export type GraphRelationship = {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
};

export type GraphRelationshipDisplay = GraphRelationship & {
  isIncoming: boolean;
  parallelIndex: number;
  parallelCount: number;
  sourceHandle: string;
  targetHandle: string;
  sourceSide: GraphPortSide;
  targetSide: GraphPortSide;
  sourcePortTop: number;
  targetPortTop: number;
  points: Point[];
  crossings: Point[];
  labelPosition?: Point;
};

export type GraphRelationshipVisualDisplay = GraphRelationshipDisplay & {
  bidirectional: boolean;
  relationshipIds: string[];
  forwardRelationshipTypes: string[];
  reverseRelationshipTypes: string[];
  relationshipLabel: string;
  sourceArrowIncoming: boolean;
  targetArrowIncoming: boolean;
};

export type Point = { x: number; y: number };
export type GraphPortSide = "left" | "right" | "top" | "bottom";
export type GraphNodePosition = Point & { id: string; layer: number; width?: number; height?: number };

export function getGraphNodeDimensions(description?: string | null, portCount = 0) {
  const text = description?.trim() ?? "";
  const width = Math.min(420, Math.max(280, 280 + Math.max(0, text.length - 50) * 0.8));
  const availableTextWidth = Math.max(1, width - 64);
  const estimatedTextWidth = Array.from(text).reduce(
    (total, character) => total + (character.length > 1 ? 16 : /[^\u0000-\u00ff]/u.test(character) ? 12 : 8),
    0,
  );
  const descriptionLines = text ? Math.ceil(estimatedTextWidth / availableTextWidth) : 0;
  const contentHeight = Math.max(170, 148 + descriptionLines * 18);
  const portHeight = (Math.max(0, portCount) + 1) * 22;

  return { width, height: Math.max(contentHeight, portHeight) };
}

const portOutward: Record<GraphPortSide, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

function sampleCubicWire(start: Point, control1: Point, control2: Point, end: Point): Point[] {
  const controlLength = Math.hypot(control1.x - start.x, control1.y - start.y)
    + Math.hypot(control2.x - control1.x, control2.y - control1.y)
    + Math.hypot(end.x - control2.x, end.y - control2.y);
  const steps = Math.max(8, Math.min(4096, Math.ceil(controlLength / 8)));
  const points: Point[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const inverse = 1 - t;
    points.push({
      x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * control1.x + 3 * inverse * t ** 2 * control2.x + t ** 3 * end.x,
      y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * control1.y + 3 * inverse * t ** 2 * control2.y + t ** 3 * end.y,
    });
  }
  return points;
}

function sampleRoundedRoute(points: Point[], radius = 18): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]];
  const appendLine = (from: Point, to: Point) => {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(length / 6));
    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      result.push({ x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio });
    }
  };

  let cursor = points[0];
  for (let index = 1; index < points.length - 1; index += 1) {
    const corner = points[index];
    const next = points[index + 1];
    const incomingLength = Math.hypot(corner.x - points[index - 1].x, corner.y - points[index - 1].y);
    const outgoingLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    if (incomingLength < 0.01 || outgoingLength < 0.01) continue;
    const incoming = { x: (corner.x - points[index - 1].x) / incomingLength, y: (corner.y - points[index - 1].y) / incomingLength };
    const outgoing = { x: (next.x - corner.x) / outgoingLength, y: (next.y - corner.y) / outgoingLength };
    const turn = incoming.x * outgoing.y - incoming.y * outgoing.x;
    const alignment = incoming.x * outgoing.x + incoming.y * outgoing.y;
    if (Math.abs(turn) < 0.01 || alignment < 0) continue;

    const cornerRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2);
    const before = { x: corner.x - incoming.x * cornerRadius, y: corner.y - incoming.y * cornerRadius };
    const after = { x: corner.x + outgoing.x * cornerRadius, y: corner.y + outgoing.y * cornerRadius };
    appendLine(cursor, before);
    const curveSteps = Math.max(4, Math.ceil((incomingLength + outgoingLength) / 12));
    for (let step = 1; step <= curveSteps; step += 1) {
      const t = step / curveSteps;
      const inverse = 1 - t;
      result.push({
        x: inverse ** 2 * before.x + 2 * inverse * t * corner.x + t ** 2 * after.x,
        y: inverse ** 2 * before.y + 2 * inverse * t * corner.y + t ** 2 * after.y,
      });
    }
    cursor = after;
  }
  appendLine(cursor, points[points.length - 1]);
  return result.filter((point, index) => index === 0
    || Math.hypot(point.x - result[index - 1].x, point.y - result[index - 1].y) > 0.05);
}

function gridCellsForSegment(start: Point, end: Point, cellSize: number): string[] {
  let x = Math.floor(start.x / cellSize);
  let y = Math.floor(start.y / cellSize);
  const endX = Math.floor(end.x / cellSize);
  const endY = Math.floor(end.y / cellSize);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const stepX = Math.sign(deltaX);
  const stepY = Math.sign(deltaY);
  const tDeltaX = stepX ? cellSize / Math.abs(deltaX) : Infinity;
  const tDeltaY = stepY ? cellSize / Math.abs(deltaY) : Infinity;
  let tMaxX = stepX > 0 ? ((x + 1) * cellSize - start.x) / deltaX : stepX < 0 ? (x * cellSize - start.x) / deltaX : Infinity;
  let tMaxY = stepY > 0 ? ((y + 1) * cellSize - start.y) / deltaY : stepY < 0 ? (y * cellSize - start.y) / deltaY : Infinity;
  const cells = new Set<string>();
  const add = (cellX: number, cellY: number) => cells.add(cellX + ":" + cellY);
  add(x, y);
  let steps = 0;
  while ((x !== endX || y !== endY) && steps < 100000) {
    steps += 1;
    if (Math.abs(tMaxX - tMaxY) < 1e-10) {
      add(x + stepX, y);
      add(x, y + stepY);
      x += stepX;
      y += stepY;
      tMaxX += tDeltaX;
      tMaxY += tDeltaY;
    } else if (tMaxX < tMaxY) {
      x += stepX;
      tMaxX += tDeltaX;
    } else {
      y += stepY;
      tMaxY += tDeltaY;
    }
    add(x, y);
  }
  return [...cells];
}

function segmentIntersectsBox(start: Point, end: Point, box: { left: number; right: number; top: number; bottom: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let minimum = 0;
  let maximum = 1;
  for (const [p, q] of [
    [-dx, start.x - box.left],
    [dx, box.right - start.x],
    [-dy, start.y - box.top],
    [dy, box.bottom - start.y],
  ]) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return true;
}

export function filterValidGraphRelationships(
  nodes: Array<{ id: string }>,
  relationships: GraphRelationship[],
) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = relationships.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  const invalidCount = relationships.length - edges.length;
  return {
    edges,
    warnings: invalidCount
      ? [`${invalidCount} relationship${invalidCount === 1 ? " has" : "s have"} a missing endpoint and ${invalidCount === 1 ? "was" : "were"} omitted from the graph.`]
      : [],
  };
}

export function layoutGraphNodes(
  nodes: Array<{ id: string; name: string; width?: number; height?: number }>,
  relationships: GraphRelationship[],
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const byName = [...nodes].sort((left, right) => left.name.localeCompare(right.name));
  const outgoingEdges = new Map(nodes.map((node) => [node.id, [] as GraphRelationship[]]));
  relationships.forEach((edge) => {
    if (byId.has(edge.source) && byId.has(edge.target)) outgoingEdges.get(edge.source)?.push(edge);
  });
  outgoingEdges.forEach((edges) => edges.sort((left, right) => {
    const targetDifference = (byId.get(left.target)?.name ?? "").localeCompare(byId.get(right.target)?.name ?? "");
    return targetDifference || left.id.localeCompare(right.id);
  }));
  const incomingCounts = new Map(nodes.map((node) => [node.id, 0]));
  const outgoingCounts = new Map(nodes.map((node) => [node.id, 0]));
  relationships.forEach((edge) => {
    if (!byId.has(edge.source) || !byId.has(edge.target)) return;
    outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) ?? 0) + 1);
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  });
  const nodeHeights = new Map(nodes.map((node) => {
    const ports = Math.max(incomingCounts.get(node.id) ?? 0, outgoingCounts.get(node.id) ?? 0);
    return [node.id, Math.max(node.height ?? 112, (ports + 1) * 22)] as const;
  }));

  // Mark DFS back-edges as feedback routes. Removing those edges produces a
  // DAG for the layered layout while leaving every original relationship intact.
  const visitState = new Map<string, 0 | 1 | 2>();
  const feedbackEdgeIds = new Set<string>();
  for (const node of byName) {
    if (visitState.has(node.id)) continue;
    visitState.set(node.id, 1);
    const stack = [{ nodeId: node.id, nextEdgeIndex: 0 }];
    while (stack.length) {
      const current = stack[stack.length - 1];
      const edges = outgoingEdges.get(current.nodeId) ?? [];
      if (current.nextEdgeIndex >= edges.length) {
        visitState.set(current.nodeId, 2);
        stack.pop();
        continue;
      }
      const edge = edges[current.nextEdgeIndex++];
      const state = visitState.get(edge.target) ?? 0;
      if (state === 0) {
        visitState.set(edge.target, 1);
        stack.push({ nodeId: edge.target, nextEdgeIndex: 0 });
      } else if (state === 1) {
        feedbackEdgeIds.add(edge.id);
      }
    }
  }

  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
  const incoming = new Map(nodes.map((node) => [node.id, [] as string[]]));
  relationships.forEach((edge) => {
    if (!byId.has(edge.source) || !byId.has(edge.target) || feedbackEdgeIds.has(edge.id)) return;
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  });

  const layers = new Map<string, number>();
  const queue = nodes
    .filter((node) => indegree.get(node.id) === 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((node) => node.id);
  queue.forEach((id) => layers.set(id, 0));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const sourceId = queue[cursor];
    const nextLayer = (layers.get(sourceId) ?? 0) + 1;
    for (const targetId of outgoing.get(sourceId) ?? []) {
      layers.set(targetId, Math.max(layers.get(targetId) ?? 0, nextLayer));
      indegree.set(targetId, (indegree.get(targetId) ?? 1) - 1);
      if (indegree.get(targetId) === 0) queue.push(targetId);
    }
  }

  // Defensive fallback for a malformed cyclic transformation: keep layout
  // bounded even if an edge escaped feedback classification.
  const unresolvedLayer = Math.max(-1, ...layers.values()) + 1;
  nodes.forEach((node) => {
    if (!layers.has(node.id)) layers.set(node.id, unresolvedLayer);
  });

  const layerGroups = new Map<number, Array<{ id: string; name: string }>>();
  nodes.forEach((node) => {
    const layer = layers.get(node.id) ?? 0;
    const group = layerGroups.get(layer) ?? [];
    group.push(node);
    layerGroups.set(layer, group);
  });
  layerGroups.forEach((group) => group.sort((left, right) => left.name.localeCompare(right.name)));

  const maxLayer = Math.max(0, ...layerGroups.keys());
  const neighbors = (nodeId: string, direction: "incoming" | "outgoing") =>
    direction === "incoming" ? incoming.get(nodeId) ?? [] : outgoing.get(nodeId) ?? [];
  const ranks = () => new Map([...layerGroups.values()].flatMap((group) => group.map((node, index) => [node.id, index] as const)));
  for (let pass = 0; pass < 4; pass += 1) {
    let rankById = ranks();
    for (let layer = 1; layer <= maxLayer; layer += 1) {
      const group = layerGroups.get(layer) ?? [];
      const priorOrder = new Map(group.map((node, index) => [node.id, index]));
      group.sort((left, right) => {
        const average = (nodeId: string) => {
          const incoming = neighbors(nodeId, "incoming").filter((id) => (layers.get(id) ?? 0) < layer);
          return incoming.length ? incoming.reduce((sum, id) => sum + (rankById.get(id) ?? 0), 0) / incoming.length : (priorOrder.get(nodeId) ?? 0);
        };
        return average(left.id) - average(right.id) || left.name.localeCompare(right.name);
      });
      rankById = ranks();
    }
    for (let layer = maxLayer - 1; layer >= 0; layer -= 1) {
      const group = layerGroups.get(layer) ?? [];
      const priorOrder = new Map(group.map((node, index) => [node.id, index]));
      group.sort((left, right) => {
        const average = (nodeId: string) => {
          const outgoingIds = neighbors(nodeId, "outgoing").filter((id) => (layers.get(id) ?? 0) > layer);
          return outgoingIds.length ? outgoingIds.reduce((sum, id) => sum + (rankById.get(id) ?? 0), 0) / outgoingIds.length : (priorOrder.get(nodeId) ?? 0);
        };
        return average(left.id) - average(right.id) || left.name.localeCompare(right.name);
      });
      rankById = ranks();
    }
  }

  // Forward shortcuts don't reserve a global lane; routing finds a local path
  // around obstacles after the node positions have been chosen.
  const routeGroupCounts = new Map<string, number>();
  relationships.forEach((edge) => {
    if (feedbackEdgeIds.has(edge.id)) return;
    const sourceLayer = layers.get(edge.source);
    const targetLayer = layers.get(edge.target);
    if (sourceLayer === undefined || targetLayer === undefined || targetLayer !== sourceLayer + 1) return;
    const key = `${sourceLayer}:${targetLayer}`;
    routeGroupCounts.set(key, (routeGroupCounts.get(key) ?? 0) + 1);
  });
  const gapLoads = new Map<number, number>();
  const layerWidths = new Map<number, number>();
  layerGroups.forEach((group, layer) => {
    layerWidths.set(layer, Math.max(230, ...group.map((node) => byId.get(node.id)?.width ?? 230)));
  });
  routeGroupCounts.forEach((count, key) => {
    const sourceLayer = Number(key.split(":")[0]);
    gapLoads.set(sourceLayer, Math.max(gapLoads.get(sourceLayer) ?? 0, count));
  });
  const layerX = new Map<number, number>([[0, 80]]);
  for (let layer = 0; layer < maxLayer; layer += 1) {
    const edgeSlots = gapLoads.get(layer) ?? 1;
    const layerWidth = layerWidths.get(layer) ?? 230;
    layerX.set(layer + 1, (layerX.get(layer) ?? 80) + Math.max(430, layerWidth + 160 + (edgeSlots - 1) * 24));
  }
  const positions = new Map<string, GraphNodePosition>();
  layerGroups.forEach((group, layer) => {
    let top = 80;
    group.forEach((node) => {
      const height = nodeHeights.get(node.id) ?? 112;
      positions.set(node.id, {
        id: node.id,
        layer,
        x: layerX.get(layer) ?? layer * 320 + 80,
        y: top,
        width: byId.get(node.id)?.width ?? 230,
        height,
      });
      top += height + 100;
    });
  });
  return positions;
}

export function routeIntersection(a: Point, b: Point, c: Point, d: Point): Point | null {
  const horizontal = (p: Point, q: Point) => Math.abs(p.y - q.y) < 0.01;
  const vertical = (p: Point, q: Point) => Math.abs(p.x - q.x) < 0.01;
  const between = (value: number, one: number, two: number) => value > Math.min(one, two) + 12 && value < Math.max(one, two) - 12;

  if (horizontal(a, b) && vertical(c, d)) {
    return between(c.x, a.x, b.x) && between(a.y, c.y, d.y) ? { x: c.x, y: a.y } : null;
  }
  if (vertical(a, b) && horizontal(c, d)) {
    return between(a.x, c.x, d.x) && between(c.y, a.y, b.y) ? { x: a.x, y: c.y } : null;
  }
  return null;
}

export function buildDependencyPathGeometry(
  points: Point[],
  crossings: Point[],
  radius = 10,
  bridgeSweep: 0 | 1 = 1,
) {
  if (points.length < 2) return { path: "", bridges: [] as Array<{ path: string }> };
  const safeRadius = Math.max(2, Math.min(radius, 12));
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y));
  }
  const totalLength = cumulative.at(-1) ?? 0;
  const pointAt = (distance: number) => {
    const safeDistance = Math.max(0, Math.min(totalLength, distance));
    let index = 1;
    while (index < cumulative.length - 1 && cumulative[index] < safeDistance) index += 1;
    const segmentLength = cumulative[index] - cumulative[index - 1];
    const ratio = segmentLength > 0 ? (safeDistance - cumulative[index - 1]) / segmentLength : 0;
    const start = points[index - 1];
    const end = points[index];
    return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
  };
  const crossingsByDistance = crossings.flatMap((crossing) => {
    let best = { distance: 0, error: Infinity };
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const segmentLengthSquared = dx * dx + dy * dy;
      if (segmentLengthSquared < 0.001) continue;
      const ratio = Math.max(0, Math.min(1, ((crossing.x - start.x) * dx + (crossing.y - start.y) * dy) / segmentLengthSquared));
      const projected = { x: start.x + dx * ratio, y: start.y + dy * ratio };
      const error = Math.hypot(projected.x - crossing.x, projected.y - crossing.y);
      if (error < best.error) best = { distance: cumulative[index - 1] + Math.sqrt(segmentLengthSquared) * ratio, error };
    }
    return best.error <= 2 ? [best.distance] : [];
  }).sort((left, right) => left - right);

  const uniqueCrossingDistances = crossingsByDistance.filter((distance, index) =>
    index === 0 || distance - crossingsByDistance[index - 1] > 2,
  );
  const bridgeEntries = uniqueCrossingDistances.flatMap((distance, index) => {
    if (distance <= 4 || distance >= totalLength - 4) return [];
    const previousGap = index > 0 ? distance - uniqueCrossingDistances[index - 1] : Infinity;
    const nextGap = index < uniqueCrossingDistances.length - 1 ? uniqueCrossingDistances[index + 1] - distance : Infinity;
    const bridgeRadius = Math.max(2, Math.min(safeRadius, previousGap / 2 - 1, nextGap / 2 - 1));
    return [{ distance, radius: bridgeRadius }];
  });
  const bridges: Array<{ path: string }> = [];
  let path = "M " + points[0].x + " " + points[0].y;
  let cursorDistance = 0;
  const appendUntil = (endDistance: number) => {
    for (let index = 1; index < points.length; index += 1) {
      if (cumulative[index] <= cursorDistance + 0.01 || cumulative[index] >= endDistance - 0.01) continue;
      path += " L " + points[index].x + " " + points[index].y;
    }
    const endpoint = pointAt(endDistance);
    path += " L " + endpoint.x + " " + endpoint.y;
  };

  for (const { distance, radius: bridgeRadius } of bridgeEntries) {
    const beforeDistance = distance - bridgeRadius;
    const afterDistance = distance + bridgeRadius;
    const before = pointAt(beforeDistance);
    const after = pointAt(afterDistance);
    appendUntil(beforeDistance);
    path += " M " + after.x + " " + after.y;
    bridges.push({
      path: "M " + before.x + " " + before.y + " A " + bridgeRadius + " " + bridgeRadius + " 0 0 " + bridgeSweep + " " + after.x + " " + after.y,
    });
    cursorDistance = afterDistance;
  }
  appendUntil(totalLength);
  return { path, bridges };
}
export function detectEdgeCrossings(edges: Array<Pick<GraphRelationshipDisplay, "id" | "source" | "target" | "points">>) {
  const crossings = new Map(edges.map((edge) => [edge.id, [] as Point[]]));
  type Segment = {
    edgeId: string;
    start: Point;
    end: Point;
    startDistance: number;
    edgeLength: number;
  };
  const segments: Segment[] = [];
  for (const edge of edges) {
    const lengths = edge.points.slice(1).map((point, index) => Math.hypot(point.x - edge.points[index].x, point.y - edge.points[index].y));
    const edgeLength = lengths.reduce((total, length) => total + length, 0);
    let distance = 0;
    edge.points.slice(1).forEach((end, index) => {
      const start = edge.points[index];
      const length = lengths[index];
      if (length > 0.05) segments.push({ edgeId: edge.id, start, end, startDistance: distance, edgeLength });
      distance += length;
    });
  }

  // Index the flattened final routes in a spatial grid. This catches diagonal
  // and curved-wire intersections without comparing every edge pair globally.
  const cellSize = 64;
  const cells = new Map<string, number[]>();
  const candidatePairs = new Set<string>();
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    for (const key of gridCellsForSegment(segment.start, segment.end, cellSize)) {
      const bucket = cells.get(key) ?? [];
      for (const previous of bucket) {
        if (segments[previous].edgeId !== segment.edgeId) {
          candidatePairs.add(previous < index ? previous + ":" + index : index + ":" + previous);
        }
      }
      bucket.push(index);
      cells.set(key, bucket);
    }
  }

  const seenCrossings = new Set<string>();
  for (const pair of candidatePairs) {
    const [firstIndex, secondIndex] = pair.split(":").map(Number);
    const first = segments[firstIndex];
    const second = segments[secondIndex];
    const firstX = first.end.x - first.start.x;
    const firstY = first.end.y - first.start.y;
    const secondX = second.end.x - second.start.x;
    const secondY = second.end.y - second.start.y;
    const denominator = firstX * secondY - firstY * secondX;
    const lengthsProduct = Math.hypot(firstX, firstY) * Math.hypot(secondX, secondY);
    if (lengthsProduct < 0.01 || Math.abs(denominator) / lengthsProduct < 0.002) continue;
    const deltaX = second.start.x - first.start.x;
    const deltaY = second.start.y - first.start.y;
    const firstRatio = (deltaX * secondY - deltaY * secondX) / denominator;
    const secondRatio = (deltaX * firstY - deltaY * firstX) / denominator;
    const epsilon = 0.0001;
    if (firstRatio < -epsilon || firstRatio > 1 + epsilon || secondRatio < -epsilon || secondRatio > 1 + epsilon) continue;
    const point = { x: first.start.x + firstX * firstRatio, y: first.start.y + firstY * firstRatio };
    const firstDistance = first.startDistance + Math.hypot(firstX, firstY) * firstRatio;
    const secondDistance = second.startDistance + Math.hypot(secondX, secondY) * secondRatio;
    // Shared node anchors and arrow tips are not wire crossings.
    if (firstDistance < 20 || first.edgeLength - firstDistance < 20 || secondDistance < 20 || second.edgeLength - secondDistance < 20) continue;

    const bridgeId = first.edgeId.localeCompare(second.edgeId) < 0 ? second.edgeId : first.edgeId;
    const crossingKey = bridgeId + ":" + Math.round(point.x) + ":" + Math.round(point.y);
    if (seenCrossings.has(crossingKey)) continue;
    seenCrossings.add(crossingKey);
    crossings.get(bridgeId)?.push(point);
  }
  return crossings;
}

function routeAroundNodes(
  start: Point,
  end: Point,
  positions: Map<string, GraphNodePosition>,
  existingRoutes: Point[][],
  laneIndex: number,
): Point[] {
  const padding = 12;
  const allObstacles = [...positions.values()].map((node) => ({
    left: node.x - padding,
    right: node.x + (node.width ?? 230) + padding,
    top: node.y - padding,
    bottom: node.y + (node.height ?? 112) + padding,
  }));
  const routeBounds = {
    left: Math.min(start.x, end.x) - padding,
    right: Math.max(start.x, end.x) + padding,
    top: Math.min(start.y, end.y) - padding,
    bottom: Math.max(start.y, end.y) + padding,
  };
  const obstacles = allObstacles.filter((box) => box.right >= routeBounds.left && box.left <= routeBounds.right
    && box.bottom >= routeBounds.top && box.top <= routeBounds.bottom);
  const blocked = (a: Point, b: Point) => allObstacles.some((box) => {
    if (Math.abs(a.y - b.y) < 0.01) {
      return a.y > box.top + 0.01 && a.y < box.bottom - 0.01 && Math.max(a.x, b.x) > box.left + 0.01 && Math.min(a.x, b.x) < box.right - 0.01;
    }
    return a.x > box.left + 0.01 && a.x < box.right - 0.01 && Math.max(a.y, b.y) > box.top + 0.01 && Math.min(a.y, b.y) < box.bottom - 0.01;
  });
  const compact = (path: Point[]) => path.filter((point, index) => {
    if (index === 0 || index === path.length - 1) return true;
    const previous = path[index - 1];
    const next = path[index + 1];
    const continuesVertically = Math.abs(previous.x - point.x) < 0.01 && Math.abs(point.x - next.x) < 0.01;
    const continuesHorizontally = Math.abs(previous.y - point.y) < 0.01 && Math.abs(point.y - next.y) < 0.01;
    return !continuesVertically && !continuesHorizontally;
  }).filter((point, index, points) => index === 0
    || Math.abs(point.x - points[index - 1].x) > 0.01
    || Math.abs(point.y - points[index - 1].y) > 0.01);
  const recentRoutes = existingRoutes.slice(-32);
  const routeCost = (path: Point[]) => {
    let cost = Math.max(0, path.length - 2) * 34;
    for (let i = 0; i < path.length - 1; i += 1) {
      cost += Math.abs(path[i + 1].x - path[i].x) + Math.abs(path[i + 1].y - path[i].y);
      for (const route of recentRoutes) for (let j = 0; j < route.length - 1; j += 1) {
        if (routeIntersection(path[i], path[i + 1], route[j], route[j + 1])) cost += 48;
        const overlaps = (Math.abs(path[i].y - path[i + 1].y) < 0.01
          && Math.abs(route[j].y - route[j + 1].y) < 0.01
          && Math.abs(path[i].y - route[j].y) < 0.01
          && Math.max(Math.min(path[i].x, path[i + 1].x), Math.min(route[j].x, route[j + 1].x)) < Math.min(Math.max(path[i].x, path[i + 1].x), Math.max(route[j].x, route[j + 1].x)))
          || (Math.abs(path[i].x - path[i + 1].x) < 0.01
            && Math.abs(route[j].x - route[j + 1].x) < 0.01
            && Math.abs(path[i].x - route[j].x) < 0.01
            && Math.max(Math.min(path[i].y, path[i + 1].y), Math.min(route[j].y, route[j + 1].y)) < Math.min(Math.max(path[i].y, path[i + 1].y), Math.max(route[j].y, route[j + 1].y)));
        if (overlaps) cost += 80;
      }
    }
    return cost;
  };
  const directRoutes = [
    [start, { x: end.x, y: start.y }, end],
    [start, { x: start.x, y: end.y }, end],
  ].map(compact).filter((path) => path.every((point, index) => index === path.length - 1 || !blocked(point, path[index + 1])));
  if (directRoutes.length) return directRoutes.sort((a, b) => routeCost(a) - routeCost(b))[0];

  const perimeterRoute = () => {
    const sideIndex = Math.floor(laneIndex / 2);
    const bounds = obstacles.reduce((current, box) => ({
      top: Math.min(current.top, box.top),
      bottom: Math.max(current.bottom, box.bottom),
    }), { top: Math.min(start.y, end.y), bottom: Math.max(start.y, end.y) });
    const laneY = laneIndex % 2 === 0
      ? bounds.top - 12 - sideIndex * 22
      : bounds.bottom + 12 + sideIndex * 22;
    return [start, { x: start.x, y: laneY }, { x: end.x, y: laneY }, end];
  };

  // Bound visibility-grid work for large tenants. Direct routes above handle
  // the common case; a dedicated outer lane guarantees a safe route when a
  // large local obstacle set would make per-edge grid search expensive.
  if (obstacles.length > 48) return perimeterRoute();

  const xs = new Set<number>([start.x, end.x]);
  const ys = new Set<number>([start.y, end.y]);
  obstacles.forEach((box) => {
    xs.add(box.left);
    xs.add(box.right);
    ys.add(box.top);
    ys.add(box.bottom);
  });
  const xValues = [...xs].sort((a, b) => a - b);
  const yValues = [...ys].sort((a, b) => a - b);
  const key = (point: Point) => `${point.x},${point.y}`;
  const points = new Map<string, Point>();
  const rows = new Map<number, Point[]>();
  const columns = new Map<number, Point[]>();
  for (const x of xValues) for (const y of yValues) {
    const point = { x, y };
    if (obstacles.some((box) => x > box.left + 0.01 && x < box.right - 0.01 && y > box.top + 0.01 && y < box.bottom - 0.01)) continue;
    points.set(key(point), point);
    const row = rows.get(y) ?? [];
    row.push(point);
    rows.set(y, row);
    const column = columns.get(x) ?? [];
    column.push(point);
    columns.set(x, column);
  }

  const startKey = key(start);
  const endKey = key(end);
  if (!points.has(startKey) || !points.has(endKey)) return perimeterRoute();
  const adjacency = new Map<string, Array<{ point: Point; distance: number; direction: 0 | 1 }>>();
  const connect = (group: Point[], direction: 0 | 1) => {
    group.sort((a, b) => direction === 0 ? a.x - b.x : a.y - b.y);
    for (let i = 0; i < group.length - 1; i += 1) {
      const a = group[i];
      const b = group[i + 1];
      if (blocked(a, b)) continue;
      const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      for (const [from, to] of [[a, b], [b, a]] as const) {
        const edges = adjacency.get(key(from)) ?? [];
        edges.push({ point: to, distance, direction });
        adjacency.set(key(from), edges);
      }
    }
  };
  rows.forEach((group) => connect(group, 0));
  columns.forEach((group) => connect(group, 1));

  // Dijkstra with bend and congestion costs. The visibility grid routes around
  // node rectangles while preferring short, distinct orthogonal lanes.
  type State = { point: Point; direction: -1 | 0 | 1; cost: number; previous?: string };
  const stateKey = (point: Point, direction: -1 | 0 | 1) => `${key(point)}:${direction}`;
  const states = new Map<string, State>();
  const queue: Array<{ key: string; cost: number }> = [];
  const push = (entry: { key: string; cost: number }) => {
    queue.push(entry);
    let child = queue.length - 1;
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (queue[parent].cost <= queue[child].cost) break;
      [queue[parent], queue[child]] = [queue[child], queue[parent]];
      child = parent;
    }
  };
  const pop = () => {
    const first = queue[0];
    const last = queue.pop();
    if (queue.length && last) {
      queue[0] = last;
      let parent = 0;
      while (true) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (left < queue.length && queue[left].cost < queue[smallest].cost) smallest = left;
        if (right < queue.length && queue[right].cost < queue[smallest].cost) smallest = right;
        if (smallest === parent) break;
        [queue[parent], queue[smallest]] = [queue[smallest], queue[parent]];
        parent = smallest;
      }
    }
    return first;
  };
  const initial: State = { point: start, direction: -1, cost: 0 };
  const initialKey = stateKey(start, -1);
  states.set(initialKey, initial);
  push({ key: initialKey, cost: 0 });
  let bestEnd: string | undefined;
  while (queue.length) {
    const entry = pop()!;
    const currentKey = entry.key;
    const current = states.get(currentKey);
    if (!current || !currentKey) break;
    if (entry.cost !== current.cost) continue;
    if (key(current.point) === endKey) {
      bestEnd = currentKey;
      break;
    }
    for (const next of adjacency.get(key(current.point)) ?? []) {
      let addedCost = next.distance + (current.direction !== -1 && current.direction !== next.direction ? 34 : 0);
      for (const route of recentRoutes) for (let index = 0; index < route.length - 1; index += 1) {
        const hit = routeIntersection(current.point, next.point, route[index], route[index + 1]);
        if (hit) addedCost += 48;
        const sameRow = Math.abs(current.point.y - next.point.y) < 0.01 && Math.abs(route[index].y - route[index + 1].y) < 0.01 && Math.abs(current.point.y - route[index].y) < 0.01;
        const sameColumn = Math.abs(current.point.x - next.point.x) < 0.01 && Math.abs(route[index].x - route[index + 1].x) < 0.01 && Math.abs(current.point.x - route[index].x) < 0.01;
        if ((sameRow || sameColumn) && routeIntersection(current.point, next.point, route[index], route[index + 1]) === null) addedCost += 80;
      }
      const nextKey = stateKey(next.point, next.direction);
      const cost = current.cost + addedCost;
      if (cost >= (states.get(nextKey)?.cost ?? Infinity)) continue;
      states.set(nextKey, { point: next.point, direction: next.direction, cost, previous: currentKey });
      push({ key: nextKey, cost });
    }
  }
  if (!bestEnd) return perimeterRoute();
  const path: Point[] = [];
  let cursor: string | undefined = bestEnd;
  while (cursor) {
    const state: State = states.get(cursor)!;
    path.push(state.point);
    cursor = state.previous;
  }
  path.reverse();
  return compact(path);
}

export function chooseRelationshipLabelPosition(
  points: Point[],
  crossings: Point[],
  positions: Map<string, GraphNodePosition>,
  placedLabels: Point[],
) {
  if (points.length < 2) return undefined;
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y));
  }
  const totalLength = cumulative.at(-1) ?? 0;
  if (totalLength < 112) return undefined;

  const pointAndTangentAt = (distance: number) => {
    let index = 1;
    while (index < cumulative.length - 1 && cumulative[index] < distance) index += 1;
    const start = points[index - 1];
    const end = points[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const ratio = (distance - cumulative[index - 1]) / length;
    return {
      point: { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio },
      tangent: { x: (end.x - start.x) / length, y: (end.y - start.y) / length },
    };
  };

  for (const ratio of [0.5, 0.38, 0.62, 0.28, 0.72]) {
    const distance = totalLength * ratio;
    if (distance < 58 || totalLength - distance < 58) continue;
    const { point: center, tangent } = pointAndTangentAt(distance);
    for (const side of [-1, 1]) {
      const point = { x: center.x - tangent.y * 16 * side, y: center.y + tangent.x * 16 * side };
      if (crossings.some((crossing) => Math.hypot(point.x - crossing.x, point.y - crossing.y) < 46)) continue;
      if (placedLabels.some((label) => Math.hypot(point.x - label.x, point.y - label.y) < 94)) continue;
      const overlapsNode = [...positions.values()].some((node) =>
        point.x + 54 > node.x - 4 && point.x - 54 < node.x + (node.width ?? 230) + 4
        && point.y + 13 > node.y - 4 && point.y - 13 < node.y + (node.height ?? 112) + 4,
      );
      if (!overlapsNode) return point;
    }
  }
  return undefined;
}

export function deriveIncomingDependencyHighlight(
  relationships: GraphRelationship[],
  selectedNodeId?: string,
) {
  const incomingSourceIds = new Set<string>();
  const incomingPathEdgeIds = new Set<string>();
  if (!selectedNodeId) return { incomingSourceIds, incomingPathEdgeIds };

  // Highlight only the immediate neighbors of the selected node, regardless of
  // relationship direction. Keep edge highlighting limited to those same links.
  relationships.forEach((edge) => {
    if (edge.target === selectedNodeId) {
      incomingPathEdgeIds.add(edge.id);
      if (edge.source !== selectedNodeId) incomingSourceIds.add(edge.source);
    }
    if (edge.source === selectedNodeId) {
      incomingPathEdgeIds.add(edge.id);
      if (edge.target !== selectedNodeId) incomingSourceIds.add(edge.target);
    }
  });

  return { incomingSourceIds, incomingPathEdgeIds };
}

export function deriveGraphRelationshipDisplay(
  relationships: GraphRelationship[],
  selectedNodeId?: string,
  positions: Map<string, GraphNodePosition> = new Map(),
  calculateCrossings = true,
  highlightRelationships: GraphRelationship[] = relationships,
) {
  const { incomingSourceIds, incomingPathEdgeIds } = deriveIncomingDependencyHighlight(highlightRelationships, selectedNodeId);
  const pairCounts = new Map<string, number>();
  const pairIndexes = new Map<string, number>();
  const outgoingByNode = new Map<string, GraphRelationship[]>();
  relationships.forEach((edge) => {
    const outgoing = outgoingByNode.get(edge.source) ?? [];
    outgoing.push(edge);
    outgoingByNode.set(edge.source, outgoing);
  });
  outgoingByNode.forEach((edges) => edges.sort((left, right) => left.id.localeCompare(right.id)));

  const sideOpposite: Record<GraphPortSide, GraphPortSide> = { left: "right", right: "left", top: "bottom", bottom: "top" };
  const sidesByEdge = new Map<string, { source: GraphPortSide; target: GraphPortSide }>();
  for (const relationship of relationships) {
    const source = positions.get(relationship.source);
    const target = positions.get(relationship.target);
    if (!source || !target) continue;
    const dx = target.x + (target.width ?? 230) / 2 - source.x - (source.width ?? 230) / 2;
    const dy = target.y + (target.height ?? 112) / 2 - source.y - (source.height ?? 112) / 2;
    const sourceSide: GraphPortSide = Math.abs(dx) >= Math.abs(dy)
      ? (dx < 0 ? "left" : "right")
      : (dy < 0 ? "top" : "bottom");
    sidesByEdge.set(relationship.id, { source: sourceSide, target: sideOpposite[sourceSide] });
  }

  const sourcePortByEdge = new Map<string, { id: string; top: number; side: GraphPortSide }>();
  const targetPortByEdge = new Map<string, { id: string; top: number; side: GraphPortSide }>();
  const assignPorts = (sourcePorts: boolean) => {
    const groups = new Map<string, GraphRelationship[]>();
    relationships.forEach((edge) => {
      const sides = sidesByEdge.get(edge.id);
      const side = sourcePorts ? sides?.source : sides?.target;
      if (!side) return;
      const nodeId = sourcePorts ? edge.source : edge.target;
      const key = nodeId + ":" + side;
      const group = groups.get(key) ?? [];
      group.push(edge);
      groups.set(key, group);
    });
    groups.forEach((group, key) => {
      group.sort((left, right) => left.id.localeCompare(right.id));
      const [nodeId, side] = key.split(":") as [string, GraphPortSide];
      const node = positions.get(nodeId);
      const extent = side === "left" || side === "right" ? node?.height ?? 112 : node?.width ?? 230;
      group.forEach((edge, index) => {
        const defaultOffset = group.length === 1 && (side === "left" || side === "right")
          ? extent * (sourcePorts ? 0.38 : 0.62)
          : extent * (index + 1) / (group.length + 1);
        const port = { id: (sourcePorts ? "source-" : "target-") + edge.id, top: defaultOffset, side };
        (sourcePorts ? sourcePortByEdge : targetPortByEdge).set(edge.id, port);
      });
    });
  };
  assignPorts(true);
  assignPorts(false);

  for (const relationship of relationships) {
    const key = JSON.stringify([relationship.source, relationship.target]);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  const routedPaths: Point[][] = [];
  const routesById = new Map<string, Point[]>();
  const nodeCellSize = 256;
  const nodeCells = new Map<string, GraphNodePosition[]>();
  for (const node of positions.values()) {
    const left = Math.floor((node.x - 5) / nodeCellSize);
    const right = Math.floor((node.x + (node.width ?? 230) + 5) / nodeCellSize);
    const top = Math.floor((node.y - 5) / nodeCellSize);
    const bottom = Math.floor((node.y + (node.height ?? 112) + 5) / nodeCellSize);
    for (let x = left; x <= right; x += 1) for (let y = top; y <= bottom; y += 1) {
      const key = x + ":" + y;
      const bucket = nodeCells.get(key) ?? [];
      bucket.push(node);
      nodeCells.set(key, bucket);
    }
  }
  [...relationships].sort((left, right) => left.id.localeCompare(right.id)).forEach((relationship, routeIndex) => {
    const sourcePosition = positions.get(relationship.source);
    const targetPosition = positions.get(relationship.target);
    if (!sourcePosition || !targetPosition) {
      routesById.set(relationship.id, []);
      return;
    }
    const sourcePort = sourcePortByEdge.get(relationship.id) ?? { id: `source-${relationship.id}`, top: (sourcePosition.height ?? 112) / 2, side: "right" as const };
    const targetPort = targetPortByEdge.get(relationship.id) ?? { id: `target-${relationship.id}`, top: (targetPosition.height ?? 112) / 2, side: "left" as const };
    const anchorAt = (node: GraphNodePosition, side: GraphPortSide, offset: number): Point => {
      if (side === "left") return { x: node.x, y: node.y + offset };
      if (side === "right") return { x: node.x + (node.width ?? 230), y: node.y + offset };
      if (side === "top") return { x: node.x + offset, y: node.y };
      return { x: node.x + offset, y: node.y + (node.height ?? 112) };
    };
    const sourceAnchor = anchorAt(sourcePosition, sourcePort.side, sourcePort.top);
    const targetAnchor = anchorAt(targetPosition, targetPort.side, targetPort.top);
    const sourceOutward = portOutward[sourcePort.side];
    const targetOutward = portOutward[targetPort.side];
    const outsideSource = { x: sourceAnchor.x + sourceOutward.x * 16, y: sourceAnchor.y + sourceOutward.y * 16 };
    const outsideTarget = { x: targetAnchor.x + targetOutward.x * 16, y: targetAnchor.y + targetOutward.y * 16 };

    const distance = Math.hypot(targetAnchor.x - sourceAnchor.x, targetAnchor.y - sourceAnchor.y);
    const handle = Math.max(26, Math.min(150, distance * 0.42));
    const directPoints = sampleCubicWire(
      sourceAnchor,
      { x: sourceAnchor.x + sourceOutward.x * handle, y: sourceAnchor.y + sourceOutward.y * handle },
      { x: targetAnchor.x + targetOutward.x * handle, y: targetAnchor.y + targetOutward.y * handle },
      targetAnchor,
    );
    const obstacleCandidates = new Map<string, GraphNodePosition>();
    directPoints.slice(1).forEach((point, index) => {
      const previous = directPoints[index];
      gridCellsForSegment(previous, point, nodeCellSize).forEach((cell) => {
        (nodeCells.get(cell) ?? []).forEach((node) => {
        if (node.id !== relationship.source && node.id !== relationship.target) obstacleCandidates.set(node.id, node);
        });
      });
    });
    const crossesNode = directPoints.slice(1).some((point, index) => {
      const previous = directPoints[index];
      return [...obstacleCandidates.values()].some((node) => segmentIntersectsBox(previous, point, {
        left: node.x - 5,
        right: node.x + (node.width ?? 230) + 5,
        top: node.y - 5,
        bottom: node.y + (node.height ?? 112) + 5,
      }));
    });

    if (!crossesNode) {
      routesById.set(relationship.id, directPoints);
      routedPaths.push([sourceAnchor, outsideSource, outsideTarget, targetAnchor]);
      return;
    }

    const routed = routeAroundNodes(outsideSource, outsideTarget, positions, routedPaths, routeIndex);
    const routePoints = [sourceAnchor, outsideSource, ...routed.slice(1, -1), outsideTarget, targetAnchor];
    const compactRoute = routePoints.filter((point, index) => index === 0
      || Math.abs(point.x - routePoints[index - 1].x) > 0.01
      || Math.abs(point.y - routePoints[index - 1].y) > 0.01);
    const points = sampleRoundedRoute(compactRoute);
    routedPaths.push(compactRoute);
    routesById.set(relationship.id, points);
  });

  const edges = relationships.map((relationship) => {
    const key = JSON.stringify([relationship.source, relationship.target]);
    const parallelIndex = pairIndexes.get(key) ?? 0;
    pairIndexes.set(key, parallelIndex + 1);
    const isIncoming = incomingPathEdgeIds.has(relationship.id);

    const sourcePort = sourcePortByEdge.get(relationship.id);
    const targetPort = targetPortByEdge.get(relationship.id);
    const sides = sidesByEdge.get(relationship.id);

    return {
      ...relationship,
      isIncoming,
      parallelIndex,
      parallelCount: pairCounts.get(key) ?? 1,
      sourceHandle: sourcePort?.id ?? `source-${relationship.id}`,
      targetHandle: targetPort?.id ?? `target-${relationship.id}`,
      sourceSide: sides?.source ?? "right",
      targetSide: sides?.target ?? "left",
      sourcePortTop: sourcePort?.top ?? 56,
      targetPortTop: targetPort?.top ?? 56,
      points: routesById.get(relationship.id) ?? [],
      crossings: [] as Point[],
      labelPosition: undefined as Point | undefined,
    };
  });

  if (calculateCrossings) {
    const crossings = detectEdgeCrossings(edges);
    edges.forEach((edge) => edge.crossings.push(...(crossings.get(edge.id) ?? [])));
  }

  const placedLabels: Point[] = [];
  [...edges].sort((left, right) => left.id.localeCompare(right.id)).forEach((edge) => {
    const labelPosition = chooseRelationshipLabelPosition(edge.points, edge.crossings, positions, placedLabels);
    if (labelPosition) {
      edge.labelPosition = labelPosition;
      placedLabels.push(labelPosition);
    }
  });

  const visualEdges: GraphRelationshipVisualDisplay[] = [];
  const relationshipsByEntityPair = new Map<string, GraphRelationshipDisplay[]>();
  edges.forEach((edge) => {
    const pair = [edge.source, edge.target].sort();
    const key = JSON.stringify(pair);
    const pairEdges = relationshipsByEntityPair.get(key) ?? [];
    pairEdges.push(edge);
    relationshipsByEntityPair.set(key, pairEdges);
  });

  relationshipsByEntityPair.forEach((pairEdges, pairKey) => {
    const [entityA, entityB] = JSON.parse(pairKey) as [string, string];
    if (entityA !== entityB) {
      const aToB = pairEdges.filter((edge) => edge.source === entityA && edge.target === entityB);
      const bToA = pairEdges.filter((edge) => edge.source === entityB && edge.target === entityA);
      if (aToB.length && bToA.length) {
        const aX = positions.get(entityA)?.x ?? 0;
        const bX = positions.get(entityB)?.x ?? 0;
        const leftId = aX === bX ? [entityA, entityB].sort()[0] : aX < bX ? entityA : entityB;
        const rightId = leftId === entityA ? entityB : entityA;
        const forward = pairEdges
          .filter((edge) => edge.source === leftId && edge.target === rightId)
          .sort((left, right) => left.id.localeCompare(right.id));
        const reverse = pairEdges
          .filter((edge) => edge.source === rightId && edge.target === leftId)
          .sort((left, right) => left.id.localeCompare(right.id));
        const pathEdge = forward[0];
        const forwardTypes = forward.map((edge) => edge.relationshipType);
        const reverseTypes = reverse.map((edge) => edge.relationshipType);
        const formatTypes = (types: string[]) => types.map((type) => type.replaceAll("_", " ")).join(", ");
        const sameSingleType = forwardTypes.length === 1
          && reverseTypes.length === 1
          && forwardTypes[0].trim().toLocaleUpperCase() === reverseTypes[0].trim().toLocaleUpperCase();
        const relationshipIds = [...forward, ...reverse].map((edge) => edge.id).sort();
        visualEdges.push({
          ...pathEdge,
          id: "reciprocal:" + JSON.stringify(relationshipIds),
          source: leftId,
          target: rightId,
          isIncoming: [...forward, ...reverse].some((edge) => edge.isIncoming),
          parallelIndex: 0,
          parallelCount: 1,
          bidirectional: true,
          relationshipIds,
          forwardRelationshipTypes: forwardTypes,
          reverseRelationshipTypes: reverseTypes,
          relationshipLabel: sameSingleType
            ? formatTypes(forwardTypes) + " \u2194"
            : formatTypes(forwardTypes) + " \u2194 " + formatTypes(reverseTypes),
          sourceArrowIncoming: reverse.some((edge) => edge.isIncoming),
          targetArrowIncoming: forward.some((edge) => edge.isIncoming),
          crossings: [],
          labelPosition: undefined,
        });
        return;
      }
    }

    pairEdges.forEach((edge) => visualEdges.push({
      ...edge,
      bidirectional: false,
      relationshipIds: [edge.id],
      forwardRelationshipTypes: [edge.relationshipType],
      reverseRelationshipTypes: [],
      relationshipLabel: edge.relationshipType.replaceAll("_", " "),
      sourceArrowIncoming: false,
      targetArrowIncoming: edge.isIncoming,
      crossings: [],
      labelPosition: undefined,
    }));
  });

  const orderedVisualEdges = visualEdges.sort((left, right) => left.id.localeCompare(right.id));
  if (calculateCrossings) {
    const crossings = detectEdgeCrossings(orderedVisualEdges);
    orderedVisualEdges.forEach((edge) => edge.crossings.push(...(crossings.get(edge.id) ?? [])));
  }

  const visualLabels: Point[] = [];
  orderedVisualEdges.forEach((edge) => {
    const labelPosition = chooseRelationshipLabelPosition(edge.points, edge.crossings, positions, visualLabels);
    if (labelPosition) {
      edge.labelPosition = labelPosition;
      visualLabels.push(labelPosition);
    }
  });

  return { incomingSourceIds, edges, visualEdges: orderedVisualEdges };
}
