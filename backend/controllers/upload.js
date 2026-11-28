const mongoose = require('mongoose');
const axios = require('axios');
const retry = require('retry'); // Importing the retry library
const AdmZip = require('adm-zip');
const {
    projects,
    Student,
    url,
    geminiapi,
    plagarismapi,
    plagiarismapi,
} = require('../settings/env.js');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const { GoogleGenAI } = require('@google/genai');

const RAPIDAPI_HOST =
    'plagiarism-checker-and-auto-citation-generator-multi-lingual.p.rapidapi.com';
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}/plagiarism`;


const mongoURI = url;
const databaseName = process.env.DB_NAME || 'hackathon';

// Create a MongoClient without the poolSize option
const client = new MongoClient(mongoURI);

let db;

// Function to connect to MongoDB with retry logic
async function connectWithRetry() {
    const operation = retry.operation({
        retries: 5, // Number of retries
        factor: 2, // Exponential backoff factor
        minTimeout: 1000, // Minimum timeout in milliseconds
        maxTimeout: 5000, // Maximum timeout in milliseconds
    });

    return new Promise((resolve, reject) => {
        operation.attempt(async () => {
            try {
                await client.connect();
                db = client.db(databaseName);
                resolve();
            } catch (err) {
                if (operation.retry(err)) {
                    console.error('Error connecting to MongoDB, retrying...');
                    return;
                }
                reject(err);
            }
        });
    });
}

connectWithRetry().catch((error) => {
    console.error('MongoDB connection error:', error);
});

const details = async (req, res) => {
    try {
        if (!db) {
            throw new Error('MongoDB connection not established.');
        }

        const {
            file,
            filename,
            video,
            videoname,
            photos,
            photoname,
            title,
            description,
            languages,
            domain,
            profilePhoto,
            teams,
        } = req.body;
        if (!title || !description || !domain) {
            return res
                .status(400)
                .json({ error: 'Title, description and domain are required' });
        }
        const teamList = Array.isArray(teams) ? teams : [];
        const languageList = Array.isArray(languages) ? languages : [];
        const photoList = Array.isArray(photos) ? photos : [];
        let photoIds = [];
        let videoId;
        let profilePhotoId;
        let fileId;

        let updatedTeams = teamList.map((student) => {
            return {
                id: new mongoose.Types.ObjectId(student._id),
                stuname: student.student_name,
            };
        });
        let studentIds = updatedTeams.map((ite) => ite.id);

        // Upload file to GridFS
        const uploadFile = async (data, name) => {
            const buffer = Buffer.from(data, 'base64');
            const bucket = new GridFSBucket(db);
            const uploadStream = bucket.openUploadStream(name);
            const fileId = uploadStream.id;

            await new Promise((resolve, reject) => {
                uploadStream.end(buffer, (error) => {
                    if (error) {
                        console.error(`Error uploading ${name}:`, error);
                        reject(error);
                    } else {
                        resolve(fileId);
                    }
                });
            });

            return fileId;
        };

        const uploadPhotoPromises = photoList.map(async (photo, i) => {
            const photoId = await uploadFile(photo, `photo_${i}`);
            photoIds.push(photoId);
        });
        await Promise.all(uploadPhotoPromises);

        videoId = videoname ? await uploadFile(video, videoname) : null;
        profilePhotoId = profilePhoto
            ? await uploadFile(profilePhoto, 'profilePhoto')
            : null;
        fileId = filename ? await uploadFile(file, filename) : null;

        // Save project details to MongoDB
        const newproj = new projects({
            Domain: domain,
            Skills: languageList,
            College: req.session.loggedInCollege,
            Project_Name: title.charAt(0).toUpperCase() + title.slice(1),
            Likes: 0,
            Description: description,
            Date: new Date(),
            photo: profilePhotoId,
            Video: videoId,
            Students: updatedTeams,
            photos: photoIds,
            File: fileId,
        });

        await newproj.save();
        const updateStudentSkills = async (
            studentId,
            newSkills,
            domain,
            projectId
        ) => {
            try {
                const studentsCollection = db.collection('students');

                const student = await studentsCollection.findOne({
                    _id: studentId,
                });

                if (student) {
                    const existingSkills = new Set(student.skills || []);

                    newSkills.forEach((skill) => existingSkills.add(skill)); // Add new skills avoiding duplicates

                    const updatedDomains = Array.from(
                        new Set([...(student.Domains || []), domain])
                    ); // Add new domain avoiding duplicates

                    await studentsCollection.updateOne(
                        { _id: studentId },

                        {
                            $set: {
                                skills: [...existingSkills],

                                projects: [
                                    ...(student.projects || []),
                                    projectId,
                                ],

                                Domains: updatedDomains,
                            },
                        }
                    );

                } else {
                    console.error(`Student with ID ${studentId} not found`);
                }
            } catch (error) {
                console.error(
                    'Error updating student skills, projects, and domain:',
                    error
                );
            }
        };

        const projectId = new mongoose.Types.ObjectId(newproj._id);

        // Update skills for students
        for (const studentId of studentIds) {
            await updateStudentSkills(studentId, languageList, domain, projectId);
        }

        res.status(200).json({
            message: 'Project details saved successfully',
            error: 'ok',
        });
    } catch (error) {
        console.error('Error uploading project details:', error);
        res.status(500).json({ error: 'Error uploading project details' });
    }
};

const getFile = async (req, res) => {
    const fileId = req.body.data;
    try {
        if (!db) {
            throw new Error('MongoDB connection not established.');
        }
        const bucket = new GridFSBucket(db);

        const fileDocument = await db
            .collection('fs.files')
            .findOne({ _id: new ObjectId(fileId) });
        if (!fileDocument) {
            return res.status(404).send('File not found');
        }

        // Store the filename in a variable
        const filename = fileDocument.filename;

        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

        let data = [];
        downloadStream.on('data', (chunk) => {
            data.push(chunk);
        });

        downloadStream.on('end', async () => {
            try {
                const buffer = Buffer.concat(data);
                const zip = new AdmZip(buffer);
                const zipEntries = zip.getEntries();
                const folderStructure = getFolderStructure(zipEntries);
                const fileContents = {};
                zipEntries.forEach((zipEntry) => {
                    const textFileExtensions = [
                        '.txt', '.csv', '.json', '.xml', '.yml', '.md',
                        '.html', '.js', '.jsx', '.ts', '.tsx', '.css',
                        '.scss', '.sass', '.less', '.py', '.cpp', '.c',
                        '.cs', '.java', '.php', '.rb', '.go', '.rs',
                        '.swift', '.kt', '.d.ts', '.LICENSE',
                    ];
                    if (
                        textFileExtensions.some((ext) =>
                            zipEntry.name.endsWith(ext)
                        )
                    ) {
                        const fileContentsBuffer = zipEntry.getData();
                        const contents = fileContentsBuffer.toString('utf8');
                        fileContents[zipEntry.entryName] = contents;
                    }
                });
                res.status(200).json({
                    filename,
                    folderStructure,
                    fileContents,
                });
            } catch (error) {
                console.error('Error extracting zip file:', error);
                res.status(500).send(
                    'Internal Server Error - Invalid Zip Format'
                );
            }
        });

        downloadStream.on('error', (error) => {
            console.error('Error fetching file:', error);
            res.status(500).send(`Error fetching file ${filename}`);
        });
    } catch (error) {
        console.error('Error fetching file content:', error);
        res.status(500).send('Internal Server Error');
    }
};
function getFolderStructure(zipEntries) {
    const folderStructure = {};

    zipEntries.forEach((zipEntry) => {
        const pathComponents = zipEntry.entryName.split('/');
        let currentFolder = folderStructure;

        pathComponents.forEach((component, index) => {
            if (index === pathComponents.length - 1) {
                currentFolder[component] = null;
            } else {
                if (!currentFolder[component]) {
                    currentFolder[component] = {};
                }
                currentFolder = currentFolder[component];
            }
        });
    });

    return folderStructure;
}

const explainCode = async (req, res) => {
  try {
    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: 'Missing code to explain' });
    }
    if (!geminiapi) {
      return res.status(500).json({ error: 'Code explanation is not configured' });
    }
    const code = "Use only normal text. Don't use markdown. Explain the following code:-  " + req.body.data;

    const ai = new GoogleGenAI({ apiKey: geminiapi });
    const model = 'gemini-2.5-flash';
    const result = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: code }] }],
      generationConfig: {
        temperature: 1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
        response_mime_type: 'text/plain'
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }); 

    res.status(200).json({ ans: result.text });
  } catch (error) {
    console.error('Error explaining code:', error.message);
    res.status(500).json({ error: 'Failed to explain code' });
  }
};

const checkPlagarism = async (req, res) => {
    const textToCheck = req.body.textToCheck;
    if (!textToCheck) {
        return res.status(400).json({ error: 'Missing text to check' });
    }
    const rapidApiKey = plagiarismapi || plagarismapi;
    if (!rapidApiKey) {
        return res.status(500).json({ error: 'Plagiarism check is not configured' });
    }
    const options = {
        method: 'POST',
        url: RAPIDAPI_URL,
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
        data: {
            text: textToCheck,
            language: 'en',
            includeCitations: req.body.includeCitations || false,
            scrapeSources: req.body.scrapeSources || false,
        },
    };

    try {
        const response = await axios.request(options);
        const answer = response.data.percentPlagiarism;
        res.json(answer);
    } catch (error) {
        console.error('Plagiarism check failed:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
const checkPlagiarism = checkPlagarism;

const getPhoto = async (req, res) => {
    try {
        const photoId = req.body.photoId; // Your photoId
        const bucket = new GridFSBucket(db);

        // Check if photoId is valid
        if (!ObjectId.isValid(photoId)) {
            return res.status(400).json({ message: 'Invalid photoId' });
        }

        const fileId = new ObjectId(photoId);
        const file = await bucket.find({ _id: fileId }).next();

        // Check if file exists
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Set appropriate content type
        if (file.contentType) {
            res.set('Content-Type', file.contentType);
        }

        // Read output to browser

        const downloadStream = bucket.openDownloadStream(fileId);
        downloadStream.pipe(res);
    } catch (error) {
        console.error('Error getting photo:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
const uploadProfilePhoto = async (req, res) => {
  try {
    const { profilePhoto, pphotoname, userId } = req.body;
    if (!profilePhoto || !pphotoname || !userId) {
      return res.status(400).json({ success: false, message: 'Missing photo data' });
    }
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    let buffer;
    try {
      buffer = Buffer.from(profilePhoto, 'base64');
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid photo encoding' });
    }
    const bucket = new GridFSBucket(db);

    // Adjust the content type based on your actual content type
    const contentType = 'image/jpeg';

    const uploadStream = bucket.openUploadStream(pphotoname, { contentType });
    const fileId = uploadStream.id;

    await new Promise((resolve, reject) => {
        uploadStream.end(buffer, (error) => {
            if (error) {
                console.error(`Error uploading ${pphotoname}:`, error);
                reject(error);
            } else {
                resolve(fileId);
            }
        });
    });

    // Update student document with fileId
    const studentsCollection = db.collection('students');
    const filter = { _id: new ObjectId(userId) };
    const updateDoc = { $set: { photo: fileId } };
    const result = await studentsCollection.updateOne(filter, updateDoc);

    if (result.modifiedCount === 1) {
        res.json({
            success: true,
            message: 'Profile photo updated successfully.',
        });
    } else {
        res.status(404).json({ success: false, message: 'Student not found.' });
    }
  } catch (error) {
    console.error('Error uploading profile photo:', error.message);
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
};

const updateDescription = async (req, res) => {
    try {
        const { studentDescription, studentorganization, studentfield, userId } =
            req.body;
        if (!userId || !ObjectId.isValid(userId)) {
            return res.status(400).send('Invalid user id.');
        }
        const student = await Student.findById(userId);
        if (!student) {
            return res.status(404).send('Student not found.');
        }
        if (studentDescription !== undefined) {
            student.Description = studentDescription;
        }
        if (studentorganization) {
            student.college_name = studentorganization;
        }
        if (studentfield) {
            student.field_name = studentfield;
        }
        await student.save();
        res.status(200).send('Description updated successfully.');
    } catch (error) {
        console.error('Error updating description:', error.message);
        res.status(500).send('An error occurred while updating description.');
    }
};

module.exports = {
    details,
    getFile,
    explainCode,
    checkPlagarism,
    checkPlagiarism,
    getPhoto,
    uploadProfilePhoto,
    updateDescription,
};
