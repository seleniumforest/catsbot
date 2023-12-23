import { Telegraf } from "telegraf";
import { getConfig } from "../config";
import { getTickerPrice } from "./coingecko";
import { chains } from "chain-registry";
import Big, { BigSource } from "big.js";
import { shortAddressWithIcns } from "./icns";

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
    network: string
) => {
    let sendEmoji = "💲";
    let usdPrice = await getTickerPrice(ticker);
    if (!usdPrice)
        return;

    let finalMsg = interpolate(msgSendPattern, {
        emoji: repeatEmoji(sendEmoji, Big(amount).mul(usdPrice).toNumber()),
        network: network,
        fromAddress: await shortAddressWithIcns(from),
        sentAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdPrice, amount.toNumber()),
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
    to: string,
    ticker: string,
    amount: Big,
    txhash: string,
    network: string
) => {
    let delegateEmoji = "🐳";
    let usdPrice = await getTickerPrice(ticker);
    if (!usdPrice)
        return;

    const finalMsg = interpolate(msgDelegatePattern, {
        emoji: repeatEmoji(delegateEmoji, amount.mul(usdPrice).toNumber()),
        network: network,
        fromAddress: await shortAddressWithIcns(from),
        delegatedAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdPrice, amount.toNumber()),
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

export const notifyMsgUndelegate = async (
    delegator: string,
    validator: string,
    ticker: string,
    amount: Big,
    txhash: string,
    network: string
) => {
    let undelegateEmoji = "🦐";
    let usdPrice = await getTickerPrice(ticker);
    if (!usdPrice)
        return;

    const finalMsg = interpolate(msgUndelegatePattern, {
        emoji: repeatEmoji(undelegateEmoji, amount.mul(usdPrice).toNumber()),
        network: network,
        delegator: await shortAddressWithIcns(delegator),
        undelegatedAmount: formatNum(amount),
        ticker,
        validator,
        usdPrice: getUsdPriceString(usdPrice, amount.toNumber()),
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
    network: string
) => {
    let redelegateEmoji = "♻️";
    let usdPrice = await getTickerPrice(ticker);
    if (!usdPrice)
        return

    const finalMsg = interpolate(msgRedelegatePattern, {
        emoji: repeatEmoji(redelegateEmoji, amount.mul(usdPrice).toNumber()),
        network: network,
        delegator: await shortAddressWithIcns(delegator),
        fromValidator,
        toValidator,
        redelegatedAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdPrice, amount.toNumber()),
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
    network: string
) => {
    let transferEmoji = "💲";
    let usdPrice = await getTickerPrice(ticker);
    if (!usdPrice)
        return;

    let finalMsg = interpolate(cw20TransferPattern, {
        emoji: repeatEmoji(transferEmoji, amount.mul(usdPrice).toNumber()),
        network: network,
        sender: await shortAddressWithIcns(sender),
        sentAmount: formatNum(amount),
        ticker,
        usdPrice: getUsdPriceString(usdPrice, amount.toNumber()),
        reciever: await shortAddressWithIcns(reciever),
        explorerUrl: getExplorerUrl(network, txhash)
    });

    await notify(finalMsg);
}


const osmosisSwapPattern =
    "#osmosisswap #${network} \n" +
    "${emoji} \n" +
    "Address ${sender} swapped ${inAmount} ${inTicker} ${inUsdPrice} tokens to ${outAmount} ${outTicker} ${outUsdPrice} \n" +
    "${explorerUrl}";

export const notifyOsmosisSwap = async (
    sender: string,
    inAmount: Big,
    inTicker: string,
    outAmount: Big,
    outTicker: string,
    txhash: string,
    network: string
) => {
    let swapEmoji = "🔄";
    let inUsdPrice = await getTickerPrice(inTicker);
    let outUsdPrice = await getTickerPrice(outTicker);
    if (!inUsdPrice && !outUsdPrice)
        return;
    let price = inUsdPrice ? inAmount.mul(inUsdPrice) : outAmount.mul(outUsdPrice!);

    let inUsdPriceString = getUsdPriceString(inUsdPrice, inAmount.toNumber());
    let outUsdPriceString = getUsdPriceString(outUsdPrice, outAmount.toNumber());
    if (inUsdPrice && outUsdPrice)
        inUsdPriceString = "";

    let finalMsg = interpolate(osmosisSwapPattern, {
        emoji: repeatEmoji(swapEmoji, price.toNumber()),
        network: network,
        sender: await shortAddressWithIcns(sender),
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
const repeatEmoji = (emoji: string, price: number) => emoji.repeat(price && price > 0 ? Math.min(Math.ceil(price / 500000), 10) : 1);
const getUsdPriceString = (usdPrice: number | undefined, amount: number) => usdPrice ? `(USD $${formatNum(usdPrice * amount)})` : "";

const formatNum = (num: BigSource) => {
    let n = Big(num);
    return new Intl.NumberFormat().format(Number(n.toFixed(n.lt(1) ? 2 : 0)));
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

const notify = async (message: string) => {
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

const interpolate = (str: string, args: any) => {
    Object.keys(args).forEach(arg => {
        str = str.replaceAll("${" + arg + "}", args[arg])
    });

    return str.replace("  ", " ");
}