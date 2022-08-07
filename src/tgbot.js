const { Telegraf } = require("telegraf");
const config = require("../config.json");
const { shortAddress } = require("./helpers");

const isProdEnv = config.env === "prod";
const bot = new Telegraf(config.token);
if (isProdEnv) 
    bot.launch();

const notifyMsgSend = async (from, to, denom, amount, txhash, network) => {
    await notify(`#transfer \nAddress ${shortAddress(from)} sent ${amount} ${denom} to ${shortAddress(to)}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyMsgDelegate = async (from, to, denom, amount, txhash, network) => {
    await notify(`#delegation \nAddress ${shortAddress(from)} delegated ${amount} ${denom} to ${to}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyMsgUndelegate = async (delegator, validator, denom, amount, txhash, network) => {
    await notify(`#undelegation \nAddress ${shortAddress(delegator)} undelegated ${amount} ${denom} from ${validator}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyCw20Transfer = async (sender, reciever, denom, amount, txhash, network) => {
    await notify(`#tokentransfer \nAddress ${shortAddress(sender)} transferred ${amount} ${denom} tokens to ${shortAddress(reciever)}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>TX link</a>`);
}

const notify = async (message) => {
    console.log(message);

    if (isProdEnv)
        await bot.telegram.sendMessage(
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