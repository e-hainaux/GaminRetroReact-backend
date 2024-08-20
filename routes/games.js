const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;
const Game = require("../models/games");

// IGDB API platform codes
const platformMap = {
  "Master System": 64,
  "Mega Drive": 29,
  Dreamcast: 23,
  "Game Gear": 35,
  NES: 18,
  SNES: 19,
  "Game Boy": 33,
  "GB color": 22,
  "GB advance": 24,
  Playstation: 7,
  Lynx: 61,
};

// IGDB API
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

async function getAccessToken() {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    }
  );
  const data = await response.json();
  return data.access_token;
}

//-------- Route search one game in API
router.get("/apisearch", async (req, res) => {
  try {
    const { title, platform } = req.query;

    if (!title || !platform) {
      return res
        .status(400)
        .json({ message: "Le titre du jeu et la plateforme sont requis" });
    }

    if (!platformMap[platform]) {
      return res.status(400).json({ message: "Plateforme non reconnue" });
    }

    const accessToken = await getAccessToken();

    let query = `search "${title}"; where version_parent = null`;

    if (platform && platformMap[platform]) {
      query += ` & platforms = (${platformMap[platform]})`;
    }

    query += `; fields name, platforms.name, cover.url; limit 50;`;

    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.IGDB_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: query,
    });

    if (!response.ok) {
      throw new Error(`IGDB API responded with status ${response.status}`);
    }

    const games = await response.json();

    // Transform data for BDD model 'games'
    const transformedGames = games.map((game) => ({
      title: game.name,
      platform: game.platforms
        ? game.platforms.map((p) => p.name).join(", ")
        : "Unknown",
      image: game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : null,
    }));

    res.json(transformedGames);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la recherche des jeux",
    });
  }
});

//-------- Route add games in BDD

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/addgames", async (req, res) => {
  try {
    const { gamesToAdd } = req.body;

    if (!gamesToAdd || !Array.isArray(gamesToAdd) || gamesToAdd.length === 0) {
      return res.status(400).json({ message: "Liste de jeux invalide" });
    }

    const addedGames = [];

    for (const gameData of gamesToAdd) {
      const { title, platform, image, complete, country } = gameData;

      // Télécharger l'image sur Cloudinary
      let cloudinaryResult;
      try {
        cloudinaryResult = await cloudinary.uploader.upload(image, {
          folder: "GaminRetroReact",
        });
      } catch (uploadError) {
        console.error("Erreur lors du téléchargement de l'image:", uploadError);
        // Si l'upload échoue, on continue avec le jeu suivant
        continue;
      }

      // Créer une nouvelle entrée de jeu
      const newGame = new Game({
        title,
        platform,
        complete,
        country,
        image: cloudinaryResult.secure_url,
      });

      // Sauvegarder le jeu dans la base de données
      await newGame.save();
      addedGames.push(newGame);
    }

    res.status(201).json({
      message: `${addedGames.length} jeux ajoutés avec succès`,
      addedGames,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout des jeux:", error);
    res
      .status(500)
      .json({ message: "Une erreur est survenue lors de l'ajout des jeux" });
  }
});

module.exports = router;
