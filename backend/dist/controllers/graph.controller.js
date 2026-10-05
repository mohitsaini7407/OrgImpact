import { getOrganizationGraph } from "../services/graph.service.js";
export async function getOrganizationGraphController(req, res) {
    const organizationId = req.params.organizationId;
    if (typeof organizationId !== "string") {
        res.status(400).json({
            error: "Invalid organizationId",
        });
        return;
    }
    const graph = await getOrganizationGraph(organizationId);
    res.status(200).json(graph);
}
//# sourceMappingURL=graph.controller.js.map