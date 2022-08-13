const { Telegraf } = require("telegraf");
const secrets = require("../../config/secrets.json");

const isProdEnv = process.env.env === "prod";
const bot = new Telegraf(secrets.token);
console.log(`Starting server in ${isProdEnv ? "prod" : "dev"} mode`);

if (isProdEnv)
    bot.launch();

const send = (message) => {
    if (isProdEnv)
        return bot.telegram.sendMessage(
            secrets.channel,
            message,
            {
                parse_mode: "HTML",
                disable_web_page_preview: true
            });

    return new Promise(res => res());
}

module.exports = {
    send
}