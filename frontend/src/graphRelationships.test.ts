import assert from "node:assert/strict";
import test from "node:test";
import { chooseRelationshipLabelPosition, deriveGraphRelationshipDisplay, detectEdgeCrossings, buildDependencyPathGeometry, filterValidGraphRelationships, getGraphNodeDimensions, layoutGraphNodes, type GraphRelationship } from "./graphRelationships.ts";

const relationships: GraphRelationship[] = [
  { id: "payment-database", source: "payment", target: "database", relationshipType: "DEPENDS_ON" },
  { id: "database-application", source: "database", target: "application", relationshipType: "DEPENDS_ON" },
  { id: "payment-application", source: "payment", target: "application", relationshipType: "DEPENDS_ON" },
  { id: "payment-security", source: "payment", target: "security", relationshipType: "DEPENDS_ON" },
  { id: "database-security", source: "database", target: "security", relationshipType: "DEPENDS_ON" },
];

test("the five-record fixture preserves relationship IDs, sources, and targets", () => {
  const result = deriveGraphRelationshipDisplay(relationships);
  assert.deepEqual(result.edges.map(({ id, source, target }) => ({ id, source, target })), relationships.map(({ id, source, target }) => ({ id, source, target })));
});

test("reciprocal relationship records render as one bidirectional edge without changing stored directions", () => {
  const reciprocal: GraphRelationship[] = [
    { id: "a-to-b", source: "a", target: "b", relationshipType: "DEPENDS_ON" },
    { id: "b-to-a", source: "b", target: "a", relationshipType: "CALLS" },
  ];
  const positions = new Map([
    ["a", { id: "a", layer: 0, x: 80, y: 80, width: 230, height: 112 }],
    ["b", { id: "b", layer: 1, x: 500, y: 80, width: 230, height: 112 }],
  ]);
  const result = deriveGraphRelationshipDisplay(reciprocal, "a", positions);

  assert.deepEqual(result.edges.map(({ id, source, target }) => [id, source, target]), [
    ["a-to-b", "a", "b"],
    ["b-to-a", "b", "a"],
  ]);
  assert.equal(result.visualEdges.length, 1);
  const [edge] = result.visualEdges;
  assert.equal(edge.bidirectional, true);
  assert.deepEqual([edge.source, edge.target], ["a", "b"]);
  assert.deepEqual(edge.relationshipIds, ["a-to-b", "b-to-a"]);
  assert.deepEqual(edge.forwardRelationshipTypes, ["DEPENDS_ON"]);
  assert.deepEqual(edge.reverseRelationshipTypes, ["CALLS"]);
  assert.equal(edge.relationshipLabel, "DEPENDS ON \u2194 CALLS");
  assert.equal(edge.sourceArrowIncoming, true);
  assert.equal(edge.targetArrowIncoming, true);
});

test("a selected node highlights only its direct incoming relationships and sources", () => {
  const result = deriveGraphRelationshipDisplay(relationships, "database");

  assert.deepEqual([...result.incomingSourceIds], ["payment"]);
  assert.deepEqual(result.edges.filter((edge) => edge.isIncoming).map((edge) => edge.id), ["payment-database"]);
  assert.equal(result.edges.find((edge) => edge.id === "database-application")?.isIncoming, false);
  assert.equal(result.edges.find((edge) => edge.id === "database-security")?.isIncoming, false);
});

test("selection highlights its incoming relationships and every upstream source", () => {
  const result = deriveGraphRelationshipDisplay(relationships, "security");

  assert.deepEqual([...result.incomingSourceIds].sort(), ["database", "payment"]);
  assert.deepEqual(result.edges.filter((edge) => edge.isIncoming).map((edge) => edge.id).sort(), ["database-security", "payment-database", "payment-security"]);
});

test("clearing selection restores normal edge styling", () => {
  const result = deriveGraphRelationshipDisplay(relationships);

  assert.equal(result.incomingSourceIds.size, 0);
  assert.equal(result.edges.some((edge) => edge.isIncoming), false);
});

