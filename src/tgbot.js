const { Telegraf } = require("telegraf");
const config = require("../config.json");

const botToken = config.token;
let bot = new Telegraf(botToken);
bot.launch();

const notifyMsgSend = (from, to, amount, txhash) => {
    let message = `Address ${from} sent ${amount} ATOM to ${to}. ` + 
    `<a href='https://www.mintscan.io/cosmos/txs/${txhash}'>Tx link</a>`;

    console.log(message);

    bot.telegram.sendMessage(
        config.channel,
        message,
        {
            parse_mode: "HTML"
        }
    );
}

module.exports = { notifyMsgSend };