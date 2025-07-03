#!/usr/bin/env node

const https = require("https");
const { URL } = require("url");
require('dotenv').config({ path: `.env.local` })

// Get bot token from environment variable
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL =
  "https://knbvlpkorstsakqpieiv.supabase.co/functions/v1/telegram-webhook";

if (!BOT_TOKEN) {
  console.error(
    "❌ Error: TELEGRAM_BOT_TOKEN environment variable is required",
  );
  console.error(
    "💡 Usage: TELEGRAM_BOT_TOKEN=your_bot_token node register-telegram-webhook.js [register|info]",
  );
  process.exit(1);
}

function registerWebhook() {
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
  const data = JSON.stringify({ url: WEBHOOK_URL });

  const url = new URL(apiUrl);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  const req = https.request(options, (res) => {
    let responseData = "";

    res.on("data", (chunk) => {
      responseData += chunk;
    });

    res.on("end", () => {
      const response = JSON.parse(responseData);
      if (response.ok) {
        console.log("✅ Webhook registered successfully!");
        console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
      } else {
        console.error("❌ Failed to register webhook:");
        console.error(response);
      }
    });
  });

  req.on("error", (error) => {
    console.error("❌ Error registering webhook:", error);
  });

  req.write(data);
  req.end();
}

function getWebhookInfo() {
  const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;

  const url = new URL(apiUrl);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: "GET",
  };

  const req = https.request(options, (res) => {
    let responseData = "";

    res.on("data", (chunk) => {
      responseData += chunk;
    });

    res.on("end", () => {
      const response = JSON.parse(responseData);
      if (response.ok) {
        console.log("📋 Current webhook info:");
        console.log(JSON.stringify(response.result, null, 2));
      } else {
        console.error("❌ Failed to get webhook info:", response);
      }
    });
  });

  req.on("error", (error) => {
    console.error("❌ Error getting webhook info:", error);
  });

  req.end();
}

const command = process.argv[2];

switch (command) {
  case "register":
    registerWebhook();
    break;
  case "info":
    getWebhookInfo();
    break;
  default:
    console.log(
      "Usage: TELEGRAM_BOT_TOKEN=your_bot_token node register-telegram-webhook.js [register|info]",
    );
    console.log("  register - Register the webhook with Telegram");
    console.log("  info     - Get current webhook information");
    console.log("");
    console.log("Example:");
    console.log(
      "  TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11 node register-telegram-webhook.js register",
    );
}
