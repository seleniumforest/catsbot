const { Telegraf } = require("telegraf");

const botToken = "5453349465:AAE2dFoZeDXiRJVFPAzOsXG_NV5Il5xX_4g";
let bot = new Telegraf(botToken);
bot.hears('hi', (ctx) => console.log(JSON.stringify(ctx)));
bot.launch();

module.exports = { bot };