const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const url = process.env.url || process.env.MONGODB_URL;
if (!url) {
    console.error('Missing MongoDB connection string (env: url)');
}
mongoose.connect(url).catch((err) => {
    console.error('MongoDB connection error:', err.message);
});

const loginSchema = new mongoose.Schema({
    student_name : String,
    email_address : String,
    password : String,
    field_name:String, //field name is employement status
    college_name:String,
    photo:ObjectId,
    projects:[ObjectId],
    Description:String,
    skills:[String],
    Domains:[String],
    likes:[ObjectId],
},{ versionKey: false });
const collegeSchema = new mongoose.Schema({
    college_name: String,
    email_address: String,
    type:String,
    password:String,
  },{ versionKey: false });
const hrSchema = new mongoose.Schema({
    hr_name : String,
    photo : ObjectId,
    email_address : String,
    password : String,
    company_name:String,
    bookmarks:[ObjectId]
},{ versionKey: false });
const departmentSchema=new mongoose.Schema({
    field_name:String,
},{ versionKey: false });
const projectschema = new mongoose.Schema({
    Domain:String,
    Skills:Array,
    College:String,
    Project_Name:String,
    Likes:Number,
    Description:String,
    Discussion:Array,
    Date:Date,
    photo:ObjectId,
    Video:ObjectId,
    Comments:Array,
    Students:Array,
    photos:Array,
    File:ObjectId
},{ versionKey: false });
const skillSchema=new mongoose.Schema({
    skill_name:String,
},{ versionKey: false });

const Student = mongoose.model('student', loginSchema);
const recruiter = mongoose.model('head_recruiter', hrSchema);
const college=mongoose.model('college',collegeSchema);
const Department =mongoose.model('feild',departmentSchema);
const projects = mongoose.model('project',projectschema);
const skills=mongoose.model('skill',skillSchema);

module.exports = {
    EMAIL: process.env.EMAIL,
    PASSWORD: process.env.PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_KEY: process.env.SESSION_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL,
    Student: Student,
    plagarismapi: process.env.plagarismapi, // deprecated typo, kept for compat
    plagiarismapi: process.env.plagarismapi || process.env.plagiarismapi,
    geminiapi: process.env.geminiapi,
    college:college,
    Department:Department,
    projects:projects,
    recruiter:recruiter,
    skills:skills,
    url:url,
}
