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

module.exports = router;
