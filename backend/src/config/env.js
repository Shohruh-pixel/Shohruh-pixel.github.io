const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  // Absolute origin of the deployed site. Sitemap entries, canonical links and Open Graph
  // tags all have to be absolute URLs, so crawlers and Telegram previews need this to be the
  // real public address once deployed.
  publicUrl: (process.env.PUBLIC_URL || "http://localhost:4000").replace(/\/$/, ""),
  adminKey: process.env.ADMIN_KEY || "",
  // Optional: alerts simply stay off when these are absent, which is the normal state locally.
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  scrapeIntervalMinutes: Number(process.env.SCRAPE_INTERVAL_MINUTES ?? 60)
};

module.exports = env;

