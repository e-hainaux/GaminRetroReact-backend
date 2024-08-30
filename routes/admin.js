var express = require("express");
const router = express.Router();

const { checkBody } = require("../modules/bodyCheck");
const Admin = require("../models/admin");

const bcrypt = require("bcrypt");
const uid2 = require("uid2");

const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET_KEY;

/* GET test auth */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

/* POST register admin - use ONCE */
router.post("/register", async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne({ username: req.body.username });
    if (existingAdmin) {
      return res.status(400).json({ message: "Un admin existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const token = jwt.sign(
      { username: req.body.username, role: "admin" },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    const newAdmin = new Admin({
      username: req.body.username,
      password: hashedPassword,
      token: token,
      isAdmin: true,
    });

    await newAdmin.save();

    res.status(201).json({ message: "Admin créé avec succès" });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la création de l'admin",
      error: error.message,
    });
  }
});

/* POST admin login */
router.post("/login", async (req, res) => {
  if (!checkBody(req.body, ["username", "password"])) {
    return res.status(400).json({
      result: false,
      error: "Veuillez remplir l'ensemble des champs",
    });
    return;
  }

  try {
    const existingAdmin = await Admin.findOne({ username: req.body.username });
    if (!existingAdmin) {
      return res.status(400).json({ message: "Problème lors de la connexion" });
    }

    const isPasswordValid = await bcrypt.compare(
      req.body.password,
      existingAdmin.password
    );
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ result: false, error: "Problème lors de la connexion" });
    }

    const token = jwt.sign(
      { username: existingAdmin.username, role: "admin" },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({
      result: true,
      token: token,
      username: existingAdmin.username,
    });
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw new UnauthorizedException(error.message);
    } else if (error instanceof InternalServerErrorException) {
      throw new InternalServerErrorException(error.message);
    } else if (error instanceof NotFoundException) {
      throw new NotFoundException(error.message);
    }
  }
});

module.exports = router;
