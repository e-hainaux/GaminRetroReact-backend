var express = require("express");
require("dotenv").config();

require("./models/connection");

var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var adminRouter = require("./routes/admin");
var gamesRouter = require("./routes/games");

var app = express();

const cors = require("cors"); // Installation de Cors

const corsOptions = {
  origin: function (origin, callback) {
    console.log("Origine de la requête : ", origin);
    const allowedOrigins = [
      "https://gaminretroreact-frontend.vercel.app",
      "https://gaminretroreact-backend.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
    ];
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
  methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsOptions)); // Installation de Cors

// app.options("*", cors(corsOptions));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// app.use((req, res, next) => {
//   res.header(
//     "Access-Control-Allow-Origin",
//     "https://gaminretroreact-frontend.vercel.app"
//   );
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept, Authorization"
//   );
//   res.header("Access-Control-Allow-Credentials", true);
//   next();
// });

app.use("/", indexRouter);
app.use("/admin", adminRouter);
app.use("/games", gamesRouter);

module.exports = app;
