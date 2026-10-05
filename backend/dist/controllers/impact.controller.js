import { analyzeImpact } from "../services/impact.service.js";
export async function analyzeImpactController(req, res) {
    const entityId = req.params.entityId;
    if (typeof entityId !== "string") {
        res.status(400).json({
            error: "Invalid entityId",
        });
        return;
    }
    const result = await analyzeImpact(entityId);
    if (!result) {
        res.status(404).json({
            error: "Entity not found",
        });
        return;
    }
    res.status(200).json(result);
}
//# sourceMappingURL=impact.controller.js.map