test("each relationship record keeps its stable ID and different types remain separate", () => {
  const parallel: GraphRelationship[] = [
    ...relationships,
    { id: "payment-database-calls", source: "payment", target: "database", relationshipType: "CALLS" },
  ];
  const result = deriveGraphRelationshipDisplay(parallel, "database");
  const paymentDatabaseEdges = result.edges.filter((edge) => edge.source === "payment" && edge.target === "database");

  assert.deepEqual(paymentDatabaseEdges.map((edge) => edge.id), ["payment-database", "payment-database-calls"]);
  assert.deepEqual(paymentDatabaseEdges.map((edge) => edge.relationshipType), ["DEPENDS_ON", "CALLS"]);
  assert.deepEqual(paymentDatabaseEdges.map((edge) => edge.parallelCount), [2, 2]);
  assert.deepEqual(paymentDatabaseEdges.map((edge) => edge.parallelIndex), [0, 1]);
});

test("one relationship record produces one edge, and duplicate records remain visible for review", () => {
  const single = deriveGraphRelationshipDisplay([relationships[0]]);
  assert.deepEqual(single.edges.map((edge) => edge.id), ["payment-database"]);
  assert.deepEqual(single.visualEdges.map((edge) => edge.relationshipIds), [["payment-database"]]);

  const duplicatedRecords = deriveGraphRelationshipDisplay([
    relationships[0],
    { ...relationships[0], id: "payment-database-duplicate" },
  ]);
  assert.deepEqual(duplicatedRecords.edges.map((edge) => edge.id), [
    "payment-database",
    "payment-database-duplicate",
  ]);
  assert.deepEqual(duplicatedRecords.edges.map((edge) => edge.parallelCount), [2, 2]);
});

test("acyclic nodes are laid out left to right in the stored relationship direction", () => {
  const positions = layoutGraphNodes([
    { id: "payment", name: "payment" },
    { id: "database", name: "database" },
    { id: "application", name: "application" },
    { id: "security", name: "security" },
  ], [
    ...relationships,
  ]);

  assert.ok(positions.get("payment")!.x < positions.get("database")!.x);
  assert.ok(positions.get("database")!.x < positions.get("application")!.x);
  assert.ok(positions.get("database")!.x < positions.get("security")!.x);
});

test("cycles use bounded feedback routes and downstream nodes still follow dependency layers", () => {
  const cycle: GraphRelationship[] = [
    { id: "payment-database", source: "payment", target: "database", relationshipType: "DEPENDS_ON" },
    { id: "database-application", source: "database", target: "application", relationshipType: "DEPENDS_ON" },
    { id: "application-payment", source: "application", target: "payment", relationshipType: "DEPENDS_ON" },
    { id: "payment-security", source: "payment", target: "security", relationshipType: "DEPENDS_ON" },
    { id: "database-security", source: "database", target: "security", relationshipType: "DEPENDS_ON" },
  ];
  const positions = layoutGraphNodes([
    { id: "payment", name: "payment" },
    { id: "database", name: "database" },
    { id: "application", name: "application" },
    { id: "security", name: "security" },
  ], cycle);

  assert.ok(positions.get("application")!.x < positions.get("payment")!.x);
  assert.ok(positions.get("payment")!.x < positions.get("database")!.x);
  assert.ok(positions.get("database")!.x < positions.get("security")!.x);
  const display = deriveGraphRelationshipDisplay(cycle, undefined, positions);
  assert.equal(display.edges.length, cycle.length);
  assert.deepEqual(display.edges.map((edge) => [edge.source, edge.target]), cycle.map((edge) => [edge.source, edge.target]));
  assert.ok(display.edges.find((edge) => edge.id === "application-payment")!.points.length > 2);
});

test("the six-record payment/application cycle preserves every stored direction", () => {
  const sixRecords: GraphRelationship[] = [
    ...relationships,
    { id: "application-payment", source: "application", target: "payment", relationshipType: "DEPENDS_ON" },
  ];
  const nodes = ["payment", "database", "application", "security"].map((id) => ({ id, name: id }));
  const positions = layoutGraphNodes(nodes, sixRecords);
  const display = deriveGraphRelationshipDisplay(sixRecords, undefined, positions);
  assert.deepEqual(display.edges.map(({ id, source, target }) => [id, source, target]), sixRecords.map(({ id, source, target }) => [id, source, target]));
  assert.ok(display.edges.find((edge) => edge.id === "payment-application")!.points.length >= 4);
  assert.ok(display.edges.find((edge) => edge.id === "application-payment")!.points.length >= 4);
  assert.equal(new Set(display.edges.map((edge) => edge.id)).size, sixRecords.length);
  const securityIncoming = display.edges.filter((edge) => edge.target === "security");
  assert.equal(new Set(securityIncoming.map((edge) => edge.targetHandle)).size, securityIncoming.length);
  assert.equal(new Set(securityIncoming.map((edge) => edge.points.at(-1)!.y)).size, securityIncoming.length);
});

