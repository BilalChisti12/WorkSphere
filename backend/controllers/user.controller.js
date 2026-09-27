import User from "../models/user.model.js"
import bcrypt from 'bcrypt';
import Profile from '../models/profile.model.js';
import ConnectionRequest from "../models/connection.model.js";
import mongoose from "mongoose";
import path from "path";
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import jwt from "jsonwebtoken";


const convertUserDataToPDF = async (userData, res) => {
    if (!userData) throw new Error("User Data Missing");
    if (!userData.userId) throw new Error("User ID missing");
    const doc = new PDFDocument({ size: "A4", margins: { top: 45, bottom: 45, left: 42, right: 42 }, bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${userData.userId.name}_resume.pdf"`);
    doc.pipe(res);
    const PAGE_WIDTH = doc.page.width;
    const PAGE_HEIGHT = doc.page.height;
    const LEFT = 42;
    const RIGHT = PAGE_WIDTH - 42;
    const CONTENT_WIDTH = RIGHT - LEFT;
    const BLACK = "#111111";
    const DARK_GRAY = "#333333";
    const GRAY = "#666666";
    const LINE = "#777777";
    const normalFont = () => doc.font("Times-Roman");
    const boldFont = () => doc.font("Times-Bold");
    const italicFont = () => doc.font("Times-Italic");
    normalFont();
    doc.fillColor(BLACK);
    const addSectionHeading = (title) => {
        if (doc.y > PAGE_HEIGHT - 100) doc.addPage();
        doc.moveDown(0.35);
        doc.font("Times-Roman").fontSize(13).fillColor(BLACK).text(title.toUpperCase(), LEFT, doc.y, { width: CONTENT_WIDTH, characterSpacing: 0.5 });
        const lineY = doc.y + 4;
        doc.moveTo(LEFT, lineY).lineTo(RIGHT, lineY).lineWidth(0.5).strokeColor(LINE).stroke();
        doc.y = lineY + 8;
    };
    const addBullet = (text) => {
        const bulletX = LEFT;
        const textX = LEFT + 11;
        const textWidth = CONTENT_WIDTH - 11;
        doc.font("Times-Roman").fontSize(9.5).fillColor(BLACK).text("–", bulletX, doc.y, { width: 8 });
        doc.text(text, textX, doc.y, { width: textWidth, lineGap: 0.5, paragraphGap: 2 });
        doc.moveDown(0.15);
    };
    const addKeyValue = (key, value) => {
        doc.font("Times-Bold").fontSize(9.5).fillColor(BLACK).text(`${key}:`, LEFT, doc.y, { continued: true });
        doc.font("Times-Roman").fontSize(9.5).text(` ${value}`);
        doc.moveDown(0.05);
    };
    const profilePicture = userData.userId.profilePicture;
    const imagePath = profilePicture ? path.join("uploads", profilePicture) : null;
    const headerTop = doc.y;
    if (imagePath && fs.existsSync(imagePath)) {
        const IMAGE_SIZE = 72;
        doc.image(imagePath, RIGHT - IMAGE_SIZE, headerTop - 5, { width: IMAGE_SIZE, height: IMAGE_SIZE });
        doc.rect(RIGHT - IMAGE_SIZE, headerTop - 5, IMAGE_SIZE, IMAGE_SIZE).lineWidth(0.6).strokeColor("#555555").stroke();
    }
    const name = userData.userId.name || "Unnamed User";
    doc.font("Times-Roman").fontSize(22).fillColor(BLACK).text(name, LEFT, headerTop, { width: CONTENT_WIDTH - 80, align: "center" });
    const contactParts = [];
    if (userData.userId.email) contactParts.push(userData.userId.email);
    const contactLine = contactParts.join("   |   ");
    if (contactLine) doc.font("Times-Roman").fontSize(8.5).fillColor(DARK_GRAY).text(contactLine, LEFT, doc.y + 4, { width: CONTENT_WIDTH - 80, align: "center" });
    doc.y = Math.max(doc.y + 10, headerTop + 78);
    addSectionHeading("Professional Summary");
    if (userData.bio) {
        doc.font("Times-Roman").fontSize(9.5).fillColor(BLACK).text(userData.bio, LEFT, doc.y, { width: CONTENT_WIDTH, lineGap: 0.5, align: "left" });
        doc.moveDown(0.3);
    }
    if (userData.currentPost) {
        addSectionHeading("Current Position");
        doc.font("Times-Bold").fontSize(10).fillColor(BLACK).text(userData.currentPost, LEFT, doc.y);
        doc.moveDown(0.3);
    }
    if (Array.isArray(userData.skills) && userData.skills.length > 0) {
        addSectionHeading("Technical Skills");
        userData.skills.forEach((skill) => {
            const skillName = skill?.skill || "";
            const priority = skill?.priority ? ` (${skill.priority})` : "";
            if (!skillName) return;
            doc.font("Times-Bold").fontSize(9.5).fillColor(BLACK).text(`${skillName}${priority}`, LEFT, doc.y, { width: CONTENT_WIDTH, lineGap: 0.3 });
            doc.moveDown(0.03);
        });
        doc.moveDown(0.2);
    }
    if (Array.isArray(userData.education) && userData.education.length > 0) {
    addSectionHeading("Education");
    userData.education.forEach((education) => {
        const school = education?.school || "";
        const degree = education?.degree || "";
        const field = education?.fieldOfStudy || "";
        const yearText = education?.years ? String(education.years) : "";
        const educationY = doc.y;

        doc.font("Times-Bold").fontSize(10).fillColor(BLACK).text(school, LEFT, educationY, {
            width: CONTENT_WIDTH - 80
        });

        if (yearText) {
            doc.font("Times-Roman").fontSize(9).fillColor(BLACK).text(yearText, RIGHT - 80, educationY, {
                width: 80,
                align: "right"
            });
        }

        doc.y = Math.max(doc.y, educationY + 12);

        const educationDetails = [degree, field].filter(Boolean).join(" - ");

        if (educationDetails) {
            doc.font("Times-Italic").fontSize(9.5).fillColor(DARK_GRAY).text(educationDetails, LEFT, doc.y);
        }

        doc.moveDown(0.2);
    });
}
    if (Array.isArray(userData.pastWork) && userData.pastWork.length > 0) {
        addSectionHeading("Experience");
        userData.pastWork.forEach((work) => {
            const company = work?.company || "";
            const position = work?.position || "";
            const years = work?.years || "";
            doc.font("Times-Bold").fontSize(10).fillColor(BLACK).text(position, LEFT, doc.y, { continued: true });
            if (years) doc.font("Times-Roman").fontSize(9).text(String(years), { align: "right" });
            else doc.text("");
            if (company) doc.font("Times-Italic").fontSize(9.5).fillColor(DARK_GRAY).text(company, LEFT, doc.y);
            doc.moveDown(0.15);
        });
    }
    const range = doc.bufferedPageRange();
    for (let pageNumber = range.start; pageNumber < range.start + range.count; pageNumber++) {
        doc.switchToPage(pageNumber);
        doc.font("Times-Roman").fontSize(7).fillColor(GRAY).text(`${pageNumber + 1}`, LEFT, PAGE_HEIGHT - 25, { width: CONTENT_WIDTH, align: "center" });
    }
    doc.end();
};



export const register = async (req, res) => {
    try {
        const { name, email, password, username } = req.body || {};
        if (!name || !email || !password || !username) {
            return res.status(400).json({
                sucess: false,
                message: "All fields are required"
            });
        }
        if (password.trim() === '') return res.status(400).json({ message: "Password cannot be empty" });
        if (name.trim() === '') return res.status(400).json({ message: "Name cannot be empty" });
        if (email.trim() === '') return res.status(400).json({ message: "Email cannot be empty" });
        if (username.trim() === '') return res.status(400).json({ message: "Username cannot be empty" });
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                sucess: false,
                message: "User already exists"
            });
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name, email, password: hashPassword, username
        });
        await newUser.save();

        const profile = new Profile({ userId: newUser._id });
        await profile.save();

        return res.status(200).json({
            message: "User created successfully"
        });

    } catch (error) {
        console.log("Register error:", error);
        return res.status(500).json({
            sucess: false,
            message: "internal server error"
        });
    }
}



