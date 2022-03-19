const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema({
  time: {
    type: Date,
    default: Date.now,
    index: true,
  },
  price: {
    type: Number,
    required: true,
  },
  min: {
    type: Number,
    required: true,
  },
  max: {
    type: Number,
    required: true,
  },
  volume: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.models.Price || mongoose.model("Price", priceSchema);