test("automatic layout gives every node non-overlapping dynamic bounds", () => {
  const nodes = Array.from({ length: 1000 }, (_, index) => ({ id: `node-${index}`, name: `Node ${index}` }));
  const positions = layoutGraphNodes(nodes, []);
  assert.equal(positions.size, 1000);
  const ordered = [...positions.values()].sort((a, b) => a.y - b.y);
  for (let index = 1; index < ordered.length; index += 1) {
    assert.ok(ordered[index].y >= ordered[index - 1].y + (ordered[index - 1].height ?? 112));
  }
});

test("long descriptions expand graph nodes while respecting the port height", () => {
  const shortDescription = getGraphNodeDimensions("Short description");
  const longDescription = getGraphNodeDimensions("A detailed description ".repeat(24));
  const highDegreeNode = getGraphNodeDimensions("Short description", 12);

  assert.ok(longDescription.width > shortDescription.width);
  assert.ok(longDescription.height > shortDescription.height);
  assert.ok(highDegreeNode.height >= 13 * 22);
});

test("layer spacing accounts for wider description-driven nodes", () => {
  const positions = layoutGraphNodes([
    { id: "source", name: "Source", width: 400, height: 190 },
    { id: "target", name: "Target", width: 280, height: 170 },
  ], [{ id: "edge", source: "source", target: "target", relationshipType: "DEPENDS_ON" }]);

  assert.ok(positions.get("target")!.x >= positions.get("source")!.x + 400 + 160);
});

test("high-degree nodes receive enough height to keep incoming handles distinct", () => {
  const nodes = Array.from({ length: 17 }, (_, index) => ({ id: `source-${index}`, name: `Source ${index}` }));
  nodes.push({ id: "target", name: "Target" });
  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `incoming-${index}`,
    source: node.id,
    target: "target",
    relationshipType: "DEPENDS_ON",
  }));
  const positions = layoutGraphNodes(nodes, edges);
  const display = deriveGraphRelationshipDisplay(edges, undefined, positions);
  const target = positions.get("target")!;
  const ports = display.edges.map((edge) => edge.targetPortTop).sort((a, b) => a - b);
  assert.ok(target.height! > 112);
  assert.equal(new Set(display.edges.map((edge) => edge.targetHandle)).size, edges.length);
  for (let index = 1; index < ports.length; index += 1) assert.ok(ports[index] - ports[index - 1] >= 21.9);
});

test("a long-range dependency routes around intervening node cards", () => {
  const positions = new Map([
    ["source", { id: "source", layer: 0, x: 80, y: 80 }],
    ["blocker", { id: "blocker", layer: 1, x: 400, y: 80 }],
    ["target", { id: "target", layer: 2, x: 720, y: 80 }],
  ]);
  const [edge] = deriveGraphRelationshipDisplay([
    { id: "long-range", source: "source", target: "target", relationshipType: "DEPENDS_ON" },
  ], undefined, positions).edges;
  assert.deepEqual(edge.points[0], { x: 310, y: 122.56 });
  assert.deepEqual(edge.points.at(-1), { x: 720, y: 149.44 });
  const blocker = { left: 400, right: 630, top: 80, bottom: 192 };
  for (let index = 0; index < edge.points.length - 1; index += 1) {
    const a = edge.points[index];
    const b = edge.points[index + 1];
    if (Math.abs(a.y - b.y) < 0.01) {
      assert.ok(!(a.y > blocker.top && a.y < blocker.bottom && Math.max(a.x, b.x) > blocker.left && Math.min(a.x, b.x) < blocker.right));
    } else {
      assert.ok(!(a.x > blocker.left && a.x < blocker.right && Math.max(a.y, b.y) > blocker.top && Math.min(a.y, b.y) < blocker.bottom));
    }
  }
});

