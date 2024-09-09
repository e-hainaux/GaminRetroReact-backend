const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;
const Game = require("../models/games");

// IGDB API platform codes
const platformMap = {
  64: "Master System",
  29: "Mega Drive",
  23: "Dreamcast",
  35: "Game Gear",
  18: "NES",
  19: "SNES",
  33: "Game Boy",
  22: "GB color",
  24: "GB advance",
  7: "Playstation",
  61: "Lynx",
};

// IGDB API
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const DEFAULT_IMAGE_URL =
  "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.webp";

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

const findCoverImage = (game, allGames, depth = 0) => {
  if (depth > 5) return null;

  if (game.cover && game.cover.url) {
    return `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`;
  }

  if (game.parent_game) {
    const parentGame = allGames.find((g) => g.id === game.parent_game);
    if (parentGame) {
      return findCoverImage(parentGame, allGames, depth + 1);
    }
  }

  return null;
};

/* GET test games */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

//-------- Route search one game in API
router.get("/apisearch", async (req, res) => {
  try {
    const { title, platform } = req.query;
    console.log("B QUERY title & platform : ", title, platform);

    if (!title || !platform) {
      return res
        .status(400)
        .json({ message: "Le titre du jeu et la plateforme sont requis" });
    }

    const accessToken = await getAccessToken();

    const excludedCategories = [5, 8, 9, 12, 15];

    let query = `
    fields name, platforms.name, cover.url, category, parent_game;
    search "${title}";
    where category != (${excludedCategories.join(", ")})`;

    if (platform) {
      query += ` & platforms = (${platform})`;
    }

    query += `;
    limit 50;
    `;

    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body: query,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `IGDB API Error: ${response.status} ${response.statusText}`,
        errorText
      );
      throw new Error(
        `IGDB API responded with status ${response.status}: ${errorText}`
      );
    }

    const games = await response.json();
    const platformName = platformMap[platform];

    // Transform data for BDD model 'games'
    const transformedGames = games.map((game) => ({
      title: game.name,
      platform: platformName,
      image: findCoverImage(game, games) || DEFAULT_IMAGE_URL,
    }));

    res.json(transformedGames);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la recherche des jeux",
      error: error.message,
    });
  }
});

//-------- Route add games in DB

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

      const newGame = new Game({
        title,
        platform,
        complete,
        country,
        image: cloudinaryResult.secure_url,
      });

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

//-------- Route get 4 more recent games
router.get("/recentgames", async (req, res) => {
  console.log("Lancement route RECENT");

  try {
    const recentGames = await Game.find().sort({ createdAt: -1 }).limit(4);

    res.status(200).json(recentGames);
  } catch (error) {
    res.status(500).json({
      message:
        "Une erreur est survenue lors de la récupération des jeux récents.",
    });
  }
});

//-------- Route get games from DB in alphabetical order
router.get("/dbgames", async (req, res) => {
  try {
    const games = await Game.find().sort({ title: 1 });
    res.status(200).json(games);
  } catch (error) {
    console.error("Erreur lors de la récupération des jeux :", error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la récupération des jeux.",
    });
  }
});

//-------- Route get games from DB by keyword
router.get("/searchdbgames", async (req, res) => {
  try {
    const { search } = req.query;

    const searchQuery = search
      ? { title: { $regex: search, $options: "i" } }
      : {};

    const games = await Game.find(searchQuery).sort({ title: 1 });

    res.status(200).json(games);
  } catch (error) {
    console.error("Erreur lors de la récupération des jeux :", error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la récupération des jeux",
    });
  }
});

//-------- Route update games from DB by platform name
router.get("/searchdbgamesbyplatform", async (req, res) => {
  console.log("Lancement route PLATFORM");

  const { platform } = req.query;

  try {
    console.log(`Recherche des jeux pour la plateforme : ${platform}`);

    const games = await Game.find({ platform }).sort({
      title: 1,
    });

    console.log("Nombre de jeux trouvés en back : ", games.length);
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({
      message: "Une erreur est survenue lors de la récupération des jeux",
    });
  }
});

//-------- Route update games from DB by keyword
router.put("/updategames", async (req, res) => {
  try {
    const { gamesToUpdate } = req.body;

    if (
      !gamesToUpdate ||
      !Array.isArray(gamesToUpdate) ||
      gamesToUpdate.length === 0
    ) {
      return res.status(400).json({ message: "Liste de jeux invalide" });
    }

    const updatedGames = [];

    for (const gameData of gamesToUpdate) {
      const { id, complete, country } = gameData;

      if (!id) {
        return res.status(400).json({ message: "ID du jeu requis" });
      }

      if (typeof complete !== "string" && typeof country !== "string") {
        return res.status(400).json({ message: "Paramètres invalides" });
      }

      const updatedGame = await Game.findByIdAndUpdate(
        id,
        { complete, country },
        { new: true, runValidators: true }
      );

      if (!updatedGame) {
        return res
          .status(404)
          .json({ message: `Jeu avec l'ID ${id} non trouvé` });
      }

      updatedGames.push(updatedGame);
    }

    res.status(200).json({
      message: `${updatedGames.length} jeux mis à jour avec succès`,
      updatedGames,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des jeux :", error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la mise à jour des jeux",
    });
  }
});

//-------- Route delete games from DB and cloud by id

router.delete("/deletegames", async (req, res) => {
  try {
    const { gameIds } = req.body;

    if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
      return res.status(400).json({ message: "Liste d'IDs de jeux invalide" });
    }

    const deletedGames = [];
    const errors = [];

    for (const id of gameIds) {
      try {
        const game = await Game.findById(id);

        if (!game) {
          errors.push({ id, message: "Jeu non trouvé" });
          continue;
        }

        const cloudinaryImageId = game.image.split("/").pop().split(".")[0];

        await cloudinary.uploader.destroy(cloudinaryImageId);

        await Game.findByIdAndDelete(id);

        deletedGames.push(id);
      } catch (error) {
        console.error(`Erreur lors de la suppression du jeu ${id}:`, error);
        errors.push({ id, message: "Erreur lors de la suppression" });
      }
    }

    res.status(200).json({
      message: `${deletedGames.length} jeu(x) supprimé(s) avec succès`,
      deletedGames,
      errors,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des jeux :", error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la suppression des jeux",
    });
  }
});

module.exports = router;
