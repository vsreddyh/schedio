const express = require("express");
const path = require("path");
require("dotenv").config();
const app = express();
const cors = require("cors");
const session = require("express-session");
const bodyParser = require("body-parser");
const approute = require("./route.js");
const cookieParser = require("cookie-parser");
var MongoDBStore = require("connect-mongodb-session")(session);
const port = process.env.PORT || 3001;

const { SESSION_KEY, url, FRONTEND_URL } = require("./settings/env.js");
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? `${FRONTEND_URL}` : "*",
    credentials: true,
  }),
);

app.use(bodyParser.json({ limit: "50mb" })); //limit limits the data which can be uploaded to server.js from frontend
var store = new MongoDBStore({
  uri: url,
  collection: "mySessions",
});
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(cookieParser(SESSION_KEY));
app.use(
  session({
    secret: SESSION_KEY,
    resave: false,
    store: store,
    saveUninitialized: false,
    cookie: {
      sameSite: process.env.NODE_ENV === "production" ? "strict" : false,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 6 * 60 * 60 * 1000, //6 hours
      rolling: true, //whenever session is modified it resets expirytime
    },
  }),
);

app.use("/en", approute); //routing to all functions

//checks if session is expired
app.get("/checksessionexpiry", async (req, res) => {
  a = req.session.loggedInemail;
  if (a !== undefined) {
    res.json(1);
  } else {
    res.json(req.session);
  }
});

app.get("*", function (req, res) {
  console.log(req.path);
});

app.listen(port, function (req, res) {
  console.log(
    "server is running on Production:-",
    process.env.NODE_ENV ? "false" : "true",
  );
});
