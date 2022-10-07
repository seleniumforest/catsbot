const { Telegraf } = require("telegraf");
const config = require("../../config.json");
const { shortAddress } = require("../helpers");
const priceData = require("./coingecko");

const isProdEnv = config.env === "prod";
const bot = new Telegraf(config.token);
if (isProdEnv)
    bot.launch();

const msgSendPattern = "#transfer #${network}\n" +
    "${emoji} \n" +
    "Address ${fromAddress} sent ${sentAmount} ${ticker} ${usdPrice} to ${toAddress}. \n" +
    "${explorerUrl}";

const notifyMsgSend = async (from, to, ticker, amount, txhash, network) => {
    let usdPrice = tryGetPrice(ticker);
    let sendEmoji = "💲";

    let finalMsg = interpolate(msgSendPattern, {
        emoji: repeatEmoji(sendEmoji, usdPrice * amount),
        network: network.name,
        fromAddress: shortAddress(from),
        sentAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdPrice, amount),
        toAddress: shortAddress(to),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

const msgDelegatePattern = 
    "#delegation #${network} \n" +
    "${emoji} \n" +
    "Address ${fromAddress} delegated ${delegatedAmount} ${ticker} ${usdPrice} to ${toAddress}. \n" +
    "${explorerUrl}";

const notifyMsgDelegate = async (from, to, ticker, amount, txhash, network) => {
    let delegateEmoji = "🐳";
    let usdPrice = tryGetPrice(ticker);

    const finalMsg = interpolate(msgDelegatePattern, {
        emoji: repeatEmoji(delegateEmoji, usdPrice * amount),
        network: network.name,
        fromAddress: shortAddress(from),
        delegatedAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdPrice, amount),
        toAddress: to,
        explorerUrl: getExplorerUrl(network, txhash)
    });
    await notify(finalMsg);
}

const msgUndelegatePattern =
    "#undelegation #${network} \n" +
    "${emoji} \n" +
    "Address ${delegator} undelegated ${undelegatedAmount} ${ticker} ${usdPrice} from ${validator}. \n" +
    "${explorerUrl}";

const notifyMsgUndelegate = async (delegator, validator, ticker, amount, txhash, network) => {
    let undelegateEmoji = "🦐";
    let usdPrice = tryGetPrice(ticker);

    const finalMsg = interpolate(msgUndelegatePattern, {
        emoji: repeatEmoji(undelegateEmoji, usdPrice * amount),
        network: network.name,
        delegator: shortAddress(delegator),
        undelegatedAmount: formatNum(amount),
        ticker,
        validator,
        usdPrice: getUsdPriceString(usdPrice, amount),
        explorerUrl: getExplorerUrl(network, txhash)
    });
    await notify(finalMsg);
}


const msgRedelegatePattern = 
    "#redelegation #${network} \n" +
    "${emoji} \n" +
    "Address ${delegator} redelegated ${redelegatedAmount} ${ticker} ${usdPrice} from ${fromValidator} to ${toValidator}. \n" +
    "${explorerUrl}";

const notifyMsgRedelegate =
    async (delegator, fromValidator, toValidator, ticker, amount, txhash, network) => {
        let redelegateEmoji = "♻️";
        let usdPrice = tryGetPrice(ticker);

        const finalMsg = interpolate(msgRedelegatePattern, {
            emoji: repeatEmoji(redelegateEmoji, usdPrice * amount),
            network: network.name,
            delegator: shortAddress(delegator),
            fromValidator,
            toValidator,
            redelegatedAmount: formatNum(amount),
            ticker,
            usdPrice: getUsdPriceString(usdPrice, amount),
            explorerUrl: getExplorerUrl(network, txhash)
        });
        await notify(finalMsg);
    }

const cw20TransferPattern =
    "#tokentransfer #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} transferred ${sentAmount} ${ticker} ${usdPrice} tokens to ${reciever}. \n" +
    "${explorerUrl}";

const notifyCw20Transfer =
    async (sender, reciever, ticker, amount, txhash, network) => {
        let transferEmoji = "💲";
        let usdPrice = tryGetPrice(ticker);

        let finalMsg = interpolate(cw20TransferPattern, {
            emoji: repeatEmoji(transferEmoji, usdPrice * amount),
            network: network.name,
            sender: shortAddress(sender),
            sentAmount: formatNum(amount),
            ticker,
            usdPrice: getUsdPriceString(usdPrice, amount),
            reciever: shortAddress(reciever),
            explorerUrl: getExplorerUrl(network, txhash)
        });

        await notify(finalMsg);
    }


const osmosisSwapPattern =
    "#osmosisswap #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} swapped ${inAmount} ${inTicker} ${inUsdPrice} tokens to ${outAmount} ${outTicker} ${outUsdPrice} \n" +
    "${explorerUrl}";

const notifyOsmosisSwap =
    async (sender, inAmount, inTicker, outAmount, outTicker, txhash, network) => {
        let swapEmoji = "🔄";
        let inUsdPrice = tryGetPrice(inTicker);
        let outUsdPrice = tryGetPrice(outTicker);
        let inUsdPriceString = getUsdPriceString(inUsdPrice, inAmount);
        let outUsdPriceString = getUsdPriceString(outUsdPrice, outAmount);
        if (inUsdPrice && outUsdPrice)
            inUsdPriceString = "";

        let finalMsg = interpolate(osmosisSwapPattern, {
            emoji: repeatEmoji(swapEmoji, (inUsdPrice * inAmount) || (outUsdPrice * outAmount)),
            network: network.name,
            sender: shortAddress(sender),
            inAmount: formatNum(inAmount),
            inTicker,
            inUsdPrice: inUsdPriceString,
            outAmount: formatNum(outAmount),
            outTicker,
            outUsdPrice: outUsdPriceString,
            explorerUrl: getExplorerUrl(network, txhash)
        });

        await notify(finalMsg);
    }

const sifchainSwapPattern =
    "#sifchainswap #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} swapped ${inAmount} ${inTicker} ${inUsdPrice} tokens to ${outAmount} ${outTicker} ${outUsdPrice} \n" +
    "${explorerUrl}";

const notifySifchainSwap =
    async (sender, inAmount, inTicker, outAmount, outTicker, txhash, network) => {
        let swapEmoji = "🔄";
        let inUsdPrice = tryGetPrice(inTicker);
        let outUsdPrice = tryGetPrice(outTicker);
        let inUsdPriceString = getUsdPriceString(inUsdPrice, inAmount);
        let outUsdPriceString = getUsdPriceString(outUsdPrice, outAmount);
        if (inUsdPrice && outUsdPrice)
            inUsdPriceString = "";

        let finalMsg = interpolate(sifchainSwapPattern, {
            emoji: repeatEmoji(swapEmoji, (inUsdPrice * inAmount) || (outUsdPrice * outAmount)),
            network: network.name,
            sender: shortAddress(sender),
            inAmount: formatNum(inAmount),
            inTicker,
            inUsdPrice: inUsdPriceString,
            outAmount: formatNum(outAmount),
            outTicker,
            outUsdPrice: outUsdPriceString,
            explorerUrl: getExplorerUrl(network, txhash)
        });

        await notify(finalMsg);
    }


//1 emoji for every 100k usd
const repeatEmoji = (emoji, price) => emoji.repeat(price && price > 0 ? Math.min(Math.ceil(price / 300000), 10) : 1);
const getUsdPriceString = (usdPrice, amount) => usdPrice ? `(USD $${formatNum(usdPrice * amount)})` : "";

const validityPeriod = 1000 * 60 * 30; //30 min
const tryGetPrice = (ticker) => {
    if (!priceData.lastUpdated || Date.now() - priceData.lastUpdated > validityPeriod)
        return "";

    let coingeckoId = config.networks
        .flatMap(x => x.notifyDenoms)
        .find(x => x.ticker === ticker)
        ?.coingeckoId;

    if (!coingeckoId)
        return "";

    return priceData.prices.get(coingeckoId);
}

const interpolate = (string, args) => {
    Object.keys(args).forEach(arg => {
        string = string.replaceAll("${" + arg + "}", args[arg])
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