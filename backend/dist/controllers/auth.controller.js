import { getUserById, loginUser, registerUser, } from "../services/auth.service.js";
export async function registerController(req, res) {
    const { name, email, password } = req.body;
    const user = await registerUser(name, email, password);
    res.status(201).json({
        message: "User registered successfully",
        user,
    });
}
export async function loginController(req, res) {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    if (!result) {
        res.status(401).json({
            error: "Invalid email or password",
        });
        return;
    }
    res.status(200).json(result);
}
export async function meController(req, res) {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({
            error: "Authentication required",
        });
        return;
    }
    const user = await getUserById(userId);
    if (!user) {
        res.status(404).json({
            error: "User not found",
        });
        return;
    }
    res.status(200).json(user);
}
//# sourceMappingURL=auth.controller.js.map