const { Telegraf } = require("telegraf");
const config = require("../config.json");
const { shortAddress } = require("./helpers");

const isProdEnv = config.env === "prod";
const bot = new Telegraf(config.token);
if (isProdEnv) 
    bot.launch();

const notifyMsgSend = (from, to, denom, amount, txhash, network) => {
    notify(`#transfer \nAddress ${shortAddress(from)} sent ${amount} ${denom} to ${shortAddress(to)}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyMsgDelegate = (from, to, denom, amount, txhash, network) => {
    notify(`#delegation \nAddress ${shortAddress(from)} delegated ${amount} ${denom} to ${to}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyMsgUndelegate = (delegator, validator, denom, amount, txhash, network) => {
    notify(`#undelegation \nAddress ${shortAddress(delegator)} undelegated ${amount} ${denom} from ${validator}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyCw20Transfer = (sender, reciever, denom, amount, txhash, network) => {
    notify(`#tokentransfer \nAddress ${shortAddress(sender)} transferred ${amount} ${denom} tokens to ${shortAddress(reciever)}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>TX link</a>`);
}

const notify = (message) => {
    console.log(message);

    if (isProdEnv)
        bot.telegram.sendMessage(
            config.channel,
            message, 
            { 
                parse_mode: "HTML", 
                disable_web_page_preview: true 
            });
}

module.exports = {
    notifyMsgSend,
    notifyMsgDelegate,
    notifyMsgUndelegate,
    notifyCw20Transfer
};