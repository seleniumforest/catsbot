const { Telegraf } = require("telegraf");
const config = require("../config.json");

const isProdEnv = config.env === "prod";
const bot = new Telegraf(config.token);
if (isProdEnv) 
    bot.launch();

const notifyMsgSend = (from, to, denom, amount, txhash, network) => {
    notify(`Address ${from} sent ${amount} ${denom} to ${to}. ` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyMsgDelegate = (from, to, denom, amount, txhash, network) => {
    notify(`Address ${from} delegated ${amount} ${denom} to ${to}. ` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyMsgUndelegate = (delegator, validator, denom, amount, txhash, network) => {
    notify(`Address ${delegator} undelegated ${amount} ${denom} from ${validator}. ` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notify = (message) => {
    console.log(message);

    if (isProdEnv)
        bot.telegram.sendMessage(config.channel, message, { parse_mode: "HTML" });
}

module.exports = {
    notifyMsgSend,
    notifyMsgDelegate,
    notifyMsgUndelegate
};