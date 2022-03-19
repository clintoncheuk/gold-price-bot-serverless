const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    unique: true,
    index: true,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);
