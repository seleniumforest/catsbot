const { Telegraf } = require("telegraf");
const config = require("../config.json");

const isLocalEnv = config.env === "local";
let bot = {}

if (!isLocalEnv) {
    bot = new Telegraf(config.token);
    bot.launch();
}

//todo refactor
const notifyMsgSend = (from, to, denom, amount, txhash, network) => {
    let message = `Address ${from} sent ${amount} ${denom} to ${to}. ` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`;

    console.log(message);

    if (!isLocalEnv)
        bot.telegram.sendMessage(
            config.channel,
            message,
            {
                parse_mode: "HTML"
            }
        );
}

const notifyMsgDelegate = (from, to, denom, amount, txhash, network) => {
    let message = `Address ${from} delegated ${amount} ${denom} to ${to}. ` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`;

    console.log(message);

    if (!isLocalEnv)
        bot.telegram.sendMessage(
            config.channel,
            message,
            {
                parse_mode: "HTML"
            }
        );
}

const notifyMsgUndelegate = (delegator, validator, denom, amount, txhash, network) => {
    let message = `Address ${delegator} undelegated ${amount} ${denom} from ${validator}. ` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`;

    console.log(message);

    if (!isLocalEnv)
        bot.telegram.sendMessage(
            config.channel,
            message,
            {
                parse_mode: "HTML"
            }
        );
}

module.exports = {
    notifyMsgSend,
    notifyMsgDelegate,
    notifyMsgUndelegate
};