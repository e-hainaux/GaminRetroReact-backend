var express = require("express");
const cors = require("cors"); // Installation de Cors
require("dotenv").config();

require("./models/connection");

var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var adminRouter = require("./routes/admin");
var gamesRouter = require("./routes/games");

var app = express();

app.use(
  cors({
    origin: [
      "https://gaminretroreact-frontend.vercel.app",
      "http://localhost:3001",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "Content-Type", "Authorization"],
  })
);

// const corsOptions = {
//   origin: [
//     "https://gaminretroreact-frontend.vercel.app",
//     "http://localhost:3000",
//     "http://localhost:3001",
//   ],
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
// };

// const corsOptions = {
//   origin: function (origin, callback) {
//     console.log("Origine de la requête : ", origin);
//     const allowedOrigins = [
//       "https://gaminretroreact-frontend.vercel.app",
//       "https://gaminretroreact-backend.vercel.app",
//       "http://localhost:3000",
//       "http://localhost:3001",
//     ];
//     if (allowedOrigins.includes(origin) || !origin) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
//   methods: ["GET", "POST", "PUT", "DELETE"],
// };

app.use(cors()); // Installation de Cors

app.options("*", cors());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/admin", adminRouter);
app.use("/games", gamesRouter);

module.exports = app;
