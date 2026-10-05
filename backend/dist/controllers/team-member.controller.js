import { createTeamMember, getTeamMembers, } from "../services/team-member.service.js";
export async function createTeamMemberController(req, res) {
    const { userId, teamId, role } = req.body;
    const teamMember = await createTeamMember(userId, teamId, role);
    res.status(201).json(teamMember);
}
export async function getTeamMembersController(req, res) {
    const teamId = req.params.teamId;
    if (typeof teamId !== "string") {
        res.status(400).json({
            error: "Invalid teamId",
        });
        return;
    }
    const members = await getTeamMembers(teamId);
    res.status(200).json(members);
}
//# sourceMappingURL=team-member.controller.js.map