export const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: "All Fields are required" });
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });
        if (!user.active) return res.status(400).json({ message: "Account is deactivated" });
        const isPass = await bcrypt.compare(password, user.password);
        if (!isPass) return res.status(400).json({ message: "invalid credentials" });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        await User.updateOne({ _id: user._id }, { token });

        return res.json({ token, message: "Login successfull" });
    }
    catch (error) {
        console.log("Login error:", error);
        return res.status(500).json({
            sucess: false,
            message: "internal server error"
        });
    }
}

export const logout = async (req, res) => {
    try {
        const user = req.user;
        await User.updateOne({ _id: user._id }, { token: "" });
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


export const connectSlack = async (req, res) => {
    const { token } = req.query;

    const code_verifier = crypto.randomBytes(32).toString('hex');
    const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const combinedState = `${token}___${code_verifier}`;

    const redirectUri = encodeURIComponent(`${process.env.BACKEND_URL || 'http://localhost:8080'}/slack/callback`);
    const slackURL = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&user_scope=chat:write&state=${combinedState}&redirect_uri=${redirectUri}&code_challenge=${code_challenge}&code_challenge_method=S256`;
    res.redirect(slackURL);
}

export const slackCallback = async (req, res) => {
    const { code, state } = req.query;

    const [token, code_verifier] = (state || '').split('___');

    try {
        const response = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID,
                client_secret: process.env.SLACK_CLIENT_SECRET,
                code: code,
                redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:8080'}/slack/callback`,
                code_verifier: code_verifier || ''
            })
        });
        const data = await response.json();
        if (data.ok) {
            await User.updateOne(
                { token: token },
                {
                    slackToken: data.authed_user.access_token,
                    slackUserId: data.authed_user.id
                }
            );
            return res.send("Slack connected successfully! You can close this window.");
        } else {
            return res.status(400).send("Failed to connect Slack.");
        }
    } catch (error) {
        return res.status(500).send("Error connecting to Slack.");
    }
}