test("all routed relationships avoid node interiors and end at their assigned targets", () => {
  const cycle: GraphRelationship[] = [
    { id: "payment-db", source: "payment", target: "database", relationshipType: "DEPENDS_ON" },
    { id: "db-app", source: "database", target: "application", relationshipType: "DEPENDS_ON" },
    { id: "payment-app", source: "payment", target: "application", relationshipType: "DEPENDS_ON" },
    { id: "payment-security", source: "payment", target: "security", relationshipType: "DEPENDS_ON" },
    { id: "database-security", source: "database", target: "security", relationshipType: "DEPENDS_ON" },
    { id: "app-payment", source: "application", target: "payment", relationshipType: "DEPENDS_ON" },
  ];
  const nodes = ["payment", "database", "application", "security"].map((id) => ({ id, name: id }));
  const positions = layoutGraphNodes(nodes, cycle);
  const display = deriveGraphRelationshipDisplay(cycle, undefined, positions);
  for (const edge of display.edges) {
    const source = positions.get(edge.source)!;
    const target = positions.get(edge.target)!;
    assert.deepEqual(edge.points[0], { x: source.x + source.width!, y: source.y + edge.sourcePortTop });
    assert.deepEqual(edge.points.at(-1), { x: target.x, y: target.y + edge.targetPortTop });
    for (const node of positions.values()) {
      if (node.id === edge.source || node.id === edge.target) continue;
      const box = { left: node.x, right: node.x + node.width!, top: node.y, bottom: node.y + node.height! };
      for (let index = 0; index < edge.points.length - 1; index += 1) {
        const a = edge.points[index];
        const b = edge.points[index + 1];
        if (Math.abs(a.y - b.y) < 0.01) {
          assert.ok(!(a.y > box.top && a.y < box.bottom && Math.max(a.x, b.x) > box.left && Math.min(a.x, b.x) < box.right));
        } else {
          assert.ok(!(a.x > box.left && a.x < box.right && Math.max(a.y, b.y) > box.top && Math.min(a.y, b.y) < box.bottom));
        }
      }
    }
  }
});

test("labels use clear final-route segments and stay clear of nodes and crossings", () => {
  const positions = new Map([
    ["source", { id: "source", layer: 0, x: 80, y: 80 }],
    ["blocker", { id: "blocker", layer: 1, x: 400, y: 80 }],
    ["target", { id: "target", layer: 2, x: 800, y: 80 }],
  ]);
  const [edge] = deriveGraphRelationshipDisplay([
    { id: "labelled-long-range", source: "source", target: "target", relationshipType: "DEPENDS_ON" },
  ], undefined, positions).edges;
  assert.ok(edge.labelPosition);
  assert.ok(edge.crossings.every((crossing) => Math.hypot(edge.labelPosition!.x - crossing.x, edge.labelPosition!.y - crossing.y) >= 46));
  assert.ok([...positions.values()].every((node) =>
    !(edge.labelPosition!.x + 48 > node.x - 4 && edge.labelPosition!.x - 48 < node.x + 234
      && edge.labelPosition!.y + 12 > node.y - 4 && edge.labelPosition!.y - 12 < node.y + 116),
  ));
});

test("moving nodes recalculates edge and label geometry without changing endpoints", () => {
  const relationship = { id: "movable", source: "source", target: "target", relationshipType: "DEPENDS_ON" };
  const positions = new Map([
    ["source", { id: "source", layer: 0, x: 80, y: 80 }],
    ["target", { id: "target", layer: 2, x: 800, y: 80 }],
  ]);
  const before = deriveGraphRelationshipDisplay([relationship], undefined, positions).edges[0];
  positions.set("target", { id: "target", layer: 2, x: 980, y: 260 });
  const after = deriveGraphRelationshipDisplay([relationship], undefined, positions).edges[0];
  assert.deepEqual([after.id, after.source, after.target], [relationship.id, relationship.source, relationship.target]);
  assert.notDeepEqual(after.points, before.points);
  assert.notDeepEqual(after.labelPosition, before.labelPosition);
});

test("routed edges attach their tail to the source and arrowhead to the target", () => {
  const positions = new Map([
    ["payment", { id: "payment", layer: 0, x: 80, y: 80 }],
    ["database", { id: "database", layer: 1, x: 400, y: 80 }],
  ]);
  const result = deriveGraphRelationshipDisplay([relationships[0]], undefined, positions);
  const [edge] = result.edges;

  assert.deepEqual(edge.points[0], { x: 310, y: 122.56 });
  assert.deepEqual(edge.points.at(-1), { x: 400, y: 149.44 });
});

