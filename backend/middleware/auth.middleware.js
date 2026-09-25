import User from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
    try {
        let token = null;
        if (req.headers.authorization) token = req.headers.authorization.split(" ")[1];
        else token = req.body.token || req.query.token;
        if (!token) return res.status(401).json({ message: "No Token" });
        const user = await User.findOne({ token });
        if (!user) return res.status(401).json({ message: "User not found" });
        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

