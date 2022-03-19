"use strict";
const axios = require("axios").default;
const mongoose = require("mongoose");
const Price = require("../models/price");
const Subscription = require("../models/subscription");
const { Config, CONFIG_KEY } = require("../models/config");
const TradingView = require("@mathieuc/tradingview");
const moment = require("moment-timezone");
const { broadcastToSubscribers } = require("./telegram");
const config = require("../models/config");

let db = null;

const connectToDatabase = async (uri, options = {}) => {
  if (!db) db = mongoose.connect(uri, options);
};

const checkAndSendAlert = async (chart) => {
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
      },
    },
  ]);

  if (prices[0]) {
    // Notify user when reached 1 day min/max price
    if (
      chart.periods[1].min <= prices[0].min ||
      chart.periods.max >= prices[0].max
    ) {
      const isMinAlert = chart.periods[1].min <= prices[0].min;
      const lastAlert = await Config.findOne({
        key: isMinAlert ? CONFIG_KEY.LAST_ALERT_MIN : CONFIG_KEY.LAST_ALERT_MAX,
      });
      if (
        !lastAlert ||
        (lastAlert && moment().unix() - 3600 > lastAlert.value)
      ) {
        await Config.updateOne(
          {
            key: isMinAlert
              ? CONFIG_KEY.LAST_ALERT_MIN
              : CONFIG_KEY.LAST_ALERT_MAX,
          },
          {
            value: moment().unix(),
          },
          { upsert: true }
        );
        await broadcastToSubscribers(
          `Alert - ${isMinAlert ? "MIN" : "MAX"} Reached\nCurrent Price: ${
            chart.periods[0].close
          }`
        );
      }
    }
  }
};

module.exports.get = async (event, context, callback) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false;

    await connectToDatabase(process.env.DATABASE_URL, {
      useNewUrlParser: true,
    });

    let sessionIdKeyValue = await Config.findOne({
      key: CONFIG_KEY.SESSION_ID,
    });

    if (!sessionIdKeyValue) {
      const user = await TradingView.loginUser(
        process.env.TRADINGVIEW_USERNAME,
        process.env.TRADINGVIEW_PASSWORD,
        false
      );
      const config = new Config({
        key: CONFIG_KEY.SESSION_ID,
        value: user.session,
      });
      sessionIdKeyValue = await config.save();
    }

    const client = new TradingView.Client({
      token: sessionIdKeyValue.value,
    });

    const chart = new client.Session.Chart();
    chart.setTimezone(process.env.TIMEZONE);

    chart.setMarket("GOLD", {
      timeframe: "1",
      range: 10,
    });

    chart.onUpdate(async () => {
      client.end();
      const bulk = await Price.collection.bulkWrite(
        chart.periods.map((p) => {
          return {
            updateOne: {
              filter: {
                time: new Date(p.time * 1000),
              },
              update: {
                $set: {
                  price: p.close,
                  min: p.min,
                  max: p.max,
                  volume: p.volume,
                },
              },
              upsert: true,
            },
          };
        }),
        { ordered: false }
      );

      await checkAndSendAlert(chart);
    });

    callback(null, {
      statusCode: 200,
      body: JSON.stringify({ message: "OK" }),
    });
  } catch (err) {
    console.error(err);
    callback(null, {
      statusCode: 400,
      body: JSON.stringify({ statusCode: 400, body: err.message }),
    });
  }
};

module.exports.process = async (event, context, callback) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false;

    await connectToDatabase(process.env.DATABASE_URL, {
      useNewUrlParser: true,
    });

    const hourlyCloses = await Price.aggregate([
      {
        $project: {
          y: { $year: "$time" },
          m: { $month: "$time" },
          d: { $dayOfMonth: "$time" },
          h: { $hour: "$time" },
          price: 1,
          min: 1,
          max: 1,
          volume: 1,
        },
      },
      {
        $group: {
          _id: { year: "$y", month: "$m", day: "$d", hour: "$h" },
          price: { $last: "$price" },
          min: { $min: "$min" },
          max: { $max: "$max" },
          volume: { $sum: "$volume" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    callback(null, {
      statusCode: 200,
      body: JSON.stringify({ message: "OK" }),
    });
  } catch (err) {
    console.error(err);
    callback(null, {
      statusCode: 400,
      body: JSON.stringify({ statusCode: 400, body: err.message }),
    });
  }
};
