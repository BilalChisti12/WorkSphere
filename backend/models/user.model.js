import mongoose from 'mongoose';

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type:String,
        required:true,
        unique:true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    active: {
        type: Boolean,
        default: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture : {
        type : String,
        default : 'default.jpg'
        
    },
    createdAt : {
        type : Date,
        default : Date.now
    },
    token : {
        type : String,
        default : ''
    },
    slackToken: {
        type: String,
        default: null
    },
    slackUserId: {
        type: String,
        default: null
    }

});


const User = mongoose.model("User", userSchema);

export default User;