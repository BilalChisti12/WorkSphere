import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';

export const authenticate = async (req, res, next) => {
    try {
        let token = null;
        if (req.headers.authorization) token = req.headers.authorization.split(" ")[1];
        else token = req.body?.token || req.query?.token;
        if (!token) return res.status(401).json({ message: "No Token" });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: "User not found" });
        if (user.token !== token) return res.status(401).json({ message: "Invalid or expired token" });
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }
};
