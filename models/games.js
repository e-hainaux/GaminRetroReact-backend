const mongoose = require("mongoose");

const gameSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
    },
    complete: String,
    country: String,
    image: String,
  },
  { timestamps: true }
);

const Game = mongoose.model("Game", gameSchema);

module.exports = Game;
