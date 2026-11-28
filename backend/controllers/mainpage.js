const mongoose = require("mongoose");
require("dotenv").config();
const natural = require("natural");
const {
  college,
  projects,
  Student,
  url,
  recruiter,
  skills,
} = require("../settings/env.js");
const { ObjectId } = require("mongodb");
const conn = mongoose.createConnection(url);
let gfs;
conn.once("open", () => {
  // Init stream
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "fs",
  });
});

//suggest college names
const getdata = async (req, res) => {
  try {
    if (req.query.term !== "") {
      const term = req.query.term;
      const regex = new RegExp(term, "i");
      const colleges = await college
        .find({ college_name: regex })
        .select("college_name")
        .limit(4);
      const suggestions = colleges.map((college) => college.college_name);
      res.json(suggestions);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch colleges" });
  }
};

//return projects for hr main
const projectlist = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    let { category, college_name, sort_by, order, page } = req.query;
    let catquery = { Domain: category };
    let clgquery = { College: college_name };
    let sortquery = {};
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const u_limit = pageNum * 10;
    const l_limit = u_limit - 10;
  if (category === "Any") {
    catquery = {};
  }
  if (college_name === "Any") {
    clgquery = {};
  }
  if (order === "true") {
    order = 1;
  } else {
    order = -1;
  }
  if (sort_by === "Name") {
    sortquery = { Project_Name: order };
  } else if (sort_by === "Likes") {
    sortquery = { Likes: order };
  } else if (sort_by === "Upload Date") {
    sortquery = { Date: order };
  }
  const projlists = await projects
    .find({ $and: [clgquery, catquery] })
    .sort(sortquery);
  const a = ~~(projlists.length / 10);
  let m;
  if (projlists.length === 0) {
    m = 5;
  } else {
    m = 2;
  }
  res.json({
    list: projlists.slice(l_limit, u_limit),
    total_pages: a + 1,
    display: m,
  });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

const collegeprojdisplay = async (req, res) => {
  try {
    const college = req.session.loggedInCollege;
    const receivedData = req.body.receivedData;
    const query = { College: college };
    let sortField = "Date";
    let sortOrder = -1;

    if (receivedData.sort_by === "Likes") {
      sortField = "Likes";
    } else if (receivedData.sort_by === "Upload Date") {
      sortField = "Date";
    }

    sortOrder = receivedData.order ? 1 : -1;

    const projlists = await projects
      .find(query)
      .sort({ [sortField]: sortOrder })
      .select("photo Project_Name Description Skills");

    res.json({ list: projlists, college: college });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//pipe image
const image = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id.length !== 24) {
      return res.status(400).json({ error: "Invalid image id" });
    }
    const fileId = new mongoose.Types.ObjectId(id);
    gfs.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    res.status(500).json({ error: "Failed to load image" });
  }
};

const commentimage = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const Id = new mongoose.Types.ObjectId(req.params.id);
    const stinfo = await Student.findOne({ _id: Id });
    const hrinfo = await recruiter.findOne({ _id: Id });
    const photoid = stinfo ? stinfo.photo : hrinfo ? hrinfo.photo : null;
    if (!photoid || !ObjectId.isValid(String(photoid))) {
      return res.status(404).json({ error: "Photo not found" });
    }
    const fileId = new mongoose.Types.ObjectId(String(photoid));
    gfs.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    res.status(500).json({ error: "Failed to load image" });
  }
};

