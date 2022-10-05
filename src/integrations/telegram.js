const { Telegraf } = require("telegraf");
const config = require("../../config.json");
const { shortAddress } = require("../helpers");
const priceData = require("./coingecko");

const isProdEnv = config.env === "prod";
const bot = new Telegraf(config.token);
if (isProdEnv)
    bot.launch();

const msgSendPattern = "💲 #transfer #${network} 💲\nAddress ${fromAddress} " +
    "sent ${sentAmount} ${ticker} ${usdPrice} to ${toAddress}. \n" +
    "${explorerUrl}";

const notifyMsgSend = async (from, to, ticker, amount, txhash, network) => {
    let finalMsg = interpolate(msgSendPattern, {
        network: network.name,
        fromAddress: shortAddress(from),
        sentAmount: formatNum(amount),
        ticker,
        usdPrice: tryInsertPrice(amount, ticker),
        toAddress: shortAddress(to),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

const msgDelegatePattern = "🐳 #delegation #${network} 🐳\nAddress ${fromAddress} " +
    "delegated ${delegatedAmount} ${usdPrice} ${ticker} to ${toAddress}. \n" +
    "${explorerUrl}";

const notifyMsgDelegate = async (from, to, ticker, amount, txhash, network) => {
    const finalMsg = interpolate(msgDelegatePattern, {
        network: network.name,
        fromAddress: shortAddress(from),
        delegatedAmount: formatNum(amount),
        ticker,
        usdPrice: tryInsertPrice(amount, ticker),
        toAddress: shortAddress(to),
        explorerUrl: getExplorerUrl(network, txhash)
    });
    await notify(finalMsg);
}

const msgUndelegatePattern =
    "🦐 #undelegation #${network} 🦐\nAddress ${delegator} " +
    "undelegated ${undelegatedAmount} ${ticker} ${usdPrice} from ${validator}. \n" +
    "${explorerUrl}";

const notifyMsgUndelegate = async (delegator, validator, ticker, amount, txhash, network) => {
    const finalMsg = interpolate(msgUndelegatePattern, {
        network: network.name,
        delegator: shortAddress(delegator),
        undelegatedAmount: formatNum(amount),
        ticker,
        validator,
        usdPrice: tryInsertPrice(amount, ticker),
        explorerUrl: getExplorerUrl(network, txhash)
    });
    await notify(finalMsg);
}


const msgRedelegatePattern =
    "♻️ #redelegation #${network} ♻️\nAddress ${delegator} " +
    "redelegated ${redelegatedAmount} ${ticker} ${usdPrice} from ${fromValidator} to ${toValidator}. \n" +
    "${explorerUrl}";

const notifyMsgRedelegate =
    async (delegator, fromValidator, toValidator, ticker, amount, txhash, network) => {
        const finalMsg = interpolate(msgRedelegatePattern, {
            network: network.name,
            delegator: shortAddress(delegator),
            fromValidator,
            toValidator,
            redelegatedAmount: formatNum(amount),
            ticker,
            usdPrice: tryInsertPrice(amount, ticker),
            explorerUrl: getExplorerUrl(network, txhash)
        });
        await notify(finalMsg);
    }

const cw20TransferPattern =
    "💲 #tokentransfer #${network} 💲\nAddress ${sender} " +
    "transferred ${sentAmount} ${ticker} ${usdPrice} tokens to ${reciever}. \n" +
    "${explorerUrl}";

const notifyCw20Transfer =
    async (sender, reciever, ticker, amount, txhash, network) => {
        let finalMsg = interpolate(cw20TransferPattern, {
            network: network.name,
            sender: shortAddress(sender),
            sentAmount: formatNum(amount),
            ticker,
            usdPrice: tryInsertPrice(amount, ticker),
            reciever: shortAddress(reciever),
            explorerUrl: getExplorerUrl(network, txhash)
        });

        await notify(finalMsg);
    }


const osmosisSwapPattern =
    "🔄 #osmosisswap #${network} 🔄\nAddress ${sender} " +
    "swapped ${inAmount} ${inTicker} ${inUsdPrice} tokens to ${outAmount} ${outTicker} ${outUsdPrice} \n" +
    "${explorerUrl}";

const notifyOsmosisSwap =
    async (sender, inAmount, inTicker, outAmount, outTicker, txhash, network) => {
        let inUsdPrice = tryInsertPrice(inTicker, inAmount);
        let outUsdPrice = tryInsertPrice(outTicker, outAmount);
        if (inUsdPrice && outUsdPrice)
            inUsdPrice = "";

        let finalMsg = interpolate(osmosisSwapPattern, {
            network: network.name,
            sender: shortAddress(sender),
            inAmount: formatNum(inAmount),
            inTicker,
            inUsdPrice,
            outAmount: formatNum(outAmount),
            outTicker,
            outUsdPrice,
            explorerUrl: getExplorerUrl(network, txhash)
        });

        await notify(finalMsg);
    }

const sifchainSwapPattern =
    "🔄 #sifchainswap #${network} 🔄\nAddress ${sender} " +
    "swapped ${inAmount} ${inTicker} ${inUsdPrice} tokens to ${outAmount} ${outTicker} ${outUsdPrice} \n" +
    "${explorerUrl}";

const notifySifchainSwap =
    async (sender, inAmount, inTicker, outAmount, outTicker, txhash, network) => {
        let inUsdPrice = tryInsertPrice(inTicker, inAmount);
        let outUsdPrice = tryInsertPrice(outTicker, outAmount);
        if (inUsdPrice && outUsdPrice)
            inUsdPrice = "";

        let finalMsg = interpolate(sifchainSwapPattern, {
            network: network.name,
            sender: shortAddress(sender),
            inAmount: formatNum(inAmount),
            inTicker,
            inUsdPrice,
            outAmount: formatNum(outAmount),
            outTicker,
            outPrice,
            explorerUrl: getExplorerUrl(network, txhash)
        });

        await notify(finalMsg);
    }

const validityPeriod = 1000 * 60 * 30; //30 min
const tryInsertPrice = (ticker, amount) => {
    if (!priceData.lastUpdated || Date.now() - priceData.lastUpdated > validityPeriod)
        return "";

    let coingeckoId = config.networks
        .flatMap(x => x.notifyDenoms)
        .find(x => x.ticker === ticker)
        ?.coingeckoId;

    if (!coingeckoId)
        return "";

    let price = priceData.prices.get(coingeckoId);
    return `(${(price * amount).toFixed(0)}$ USD) `;
}

const interpolate = (string, args) => {
    Object.keys(args).forEach(arg => {
        string = string.replace("${" + arg + "}", args[arg])
    });

    return string.replace("  ", " ");
}

const formatNum = (num) => {
    if (typeof num === "string")
        num = parseFloat(num);

    return new Intl.NumberFormat().format(num.toFixed(num < 1 ? 2 : 0));
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
    notifySifchainSwap,
    notifyMsgRedelegate
};