export const disconSlack = async (req, res) => {
    try {
        const user = req.user;
        await User.updateOne({ _id: user._id }, { slackToken: null, slackUserId: null });
        return res.json({ message: "Slack disconnected successfully" });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}


export const updateProfilePic = async (req, res) => {
    try {
        const user = req.user;
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        user.profilePicture = req.file.path;
        await user.save();

        return res.status(200).json({ message: "Profile picture updated successfully" });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const updateUserProfile = async (req, res) => {
    const { newUserData } = req.body || {};
    try {
        const user = req.user;

        const { username, email } = newUserData;

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });

        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(400).json({ message: "Username or email already exists" });
        }
        if (newUserData.password) {
            newUserData.password = await bcrypt.hash(newUserData.password, 10);
        }
        Object.assign(user, newUserData);
        await user.save();

        return res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getUserProfile = async (req, res) => {
    try {
        const user = req.user
        const userProfile = await Profile.findOne({ userId: user._id }).populate("userId", "name email username profilePicture slackUserId");
        return res.json(userProfile);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const updateProfileData = async (req, res) => {
    try {
        const { newProfileData } = req.body;
        const userProfile = req.user;

        const profile = await Profile.findOne({ userId: userProfile._id });
        if (!profile) return res.status(404).json({ message: "Profile not found" });

        Object.assign(profile, newProfileData);
        await profile.save();

        return res.status(200).json({ message: "Profile data updated successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


export const getAllUserProfile = async (req, res) => {
    try {
        const searchQuery = req.query.query || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const matchingUsers = await User.find({
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { username: { $regex: searchQuery, $options: 'i' } }
            ]
        }).select('_id');
        const userIds = matchingUsers.map(user => user._id);
        const profiles = await Profile.find({ userId: { $in: userIds } }).populate("userId", "name username email profilePicture").skip(skip).limit(limit);
        const myUserId = req.user._id;
        const connectionRequests = await ConnectionRequest.find({
            $or: [
                { userId: myUserId, connectionId: { $in: userIds } },
                { userId: { $in: userIds }, connectionId: myUserId }
            ]
        });

        const profilesWithStatus = profiles.map(profile => {
            const profileObj = profile.toObject();

            if (!profileObj.userId || !profileObj.userId._id) {
                profileObj.connectionStatus = 'none';
                return profileObj;
            }

            if (profileObj.userId._id.toString() === myUserId.toString()) {
                profileObj.connectionStatus = 'self';
                return profileObj;
            }

            const conn = connectionRequests.find(c =>
                (c.userId.toString() === myUserId.toString() && c.connectionId.toString() === profileObj.userId._id.toString()) ||
                (c.connectionId.toString() === myUserId.toString() && c.userId.toString() === profileObj.userId._id.toString())
            );

            if (!conn) {
                profileObj.connectionStatus = 'none';
            } else if (conn.status_accepted) {
                profileObj.connectionStatus = 'accepted';
            } else if (conn.userId.toString() === myUserId.toString()) {
                profileObj.connectionStatus = 'pending_sent';
            } else {
                profileObj.connectionStatus = 'pending_received';
            }
            return profileObj;
        });

        return res.json(profilesWithStatus);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}

export const getProfileById = async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await Profile.findOne({ userId: id }).populate("userId", "name username email profilePicture");
        if (!profile) return res.status(404).json({ message: "Profile not found" });
        return res.status(200).json(profile);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}



export const downloadProfile = async (req, res) => {
    const user_id = req.query.id;
    try {
        const userProfile = await Profile.findOne({ userId: user_id }).populate("userId", 'name username email profilePicture');
        await convertUserDataToPDF(userProfile, res);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}



export const sendConnectionRequest = async (req, res) => {
    const { connectionId } = req.body;

    try {
        const user = req.user;
        const connectionUser = await User.findOne({ _id: connectionId });
        if (!connectionUser) return res.status(404).json({ mesage: "Target User not found" });
        if (user._id.toString() === connectionId.toString()) return res.status(400).json({ message: "You can't send connection request to yourself" });
        const existingReq = await ConnectionRequest.findOne({ userId: user._id, connectionId: connectionUser._id });

        if (existingReq) return res.status(400).json({ message: "Connection request already sent" });

        const request = new ConnectionRequest({
            userId: user._id,
            connectionId: connectionUser._id
        });

        await request.save();

        return res.status(200).json({ message: "Connection request sent successfully" });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getMyConReqs = async (req, res) => {
    try {
        const user = req.user;

        const reqs = await ConnectionRequest.find({ userId: user._id }).populate("connectionId", "name email username profilePicture");

        return res.status(200).json({ reqs });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}


export const myCons = async (req, res) => {
    try {
        const user = req.user;
        const conns = await ConnectionRequest.find({ connectionId: user._id }).populate("userId", "name email username profilePicture");

        return res.json(conns);


    } catch (e) {
        return res.status(500).json({ message: e.message });
    }

}


export const acceptCon = async (req, res) => {
    const { requestId, action } = req.body;
    try {
        const user = req.user;
        const conn = await ConnectionRequest.findOne({ _id: requestId, connectionId: user._id });
        if (!conn) return res.status(404).json({ message: "Connection request not found" });
        conn.status_accepted = action == 'accept' ? true : false;
        await conn.save();
        return res.status(200).json({ message: "Connection request accepted successfully" });

    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}