test("missing endpoint relationships are excluded with a data warning", () => {
  const result = filterValidGraphRelationships(
    [{ id: "payment" }, { id: "database" }],
    [relationships[0], { ...relationships[1], source: "missing-node" }],
  );
  assert.deepEqual(result.edges.map((edge) => edge.id), ["payment-database"]);
  assert.match(result.warnings[0], /1 relationship has a missing endpoint/);
});

test("genuine perpendicular crossings get one bridge on the stable higher-priority edge", () => {
  const result = detectEdgeCrossings([
    { id: "a-horizontal", source: "left", target: "right", points: [{ x: 0, y: 40 }, { x: 100, y: 40 }] },
    { id: "b-vertical", source: "top", target: "bottom", points: [{ x: 50, y: 0 }, { x: 50, y: 100 }] },
  ]);
  assert.deepEqual(result.get("a-horizontal"), []);
  assert.deepEqual(result.get("b-vertical"), [{ x: 50, y: 40 }]);
});

test("a relationship label near a crossing moves to a clear portion of its route", () => {
  const horizontal = [{ x: 0, y: 50 }, { x: 0, y: 50 }, { x: 230, y: 50 }, { x: 240, y: 50 }];
  const crossing = detectEdgeCrossings([
    { id: "a-horizontal", source: "left", target: "right", points: horizontal },
    { id: "b-vertical", source: "top", target: "bottom", points: [{ x: 115, y: 0 }, { x: 115, y: 100 }] },
  ]).get("b-vertical")!;
  const label = chooseRelationshipLabelPosition(horizontal, crossing, new Map(), []);
  assert.ok(label);
  assert.ok(crossing.every((point) => Math.hypot(label.x - point.x, label.y - point.y) >= 46));
});

test("crossings are recalculated after routed coordinates change", () => {
  const beforeMove = detectEdgeCrossings([
    { id: "a", source: "left", target: "right", points: [{ x: 0, y: 30 }, { x: 100, y: 30 }] },
    { id: "b", source: "top", target: "bottom", points: [{ x: 10, y: 0 }, { x: 10, y: 100 }] },
  ]);
  assert.equal(beforeMove.get("b")?.length, 0);

  const afterMove = detectEdgeCrossings([
    { id: "a", source: "left", target: "right", points: [{ x: 0, y: 30 }, { x: 100, y: 30 }] },
    { id: "b", source: "top", target: "bottom", points: [{ x: 50, y: 0 }, { x: 50, y: 100 }] },
  ]);
  assert.deepEqual(afterMove.get("b"), [{ x: 50, y: 30 }]);
});

test("multiple crossings between the same routed pair remain separate", () => {
  const result = detectEdgeCrossings([
    { id: "a-horizontal", source: "left", target: "right", points: [{ x: 0, y: 50 }, { x: 100, y: 50 }] },
    { id: "b-zigzag", source: "top", target: "bottom", points: [{ x: 20, y: 0 }, { x: 20, y: 100 }, { x: 80, y: 100 }, { x: 80, y: 0 }] },
  ]);
  assert.deepEqual(result.get("b-zigzag"), [{ x: 20, y: 50 }, { x: 80, y: 50 }]);
});

