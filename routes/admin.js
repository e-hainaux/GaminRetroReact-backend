var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const Admin = require("../models/admin");

/* GET test auth */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

/* POST register admin - use ONCE */
router.post("/register", async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne({ isAdmin: true });
    if (existingAdmin) {
      return res.status(400).json({ message: "Un admin existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newAdmin = new Admin({
      username: req.body.username,
      password: hashedPassword,
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
  if (!checkBody(req.body, ["email", "password"])) {
    res.json({
      result: false,
      error: "Veuillez remplir l'ensemble des champs",
    });
    return;
  }

  try {
    const existingAdmin = await Admin.findOne({ isAdmin: true });
    if (!existingAdmin) {
      return res.status(400).json({ message: "Problème lors de la connexion" });
    }

    if (
      existingAdmin &&
      bcrypt.compareSync(req.body.password, existingAdmin.password)
    ) {
      res.json({
        result: true,
        token: existingAdmin.token,
        username: existingAdmin.username,
      });
    } else {
      res.json({ result: false, error: "Problème lors de la connexion" });
    }
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
