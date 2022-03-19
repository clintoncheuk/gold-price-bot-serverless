"use strict";

const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Subscription = require("../models/subscription");
const Price = require("../models/price");
const price = require("../models/price");
const moment = require("moment-timezone");

let db = null;
const connectToDatabase = async (uri, options = {}) => {
  if (!db) db = mongoose.connect(uri, options);
};
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

const receivedMessageWebhook = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  await connectToDatabase(process.env.DATABASE_URL, {
    useNewUrlParser: true,
  });

  const body = JSON.parse(event.body);
  const message = body.message;
  if (!message || !message.text) {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({ message: "OK" }),
    });
    return;
  }

  if (message.text.startsWith("/start")) {
    await subscribe(bot, message);
  } else if (message.text.startsWith("/stop")) {
    await unsubscribe(bot, message);
  } else if (message.text.startsWith("/price")) {
    await sendPrice(bot, message);
  } else if (message.text.startsWith("/chart")) {
    await sendChart(bot, message);
  }

  callback(null, {
    statusCode: 200,
    body: JSON.stringify({ message: "OK" }),
  });
};

const subscribe = async (bot, message) => {
  const key = { chatId: message.chat.id };
  const data = {
    name: message.chat.id < 0 ? message.chat.title : message.chat.first_name,
  };

  const result = await Subscription.findOneAndUpdate(key, data, {
    upsert: true,
  });

  const replyMsg = `Hello ${data.name}, thanks for using gold price bot! You'll receive alerts when there are price changes. You can /stop the alerts anytime.`;

  return bot.sendMessage(message.chat.id, replyMsg);
};

const unsubscribe = async (bot, message) => {
  await Subscription.deleteOne({ chatId: message.chat.id });
  return bot.sendMessage(
    message.chat.id,
    "You have unsubscribed from the gold price alerts. Feel free to subscribe again with /start"
  );
};

const sendPrice = async (bot, message) => {
  const yesterday = moment()
    .subtract(1, "day")
    .set("second", 0)
    .set("millisecond", 0)
    .toDate();
  const prices = await Price.aggregate([
    {
      $match: {
        time: {
          $gte: yesterday,
          $lt: new Date(),
        },
      },
    },
    {
      $group: {
        _id: null,
        max: { $max: "$price" },
        min: { $min: "$price" },
        yesterday: { $first: "$price" },
        now: { $last: "$price" },
        last_update: { $last: "$time" },
      },
    },
  ]).sort({ time: 1 });

  if (prices[0]) {
    const minPrice = prices[0].min ? prices[0].min : "-";
    const maxPrice = prices[0].max ? prices[0].max : "-";
    const currentPrice = prices[0].now;
    const yesterdayPrice = prices[0].yesterday;
    const lastUpdate = prices[0].last_update;

    const priceChange = Math.round((currentPrice - yesterdayPrice) * 100) / 100;
    const symbol = priceChange == 0 ? "-" : priceChange > 0 ? "↑" : "↓";
    const priceChangePercentage =
      Math.round(((currentPrice - yesterdayPrice) / yesterdayPrice) * 10000) /
      100;

    const replyMsg = `Price: ${currentPrice} ${symbol}${priceChange} (${priceChangePercentage}%)\nMin: ${minPrice}\nMax: ${maxPrice}\nLast update: ${moment(
      lastUpdate
    )
      .tz(process.env.TIMEZONE)
      .format("YYYY-MM-DD HH:mm:ss")}\nType /chart to see the trend.`;
    return bot.sendMessage(message.chat.id, replyMsg);
  } else {
    return bot.sendMessage(message.chat.id, "No price data");
  }
};

const sendChart = async (bot, message) => {
  return bot.sendMessage(
    message.chat.id,
    "https://goldprice.org/charts/gold_1d_b_o_x_USD.png?t=" + moment().unix()
  );
};

const broadcastToSubscribers = async (message) => {
  const subscriptions = await Subscription.find();
  subscriptions.forEach(async (subscription) => {
    try {
      await bot.sendMessage(subscription.chatId, message);
    } catch (e) {
      console.error(e);
    }
  });
};

module.exports = { receivedMessageWebhook, broadcastToSubscribers };