const getstudata = async (req, res) => {
  try {
    const data = req.body.data;
    if (!ObjectId.isValid(data)) {
      return res.status(400).json({ error: "Invalid student id" });
    }
    const studentId = new mongoose.Types.ObjectId(data);
    const stinfo = await Student.findOne({ _id: studentId });
    if (!stinfo) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(stinfo);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student" });
  }
};
const fetchprojdata = async (req, res) => {
  try {
    const datas = req.body.data;
    const array = [];
    for (let key in datas) {
      let data = datas[key];
      if (!ObjectId.isValid(data)) continue;
      let projId = new mongoose.Types.ObjectId(data);
      let projinfo = await projects.findOne({ _id: projId });
      if (projinfo) array.push(projinfo);
    }
    res.json(array);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

//add bookmark
const addbookmark = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    const id = req.body.data;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const oid = new mongoose.Types.ObjectId(id);
    const user = await recruiter.findOne({ email_address: mail });
    if (!user) {
      return res.status(404).json({ error: "Recruiter not found" });
    }
    const list = user.bookmarks || [];
    if (!list.some((item) => String(item) === String(oid))) {
      list.push(oid);
      user.bookmarks = list;
      await user.save();
    }
    res.json("success");
  } catch (error) {
    res.status(500).json({ error: "Failed to add bookmark" });
  }
};

//remove bookmark
const removebookmark = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    const id = req.body.data;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const oid = new mongoose.Types.ObjectId(id);
    const user = await recruiter.findOne({ email_address: mail });
    if (!user) {
      return res.status(404).json({ error: "Recruiter not found" });
    }
    const list = user.bookmarks || [];
    const index = list.findIndex((item) => String(item) === String(oid));
    if (index !== -1) {
      list.splice(index, 1);
      user.bookmarks = list;
      await user.save();
    }
    res.json("success");
  } catch (error) {
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
};

//check bookmark
const checkbookmark = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    const id = req.body.data;
    if (!ObjectId.isValid(id)) {
      return res.json(0);
    }
    const oid = new mongoose.Types.ObjectId(id);
    const user = await recruiter.findOne({ email_address: mail });
    if (!user) {
      return res.json(0);
    }
    const list = user.bookmarks || [];
    res.json(Number(list.some((item) => String(item) === String(oid))));
  } catch (error) {
    res.status(500).json({ error: "Failed to check bookmark" });
  }
};
const validateurl = async (req, res) => {
  let { projid } = req.query;
  try {
    const oid = new mongoose.Types.ObjectId(projid);
    const projlist = await projects.find({ _id: oid });
    const stulist = await Student.find({ _id: oid });
    if (projlist.length !== 0) {
      res.json(1);
    } else if (stulist.length !== 0) {
      res.json(2);
    } else {
      res.json(0);
    }
  } catch (error) {
    res.json(0);
  }
};

//return projects by search
const tokenizer = new natural.WordTokenizer();
const getSearchProjects = async (req, res) => {
  try {
    const term = req.query.term || "";
    const tokens = tokenizer.tokenize(term) || [];
    const partialSearchResults = await projects.find({
      $or: [
        { Project_Name: { $regex: term, $options: "i" } },
        { College: { $regex: term, $options: "i" } },
        { Description: { $regex: term, $options: "i" } },
        { Domain: { $regex: term, $options: "i" } },
        { Comments: { $regex: term, $options: "i" } },
      ],
    });
    const term1 = tokens.length
      ? await projects.find({ $text: { $search: tokens.join(" ") } })
      : [];
    let combinedResults1 = [...term1];

    partialSearchResults.forEach((result) => {
      if (!combinedResults1.some((item) => item._id.equals(result._id))) {
        combinedResults1.push(result);
      }
    });

    res.json(combinedResults1);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
};

//return projects by domain
const getDomainProjects = async (req, res) => {
  try {
    const term = req.query.term;
    const term1 = await projects.find({ Domain: term });
    res.json(term1);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch domain projects" });
  }
};

//return liked projects
const getlikedprojects = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    const term1 = await Student.findOne({ email_address: mail }).select("likes");
    if (!term1) {
      return res.status(404).json({ error: "Student not found" });
    }
    const list = term1.likes || [];
    const objectidlist = list
      .filter((id) => ObjectId.isValid(String(id)))
      .map((id) => new mongoose.Types.ObjectId(String(id)));
    const listo = await projects.find({ _id: { $in: objectidlist } });
    res.json(listo);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch liked projects" });
  }
};
//return student details
const getstudentdetails = async (req, res) => {
  try {
    const user = req.session.loggedInemail;
    const search = await Student.findOne({ email_address: user });
    if (!search) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(search);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student" });
  }
};

