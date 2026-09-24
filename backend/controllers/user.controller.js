import User from "../models/user.model.js"
import bcrypt from 'bcrypt';
import Profile from '../models/profile.model.js';
import ConnectionRequest from "../models/connection.model.js";
import mongoose from "mongoose";
import path from "path";
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import fs from 'fs';


const convertUserDataToPDF = async (userData) => {
    if(!userData) throw new Error("User Data Missing");
    if(!userData.userId) throw new Error("User ID missing");
    const doc = new PDFDocument();
    const outputPath = `${crypto.randomBytes(24).toString("hex")}_${Date.now()}.pdf`;
    const filePath = path.join("uploads",outputPath);
    if(!fs.existsSync("uploads")){
        fs.mkdirSync("uploads", { recursive: true });
    }
    const stream = fs.createWriteStream(filePath, {flags: "wx"});
    doc.pipe(stream);
    const imagePath = path.join("uploads", userData.userId.profilePicture);
    if (fs.existsSync(imagePath)) {
        doc.image(imagePath, { width: 100, height: 100 });
    }
    doc.fontSize(100).text(`Name: ${userData.userId.name}`);
    doc.fontSize(14).text(`Email: ${userData.userId.email}`);
    doc.fontSize(14).text(`Bio: ${userData.bio}`);
    doc.fontSize(14).text(`Current Post: ${userData.currentPost}`);
    doc.fontSize(14).text("Past Woork: ")
    userData.pastWork.forEach((work, index) => {
        doc.fontSize(14).text(`${index + 1}. ${work.company}, ${work.position}, ${work.years}`);
    })
    doc.fontSize(14).text("Education: ")
    userData.education.forEach((education, index) => {
        doc.fontSize(14).text(`${index + 1}. ${education.school}, ${education.degree}, ${education.fieldOfStudy}`);
    })
    doc.fontSize(14).text("Skills: ")
    userData.skills.forEach((skill, index) => {
        doc.fontSize(14).text(`${index + 1}. ${skill.skill}, ${skill.priority}`);
    })
    doc.end();
    return outputPath;
}



export const register = async (req, res) => {
    try {
        const { name, email, password, username } = req.body || {};
        if (!name || !email || !password || !username) {
            return res.status(400).json({
                sucess: false,
                message: "All fields are required"
            });
        }
        if(password.trim() === '') return res.status(400).json({message: "Password cannot be empty"});
        if(name.trim() === '') return res.status(400).json({message: "Name cannot be empty"});
        if(email.trim() === '') return res.status(400).json({message: "Email cannot be empty"});
        if(username.trim() === '') return res.status(400).json({message: "Username cannot be empty"});
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
        const token = crypto.randomBytes(32).toString("hex");
        await User.updateOne({ _id: user._id }, { token });
        return res.json({ token, message: "Login successfully" });
    }
    catch (error) {
        console.log("Login error:", error);
        return res.status(500).json({
            sucess: false,
            message: "internal server error"
        });
    }
}

export const connectSlack = async (req, res) => {
    const { token } = req.query; 
    const slackURL = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&user_scope=chat:write&state=${token}`;
    res.redirect(slackURL);
}

export const slackCallback = async (req, res) => {
    const { code, state } = req.query; 
    try {
        const response = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID,
                client_secret: process.env.SLACK_CLIENT_SECRET,
                code: code
            })
        });
        const data = await response.json();
        if (data.ok) {
            await User.updateOne(
                { token: state }, 
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


export const updateProfilePic = async (req, res) => {
    const { token } = req.body;
    try {

        const user = await User.findOne({ token }) || {};
        if (!user) return res.status(400).json({ message: "user not found" });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        user.profilePicture = req.file.filename;
        await user.save();

        return res.status(200).json({ message: "Profile picture updated successfully" });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const updateUserProfile = async (req, res) => {
    const { token, ...newUserData } = req.body || {};
    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(400).json({ message: "user not found" });

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
        const { token } = req.query || {};
        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        const user = await User.findOne({ token });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userProfile = await Profile.findOne({ userId: user._id }).populate("userId", "name email username profilePicture");
        return res.json(userProfile);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const updateProfileData = async (req, res) => {
    try {
        const { token, ...newProfileData } = req.body;
        const userProfile = await User.findOne({ token });
        if (!userProfile) return res.status(404).json({ message: "User not found" });

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
        const search = await Profile.find().populate("userId", 'name username email profilePicture');
        return res.json({ search });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


export const downloadProfile = async (req, res) => {
    const user_id = req.query.id;
    try {
        const userProfile = await Profile.findOne({ userId: user_id }).populate("userId", 'name username email profilePicture');
        let a = await convertUserDataToPDF(userProfile);
        return res.json({ "message": a });
    } catch (error) {
        return res.json({ message: error.message });
    }
}


export const sendConnectionRequest = async (req, res) =>{
    const{token, connectionId} = req.body;

    try{
        const user = await User.findOne({token});
        if(!user) return res.status(404).json({message:"User not found"});

        const connectionUser = await User.findOne({_id: connectionId});
        if(!connectionUser) return res.status(404).json({mesage:"Target User not found"});
        if(user._id === connectionId) return res.status(400).json({message:"You can't send connection request to yourself"});
        const existingReq = await ConnectionRequest.findOne({userId: user._id , connectionId: connectionUser._id});

        if(existingReq) return res.status(400).json({message:"Connection request already sent"});

        const request = new ConnectionRequest({
            userId: user._id,
            connectionId: connectionUser._id
        });

        await request.save();

        return res.status(200).json({message:"Connection request sent successfully"});

    }catch(error){
        return res.status(500).json({message: error.message});
    }
}

export const getMyConReqs = async (req, res) => {
    const {token} = req.body;
    try{
        const user = await User.findOne({token});
        if(!user) return res.status(404).json({message:"User not found"});

        const reqs = await ConnectionRequest.find({userId: user._id}).populate("connectionId","name email username profilePicture");

        return res.status(200).json({reqs});
        
    }catch(err){
        return res.status(500).json({message:err.message});
    }
}


export const myCons = async (req, res) => {
    const {token} = req.body;
    try{
        const user = await User.findOne({token});
        if(!user) return res.status(404).json({message:"User not found"});
        const conns = await ConnectionRequest.find({connectionId: user._id}).populate("userId", "name email username profilePicture");

        return res.json(conns);

        
    }catch(e){
        return res.status(500).json({message: e.message});
    }

}


export const acceptCon = async (req, res) => {
    const {token, requestId, action} = req.body;
    try{

        const user = await User.findOne({token});
        if(!user) return res.status(404).json({message:"User not found"});

        const conn = await ConnectionRequest.findOne({_id: requestId});
        if(!conn) return res.status(404).json({message:"Connection request not found"});

        conn.status_accepted = action=='accept' ? true : false;
        await conn.save();

        return res.status(200).json({message:"Connection request accepted successfully"});

    }catch(e){
        return res.status(500).json({message: e.message});
    }
}