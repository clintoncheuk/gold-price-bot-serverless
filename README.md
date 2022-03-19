# Gold Price Telegram Bot Serverless

## What Can This Bot Do?

This bot gets the real-time gold price from TradingView, and stores it in the database. It will send out alerts to users when the price reached a 24-hour min/max. It will also respond to users' `/price` or `/chart` requests.

## Demo

Try out the bot `@Goldquotebot`

<img src="demo/demo-1.gif" width="300">

## Environment Setup

Duplicate `.env.local.example` and save it as `.env.local`, replace with your environment variables.

| Variable             | Description                                                                            |
| -------------------- | -------------------------------------------------------------------------------------- |
| TELEGRAM_BOT_TOKEN   | Your Telegram Bot Token. Can be obtained from `@BotFather` on Telegram                 |
| DATABASE_URL         | Your MongoDB URL, e.g. mongodb+srv://user:pass@cluster0.zxcvb.mongodb.net/GoldPriceBot |
| TRADINGVIEW_USERNAME | Your TradingView Username                                                              |
| TRADINGVIEW_PASSWORD | Your TradingView Password                                                              |
| TIMEZONE             | The Timezone you're currently in, e.g. `Asia/Hong_Kong`                                |

## Run Locally

Make sure you've installed the [Serverless Framework](https://www.serverless.com/framework/docs/getting-started)

Install dependencies with:

```sh
npm install
```

Run Serverless locally to emulate AWS Lamda

```sh
serverless offline
```

Now, you can open `http://localhost:3000/price` and see if it returns the following result

```json
{
  "message": "OK"
}
```

## Deployment

### Deploy to AWS Lamda

Make sure you've created `.env.production`, created AWS Access Keys and configured in Serverless by following the [documentation](https://www.serverless.com/framework/docs/providers/aws/guide/credentials).

To deploy, simply run:

```sh
serverless deploy --starge production
```

### Setting Up Telegram Webhook

After you've deployed the application, you'll see the `receivedMessage` API endpoints in the terminal. To pass messages to the server, you have to tell Telegram to call the [webhook](https://core.telegram.org/bots/api#setwebhook) once the bot received a message.

```
https://api.telegram.org/bot<YOUR TELEGRAM BOT TOKEN>/setWebhook?url=<AWS LAMDA ENDPOINT>
```

Replace the Telegram bot token and the endpoint, open the link in your browser.

The response should look like this:

```json
{ "ok": true, "result": true, "description": "Webhook was set" }
```

You can verify it by [getWebhookInfo](https://core.telegram.org/bots/api#getwebhookinfo) API

```
https://api.telegram.org/bot<YOUR TELEGRAM BOT TOKEN>/getWebhookInfo
```

It's done! See if your bot replies your message by typing `/price` !
