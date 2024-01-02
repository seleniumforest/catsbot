import { Telegraf } from "telegraf";
import { getConfig } from "../config";
import { getTickerPrice } from "./coingecko";
import { chains } from "chain-registry";
import Big, { BigSource } from "big.js";
import { shortAddressWithIcns } from "./icns";
import { TimeSpan } from "timespan-ts";

const config = getConfig();
const isProdEnv = config.env === "prod";
const bot = new Telegraf(config.token);
if (isProdEnv)
    bot.launch();

process.once('SIGINT', () => isProdEnv && bot.stop('SIGINT'));
process.once('SIGTERM', () => isProdEnv && bot.stop('SIGTERM'));

const msgSendPattern = "#transfer #${network}\n" +
    "${emoji} \n" +
    "Address ${fromAddress} sent ${sentAmount} ${ticker} ${usdPrice} to ${toAddress}. \n" +
    "${explorerUrl}";

export const notifyMsgSend = async (
    from: string,
    to: string,
    ticker: string,
    amount: Big,
    txhash: string,
    network: string,
    usdVolume?: number
) => {
    let sendEmoji = "💲";

    let finalMsg = interpolate(msgSendPattern, {
        emoji: repeatEmoji(sendEmoji, usdVolume),
        network: network,
        fromAddress: await shortAddressWithIcns(from),
        sentAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdVolume),
        toAddress: await shortAddressWithIcns(to),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

const msgDelegatePattern =
    "#delegation #${network} \n" +
    "${emoji} \n" +
    "Address ${fromAddress} delegated ${delegatedAmount} ${ticker} ${usdPrice} to ${toAddress}. \n" +
    "${explorerUrl}";

export const notifyMsgDelegate = async (
    from: string,
    validatorMoniker: string,
    ticker: string,
    amount: Big,
    txhash: string,
    network: string,
    usdVolume?: number
) => {
    let delegateEmoji = "🐳";

    const finalMsg = interpolate(msgDelegatePattern, {
        emoji: repeatEmoji(delegateEmoji, usdVolume),
        network: network,
        fromAddress: await shortAddressWithIcns(from),
        delegatedAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdVolume),
        toAddress: validatorMoniker,
        explorerUrl: getExplorerUrl(network, txhash)
    });
    await notify(finalMsg);
}

const msgUndelegatePattern =
    "#undelegation #${network} \n" +
    "${emoji} \n" +
    "Address ${delegator} undelegated ${undelegatedAmount} ${ticker} ${usdPrice} from ${validator}. \n" +
    "${explorerUrl}";

export const notifyMsgUndelegate = async (
    delegator: string,
    validatorMoniker: string,
    ticker: string,
    amount: Big,
    txhash: string,
    network: string,
    usdVolume?: number
) => {
    let undelegateEmoji = "🦐";

    const finalMsg = interpolate(msgUndelegatePattern, {
        emoji: repeatEmoji(undelegateEmoji, usdVolume),
        network: network,
        delegator: await shortAddressWithIcns(delegator),
        undelegatedAmount: formatNum(amount),
        ticker,
        validator: validatorMoniker,
        usdPrice: getUsdPriceString(usdVolume),
        explorerUrl: getExplorerUrl(network, txhash)
    });
    await notify(finalMsg);
}


const msgRedelegatePattern =
    "#redelegation #${network} \n" +
    "${emoji} \n" +
    "Address ${delegator} redelegated ${redelegatedAmount} ${ticker} ${usdPrice} from ${fromValidator} to ${toValidator}. \n" +
    "${explorerUrl}";

export const notifyMsgRedelegate = async (
    delegator: string,
    fromValidator: string,
    toValidator: string,
    ticker: string,
    amount: Big,
    txhash: string,
    network: string,
    usdVolume?: number
) => {
    let redelegateEmoji = "♻️";

    const finalMsg = interpolate(msgRedelegatePattern, {
        emoji: repeatEmoji(redelegateEmoji, usdVolume),
        network: network,
        delegator: await shortAddressWithIcns(delegator),
        fromValidator,
        toValidator,
        redelegatedAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdVolume),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

const cw20TransferPattern =
    "#tokentransfer #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} transferred ${sentAmount} ${ticker} ${usdPrice} tokens to ${reciever}. \n" +
    "${explorerUrl}";

export const notifyCw20Transfer = async (
    sender: string,
    reciever: string,
    ticker: string,
    amount: Big,
    txhash: string,
    network: string,
    usdVolume?: number
) => {
    let transferEmoji = "💲";

    let finalMsg = interpolate(cw20TransferPattern, {
        emoji: repeatEmoji(transferEmoji, usdVolume),
        network: network,
        sender: await shortAddressWithIcns(sender),
        sentAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdVolume),
        reciever: await shortAddressWithIcns(reciever),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}


const osmosisSwapPattern =
    "#osmosisswap #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} swapped ${inAmount} ${inTicker} tokens to ${outAmount} ${outTicker} ${outUsdPrice} \n" +
    "${explorerUrl}";

export const notifyOsmosisSwap = async (
    sender: string,
    inAmount: Big,
    inTicker: string,
    outAmount: Big,
    outTicker: string,
    txhash: string,
    network: string,
    usdVolume?: number
) => {
    let swapEmoji = "🔄";

    let finalMsg = interpolate(osmosisSwapPattern, {
        emoji: repeatEmoji(swapEmoji, usdVolume),
        network: network,
        sender: await shortAddressWithIcns(sender),
        inAmount: formatNum(inAmount),
        inTicker,
        outAmount: formatNum(outAmount),
        outTicker,
        outUsdPrice: getUsdPriceString(usdVolume),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

const joinPoolPattern =
    "#osmosisjoin #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} added ${token1Amount} ${token1Ticker} and ${token2Amount} ${token2Ticker} tokens ${usdValue} to pool №${poolId} \n" +
    "${explorerUrl}";

export const notifyOsmosisJoinPool = async (
    sender: string,
    token1Amount: string,
    token1Ticker: string,
    token2Amount: string,
    token2Ticker: string,
    txhash: string,
    network: string,
    poolId: string,
    usdValue?: number,
    ranged?: boolean
) => {
    let joinEmoji = "💲";

    let finalMsg = interpolate(joinPoolPattern, {
        emoji: repeatEmoji(joinEmoji, usdValue),
        network: network,
        sender: await shortAddressWithIcns(sender),
        token1Amount: formatNum(token1Amount),
        token1Ticker,
        token2Amount: formatNum(token2Amount),
        token2Ticker,
        poolId,
        ranged: ranged ? "ranged" : "",
        usdValue: getUsdPriceString(usdValue),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

const exitPoolPattern =
    "#osmosisexit #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} removed ${token1Amount} ${token1Ticker} and ${token2Amount} ${token2Ticker} tokens ${usdValue} from ${ranged} pool №${poolId} \n" +
    "${explorerUrl}";

export const notifyOsmosisExitPool = async (
    sender: string,
    token1Amount: string,
    token1Ticker: string,
    token2Amount: string,
    token2Ticker: string,
    txhash: string,
    network: string,
    poolId: string,
    usdValue?: number,
    ranged?: boolean
) => {
    let joinEmoji = "💲";

    let finalMsg = interpolate(exitPoolPattern, {
        emoji: repeatEmoji(joinEmoji, usdValue),
        network: network,
        sender: await shortAddressWithIcns(sender),
        token1Amount: formatNum(token1Amount),
        token1Ticker,
        token2Amount: formatNum(token2Amount),
        token2Ticker,
        poolId,
        ranged: ranged ? "ranged" : "",
        usdValue: getUsdPriceString(usdValue),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

const joinOneSidePoolPattern =
    "#osmosisjoin #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} added ${tokenAmount} ${tokenTicker} tokens ${usdValue} to ranged pool №${poolId} \n" +
    "${explorerUrl}";

export const notifyOsmosisJoinPoolOneSide = async (
    sender: string,
    tokenAmount: string,
    tokenTicker: string,
    txhash: string,
    network: string,
    poolId: string,
    usdValue?: number
) => {
    let joinEmoji = "💲";

    let finalMsg = interpolate(joinOneSidePoolPattern, {
        emoji: repeatEmoji(joinEmoji, usdValue),
        network: network,
        sender: await shortAddressWithIcns(sender),
        tokenAmount: formatNum(tokenAmount),
        tokenTicker,
        poolId,
        usdValue: getUsdPriceString(usdValue),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

const exitOneSidePoolPattern =
    "#osmosisexit #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} removed ${tokenAmount} ${tokenTicker} tokens ${usdValue} from ranged pool №${poolId} \n" +
    "${explorerUrl}";

export const notifyOsmosisExitPoolOneSide = async (
    sender: string,
    tokenAmount: string,
    tokenTicker: string,
    txhash: string,
    network: string,
    poolId: string,
    usdValue?: number
) => {
    let joinEmoji = "💲";

    let finalMsg = interpolate(exitOneSidePoolPattern, {
        emoji: repeatEmoji(joinEmoji, usdValue),
        network: network,
        sender: await shortAddressWithIcns(sender),
        tokenAmount: formatNum(tokenAmount),
        tokenTicker,
        poolId,
        usdValue: getUsdPriceString(usdValue),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}

//1 emoji for every 100k usd
const repeatEmoji = (emoji: string, price?: number) => emoji.repeat(price && price > 0 ? Math.min(Math.ceil(price / 500000), 10) : 1);
//const getUsdPriceString = (usdPrice: number | undefined, amount: number) => usdPrice ? `(USD $${formatNum(usdPrice * amount)})` : "";
const getUsdPriceString = (usdVolume: number | undefined) => usdVolume ? `(USD $${formatNum(usdVolume)})` : "";

const formatNum = (num: BigSource) => {
    try {
        let n = Big(num);
        return new Intl.NumberFormat().format(Number(n.toFixed(n.lt(1) ? 2 : 0)));
    } catch (e) {
        console.warn(`cannot format number ${num}`);
        return "";
    }
}

const getExplorerUrl = (network: string, txhash: string) => {
    let chain = chains.find(x => x.chain_name === network);
    if (!chain || !chain.explorers || chain.explorers.length === 0) {
        console.warn(`no explorers found for network ${network}`);
        return `TX Hash: ${txhash}`;
    }

    let explorer = chain.explorers.find(x => x.kind === "mintscan") || chain.explorers.at(1);
    if (!explorer?.tx_page) {
        console.warn(`no explorers found for network ${network}`);
        return `TX Hash: ${txhash}`;
    }

    return `<a href='${explorer.tx_page.replace("${txHash}", txhash)}'>TX link</a>`;
}

const defaultRetryCounts = 3;
const notify = async (message: string, retryCounter = 1) => {
    console.log(message);
    if (!isProdEnv)
        return;

    try {
        await bot.telegram.sendMessage(
            config.channel,
            message,
            {
                parse_mode: "HTML",
                disable_web_page_preview: true
            });
    } catch (e) {
        console.warn(`Error notifyting to telegram. Error: ${JSON.stringify(e)}`);
        if (retryCounter <= defaultRetryCounts) {
            await new Promise(res => setTimeout(res, TimeSpan.fromMinutes(10).totalMilliseconds));
            notify(message, retryCounter + 1);
        }
    }
}

const interpolate = (str: string, args: any) => {
    Object.keys(args).forEach(arg => {
        str = str.replaceAll("${" + arg + "}", args[arg])
    });

    return str.replace(/  +/g, ' ');
}