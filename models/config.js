const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: {
    type: String,
    required: true,
  },
});

const CONFIG_KEY = {
  SESSION_ID: "sessionId",
  LAST_ALERT_MIN: "lastAlertMin",
  LAST_ALERT_MAX: "lastAlertMax",
};

module.exports = {
  Config: mongoose.models.Config || mongoose.model("Config", configSchema),
  CONFIG_KEY,
};
