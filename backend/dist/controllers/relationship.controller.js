import { createRelationship, getOrganizationRelationships, getRelationshipById, deleteRelationship, } from "../services/relationship.service.js";
export async function createRelationshipController(req, res) {
    const { organizationId, sourceEntityId, targetEntityId, relationshipType, createdById, } = req.body;
    const relationship = await createRelationship(organizationId, sourceEntityId, targetEntityId, relationshipType, createdById);
    res.status(201).json(relationship);
}
export async function getOrganizationRelationshipsController(req, res) {
    const organizationId = req.params.organizationId;
    if (typeof organizationId !== "string") {
        res.status(400).json({
            error: "Invalid organizationId",
        });
        return;
    }
    const relationships = await getOrganizationRelationships(organizationId);
    res.status(200).json(relationships);
}
export async function deleteRelationshipController(req, res) {
    const relationshipId = req.params.relationshipId;
    if (typeof relationshipId !== "string") {
        res.status(400).json({
            error: "Invalid relationshipId",
        });
        return;
    }
    const relationship = await getRelationshipById(relationshipId);
    if (!relationship) {
        res.status(404).json({
            error: "Relationship not found",
        });
        return;
    }
    await deleteRelationship(relationshipId);
    res.status(204).send();
}
//# sourceMappingURL=relationship.controller.js.map