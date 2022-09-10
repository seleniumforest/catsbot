const { Telegraf } = require("telegraf");
const config = require("../config.json");
const { shortAddress } = require("./helpers");

const isProdEnv = config.env === "prod";
const bot = new Telegraf(config.token);
if (isProdEnv)
    bot.launch();

const notifyMsgSend =
    async (from, to, ticker, amount, txhash, network) => {
        await notify(`💲 #transfer #${network.name} 💲\nAddress ${shortAddress(from)} ` +
            `sent ${formatNum(amount)} ${ticker} to ${shortAddress(to)}. \n` +
            `${getExplorerUrl(network, txhash)}`);
    }

const notifyMsgDelegate =
    async (from, to, ticker, amount, txhash, network) => {
        await notify(`🐳 #delegation #${network.name} 🐳\nAddress ${shortAddress(from)} ` +
            `delegated ${formatNum(amount)} ${ticker} to ${to}. \n` +
            `${getExplorerUrl(network, txhash)}`);
    }

const notifyMsgUndelegate =
    async (delegator, validator, ticker, amount, txhash, network) => {
        await notify(`🦐 #undelegation #${network.name} 🦐\nAddress ${shortAddress(delegator)} ` +
            `undelegated ${formatNum(amount)} ${ticker} from ${validator}. \n` +
            `${getExplorerUrl(network, txhash)}`);
    }

const notifyCw20Transfer =
    async (sender, reciever, ticker, amount, txhash, network) => {
        await notify(`💲 #tokentransfer #${network.name} 💲\nAddress ${shortAddress(sender)} ` +
            `transferred ${formatNum(amount)} ${ticker} tokens to ${shortAddress(reciever)}. \n` +
            `${getExplorerUrl(network, txhash)}`);
    }

const notifyOsmosisSwap =
    async (sender, inAmount, inTicker, outAmount, outTicker, txhash, network) => {
        await notify(`🔄 #osmosisswap #${network.name} 🔄\nAddress ${shortAddress(sender)} ` +
            `swapped ${formatNum(inAmount)} ${inTicker} tokens to ${formatNum(outAmount)} ${outTicker}. \n` +
            `${getExplorerUrl(network, txhash)}`);
    }

const notifySifchainSwap =
    async (sender, inAmount, inTicker, outAmount, outTicker, txhash, network) => {
        await notify(`🔄 #sifchainswap #${network.name} 🔄\nAddress ${shortAddress(sender)} ` +
            `swapped ${formatNum(inAmount)} ${inTicker} tokens to ${formatNum(outAmount)} ${outTicker}. \n` +
            `${getExplorerUrl(network, txhash)}`);
    }

const formatNum = (num) => {
    if (typeof num === "string")
        num = parseFloat(num);

    return new Intl.NumberFormat().format(num.toFixed());
}

const getExplorerUrl = (network, txhash) => {
    if (!network.explorers || network.explorers === []) {
        console.warn(`no explorers found for network ${network.name}`);
        return `TX Hash: ${txhash}`;
    }

    let explorer = network.explorers.find(x => x.kind === "mintscan") ||
        network.explorers[0];

    return `<a href='${explorer.tx_page.replace("${txHash}", txhash)}'>TX link</a>`;
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
    notifyCw20Transfer,
    notifyOsmosisSwap,
    notifySifchainSwap
};