test("shared anchors, target points, and parallel paths are not crossings", () => {
  const sharedSource = detectEdgeCrossings([
    { id: "source-horizontal", source: "same", target: "right", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
    { id: "source-vertical", source: "same", target: "down", points: [{ x: 0, y: 0 }, { x: 0, y: 100 }] },
  ]);
  assert.equal(sharedSource.get("source-horizontal")?.length, 0);
  assert.equal(sharedSource.get("source-vertical")?.length, 0);

  const sharedTarget = detectEdgeCrossings([
    { id: "target-horizontal", source: "left", target: "same", points: [{ x: 0, y: 100 }, { x: 100, y: 100 }] },
    { id: "target-vertical", source: "top", target: "same", points: [{ x: 100, y: 0 }, { x: 100, y: 100 }] },
  ]);
  assert.equal(sharedTarget.get("target-horizontal")?.length, 0);
  assert.equal(sharedTarget.get("target-vertical")?.length, 0);

  const parallel = detectEdgeCrossings([
    { id: "parallel-one", source: "a", target: "b", points: [{ x: 0, y: 20 }, { x: 100, y: 20 }] },
    { id: "parallel-two", source: "c", target: "d", points: [{ x: 0, y: 40 }, { x: 100, y: 40 }] },
  ]);
  assert.equal(parallel.get("parallel-one")?.length, 0);
  assert.equal(parallel.get("parallel-two")?.length, 0);
});

test("crossing detection scales across many non-crossing graph edges", () => {
  const many = Array.from({ length: 2000 }, (_, index) => ({
    id: `edge-${index}`,
    source: `source-${index}`,
    target: `target-${index}`,
    points: [{ x: 0, y: index * 24 }, { x: 100, y: index * 24 }],
  }));
  const result = detectEdgeCrossings(many);
  assert.equal(result.size, many.length);
  assert.ok([...result.values()].every((edgeCrossings) => edgeCrossings.length === 0));
});

test("fallback routes use nearby obstacle lanes instead of the whole graph bounds", () => {
  const positions = new Map<string, { id: string; layer: number; x: number; y: number; width: number; height: number }>([
    ["source", { id: "source", layer: 0, x: 0, y: 100, width: 230, height: 112 }],
    ["near", { id: "near", layer: 1, x: 260, y: 5000, width: 230, height: 112 }],
    ["target", { id: "target", layer: 2, x: 3600, y: 100, width: 230, height: 112 }],
    ["far-node", { id: "far-node", layer: 3, x: 1500, y: 5000, width: 230, height: 112 }],
  ]);
  for (let index = 0; index < 50; index += 1) {
    const id = "blocker-" + index;
    positions.set(id, { id, layer: 1, x: 300 + index * 50, y: 100, width: 230, height: 112 });
  }
  const edges = deriveGraphRelationshipDisplay([
    { id: "a-short", source: "source", target: "near", relationshipType: "DEPENDS_ON" },
    { id: "z-long", source: "source", target: "target", relationshipType: "DEPENDS_ON" },
  ], undefined, positions).edges;
  const longRoute = edges.find((edge) => edge.id === "z-long")!;
  assert.ok(Math.max(...longRoute.points.map((point) => point.y)) < 1000);
});
test("a directed A to B to C chain is laid out in relationship order", () => {
  const chain: GraphRelationship[] = [
    { id: "a-b", source: "a", target: "b", relationshipType: "DEPENDS_ON" },
    { id: "b-c", source: "b", target: "c", relationshipType: "DEPENDS_ON" },
  ];
  const nodes = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
  ];
  const positions = layoutGraphNodes(nodes, chain);
  assert.ok(positions.get("a")!.x + positions.get("a")!.width! + 160 <= positions.get("b")!.x);
  assert.ok(positions.get("b")!.x + positions.get("b")!.width! + 160 <= positions.get("c")!.x);
  const edges = deriveGraphRelationshipDisplay(chain, undefined, positions).edges;
  assert.deepEqual(edges.map(({ source, target }) => [source, target]), [["a", "b"], ["b", "c"]]);
  assert.ok(edges.every((edge) => / Q /.test(buildDependencyPathGeometry(edge.points, []).path)));
});

test("selecting C highlights only its upstream A and B nodes in an A-B-C-D chain", () => {
  const chain: GraphRelationship[] = [
    { id: "a-b", source: "a", target: "b", relationshipType: "DEPENDS_ON" },
    { id: "b-c", source: "b", target: "c", relationshipType: "DEPENDS_ON" },
    { id: "c-d", source: "c", target: "d", relationshipType: "DEPENDS_ON" },
  ];
  const result = deriveGraphRelationshipDisplay(chain, "c");
  assert.deepEqual([...result.incomingSourceIds].sort(), ["a", "b"]);
  assert.deepEqual(result.edges.filter((edge) => edge.isIncoming).map((edge) => edge.id).sort(), ["a-b", "b-c"]);
  assert.equal(result.incomingSourceIds.has("c"), false);
  assert.equal(result.incomingSourceIds.has("d"), false);
  assert.equal(result.edges.find((edge) => edge.id === "c-d")?.isIncoming, false);
});

test("crossing routes render a separated arc bridge on the overpass", () => {
  const { path, bridges } = buildDependencyPathGeometry(
    [{ x: 0, y: 40 }, { x: 100, y: 40 }],
    [{ x: 50, y: 40 }],
  );
  assert.equal(bridges.length, 1);
  assert.match(bridges[0].path, /A 10 10/);
  assert.match(path, /L 40 40 M 60 40/);
});