//returns projects made by specific student
const getstudentproject = async (req, res) => {
  try {
    const email = req.session.loggedInemail;
    const search = await Student.findOne({ email_address: email });
    if (!search) {
      return res.status(404).json({ error: "Student not found" });
    }
    const user = search.projects || [];
    const suggestion = await projects.find({ _id: { $in: user } });
    res.json(suggestion);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student projects" });
  }
};

//returns project data from id
const getprojectdata = async (req, res) => {
  try {
    const data = req.body.data;
    if (!ObjectId.isValid(data)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const projId = new mongoose.Types.ObjectId(data);
    const projinfo = await projects.findOne({ _id: projId });
    if (!projinfo) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(projinfo);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
};

//add comment
const addcomment = async (req, res) => {
  try {
    const { projid, commentdata } = req.body;
    const mail = req.session.loggedInemail;
    if (!ObjectId.isValid(projid) || !commentdata) {
      return res.status(400).json({ error: "Invalid comment request" });
    }
    const date = new Date();
    const projId = new mongoose.Types.ObjectId(projid);
    const projinfo = await projects.findOne({ _id: projId });
    if (!projinfo) {
      return res.status(404).json({ error: "Project not found" });
    }
    const comments = projinfo.Comments || [];
    if (req.session.typeofuser === 0) {
      const stuinfo = await Student.findOne({ email_address: mail });
      if (!stuinfo) {
        return res.status(404).json({ error: "Student not found" });
      }
      comments.push({
        id: stuinfo._id,
        studentname: stuinfo.student_name,
        Date: date,
        comment: commentdata,
      });
    } else {
      const hrinfo = await recruiter.findOne({ email_address: mail });
      if (!hrinfo) {
        return res.status(404).json({ error: "Recruiter not found" });
      }
      comments.push({
        id: hrinfo._id,
        photoid: hrinfo.photo,
        studentname: hrinfo.hr_name,
        Date: date,
        comment: commentdata,
      });
    }
    projinfo.Comments = comments;
    await projinfo.save();
    res.json("success");
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
};
const deletecomment = async (req, res) => {
  try {
    const { index, id } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid project id" });
    }
    const projinfo = await projects.findOne({ _id: id });
    if (!projinfo) {
      return res.status(404).json({ error: "Project not found" });
    }
    const comments = projinfo.Comments || [];
    if (index < 0 || index >= comments.length) {
      return res.status(400).json({ error: "Invalid comment index" });
    }
    comments.splice(index, 1);
    projinfo.Comments = comments;
    await projinfo.save();
    res.json("success");
  } catch (error) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
};

//get project by skills
const getskillproject = async (req, res) => {
  try {
    const term = req.query.term || "";
    const regex = RegExp(term, "i");
    const result = await projects.find({ Skills: regex });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

const getskillList = async (req, res) => {
  try {
    const term = req.query.term || "";
    const term1 = term.split(",").map((s) => s.trim()).filter(Boolean);
    if (term1.length === 0) {
      return res.json([]);
    }
    const result = await projects.find({ Skills: { $all: term1 } });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

//random projects

const getmostlikedprj = async (req, res) => {
  try {
    const topProjects = await projects.find({}).sort({ Likes: -1 }).limit(5);
    res.json(topProjects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

//add like
const addlike = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    const id = req.body.data;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const oid = new mongoose.Types.ObjectId(id);
    const project = await projects.findOne({ _id: oid });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    project.Likes = (project.Likes || 0) + 1;
    await project.save();
    const user = await Student.findOne({ email_address: mail });
    if (!user) {
      return res.status(404).json({ error: "Student not found" });
    }
    const list = user.likes || [];
    if (!list.some((item) => String(item) === String(oid))) {
      list.push(oid);
      user.likes = list;
      await user.save();
    }
    res.json("success");
  } catch (error) {
    res.status(500).json({ error: "Failed to add like" });
  }
};
const removelike = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    const id = req.body.data;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const oid = new mongoose.Types.ObjectId(id);
    const project = await projects.findOne({ _id: oid });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    project.Likes = Math.max((project.Likes || 1) - 1, 0);
    await project.save();
    const user = await Student.findOne({ email_address: mail });
    if (!user) {
      return res.status(404).json({ error: "Student not found" });
    }
    const list = user.likes || [];
    const index = list.findIndex((item) => String(item) === String(oid));
    if (index !== -1) {
      list.splice(index, 1);
      user.likes = list;
      await user.save();
    }
    res.json("success");
  } catch (error) {
    res.status(500).json({ error: "Failed to remove like" });
  }
};
const checklike = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    const id = req.body.data;
    if (!ObjectId.isValid(id)) {
      return res.json(0);
    }
    const oid = new mongoose.Types.ObjectId(id);
    const user = await Student.findOne({ email_address: mail });
    if (!user) {
      return res.json(0);
    }
    const list = user.likes || [];
    res.json(Number(list.some((item) => String(item) === String(oid))));
  } catch (error) {
    res.status(500).json({ error: "Failed to check like" });
  }
};
const getrecentprj = async (req, res) => {
  try {
    const topProjects = await projects.find({}).sort({ Date: -1 }).limit(5);
    res.json(topProjects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};
const getcollegeprojects = async (req, res) => {
  try {
    const college = req.session.loggedInCollege;
    const term = req.query.term;

    const startOfYear = new Date(`${term}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${parseInt(term) + 1}-01-01T00:00:00.000Z`);

    const projectsData = await projects.find({
      College: college,
      Date: { $gte: startOfYear, $lt: endOfYear },
    });

    const allMonths = Array.from({ length: 12 }, (_, index) => ({
      month: new Date(`${term}-${index + 1}-01`).toLocaleString("en-US", {
        month: "long",
      }),
      projectsCount: 0,
    }));

    projectsData.forEach((project) => {
      const month = project.Date.getMonth() + 1;
      allMonths[month - 1].projectsCount += 1;
    });

    res.json(allMonths);
  } catch (error) {
    console.error("Error fetching college projects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getcollegedomainprojects = async (req, res) => {
  try {
    const college = req.session.loggedInCollege;
    const term = req.query.term;

    const startOfYear = new Date(`${term}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${parseInt(term) + 1}-01-01T00:00:00.000Z`);

    const projectsData = await projects.find({
      College: college,
      Date: { $gte: startOfYear, $lt: endOfYear },
    });

    const domainCounts = {};

    projectsData.forEach((project) => {
      const domain = project.Domain;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    });

    const result = Object.entries(domainCounts).map(
      ([domain, projectsCount]) => ({
        domain,
        projectsCount,
      }),
    );

    res.json(result);
  } catch (error) {
    console.error("Error fetching college projects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const gethrdetails = async (req, res) => {
  try {
    const hr = req.session.loggedInemail;
    const info = await recruiter.findOne({ email_address: hr });
    if (!info) {
      return res.status(404).json({ error: "Recruiter not found" });
    }
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recruiter" });
  }
};
const getCollDetails = async (req, res) => {
  try {
    const name = req.session.loggedInemail;
    const clg = await college.findOne({ email_address: name });
    if (!clg) {
      return res.status(404).json({ error: "College not found" });
    }
    res.json(clg);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch college" });
  }
};

const getSearchProjectscollege = async (req, res) => {
  try {
    const name = req.session.loggedInCollege;
    const term = req.query.term || "";
    const tokens = tokenizer.tokenize(term) || [];
    const partialSearchResults = await projects.find({
      $or: [
        { Project_Name: { $regex: term, $options: "i" } },

        { Description: { $regex: term, $options: "i" } },
        { Domain: { $regex: term, $options: "i" } },
        { Comments: { $regex: term, $options: "i" } },
      ],
      $and: [{ College: name }],
    });
    const term1 = tokens.length
      ? await projects.find({
          $and: [{ $text: { $search: tokens.join(" ") } }, { College: name }],
        })
      : [];

    let combinedResults1 = [...term1];

    partialSearchResults.forEach((result) => {
      if (!combinedResults1.some((item) => item._id.equals(result._id))) {
        combinedResults1.push(result);
      }
    });

    res.json(combinedResults1);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
};
const getNoofprojects = async (req, res) => {
  try {
    const collegeName = req.session.loggedInCollege;
    const term = req.query.term;
    const startOfYear = new Date(`${term}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${parseInt(term, 10) + 1}-01-01T00:00:00.000Z`);
    const projectsData = await projects.find({
      College: collegeName,
      Date: { $gte: startOfYear, $lt: endOfYear },
    });
    res.json(projectsData.length);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project count" });
  }
};
const hrmainsearch = async (req, res) => {
  try {
    const { type, search } = req.query;
    if (!search || !type) {
      return res.json([]);
    }

    if (type === "Student Search") {
      const name = tokenizer.tokenize(search) || [];
      if (name.length === 0) {
        return res.json([]);
      }
      const regex = new RegExp(name.join("|"), "i");
    const search1 = await Student.find({ $text: { $search: name.join(" ") } });

    const searchResultsRegex = await Student.find({
      $or: [
        { student_name: { $regex: regex } },
        { email_address: { $regex: regex } },
        { field_name: { $regex: regex } },
        { Description: { $regex: regex } },
      ],
    });

    let combinedResults = [];

    combinedResults.push(...search1);

    searchResultsRegex.forEach((result) => {
      if (!combinedResults.some((item) => item._id.equals(result._id))) {
        combinedResults.push(result);
      }
    });

    res.json(combinedResults);
  } else if (type === "Project Search") {
    const tokens = tokenizer.tokenize(search) || [];

    const partialSearchResults = await projects.find({
      $or: [
        { Project_Name: { $regex: search, $options: "i" } },
        { College: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
        { Domain: { $regex: search, $options: "i" } },
        { Comments: { $regex: search, $options: "i" } },
      ],
    });

    const term1 = tokens.length
      ? await projects.find({ $text: { $search: tokens.join(" ") } })
      : [];

    let combinedResults1 = [...term1];

    partialSearchResults.forEach((result) => {
      if (!combinedResults1.some((item) => item._id.equals(result._id))) {
        combinedResults1.push(result);
      }
    });

    res.json(combinedResults1);
  } else {
    res.json([]);
  }
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
};

const getbookmarks = async (req, res) => {
  try {
    const mail = req.session.loggedInemail;
    const search = await recruiter
      .findOne({ email_address: mail })
      .select("bookmarks");
    if (!search) {
      return res.status(404).json({ error: "Recruiter not found" });
    }
    const list = search.bookmarks || [];
    const array = [];
    for (const key1 of list) {
      if (!ObjectId.isValid(String(key1))) continue;
      const stuId = new mongoose.Types.ObjectId(String(key1));
      const stuinfo = await Student.findOne({ _id: stuId });
      if (stuinfo) array.push(stuinfo);
    }
    res.json(array);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
};

module.exports = {
  getdata,
  projectlist,
  image,
  commentimage,
  getstudata,
  getprojectdata,
  fetchprojdata,
  addbookmark,
  removebookmark,
  checkbookmark,
  validateurl,
  getDomainProjects,
  getSearchProjects,
  getstudentdetails,
  getstudentproject,
  addcomment,
  deletecomment,
  getskillproject,
  getmostlikedprj,
  addlike,
  removelike,
  checklike,
  getskillList,
  getlikedprojects,
  getrecentprj,
  collegeprojdisplay,
  getcollegeprojects,
  getcollegedomainprojects,
  gethrdetails,
  getCollDetails,
  getSearchProjectscollege,
  getNoofprojects,
  hrmainsearch,
  getbookmarks,
};

