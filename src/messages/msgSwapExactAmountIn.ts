import { MsgSwapExactAmountIn } from "osmojs/dist/codegen/osmosis/gamm/v1beta1/tx";
import { HandlerContext } from ".";
import { fromBase64 } from "@cosmjs/encoding";
import { MsgTypes, NotifyDenom, getConfig } from "../config";
import Big from "big.js";
import { notifyOsmosisSwap } from "../integrations/telegram";
import { fromBaseUnit, shortAddress } from "../helpers";
import { getTokenByDenomFromDb, saveTokenToDb } from "../db";
import axios from "axios";
import { setupCache } from "axios-cache-interceptor";

const axiosCached = setupCache(axios, {
    ttl: 1000 * 60 * 60 * 12
});

export const handleMsgSwapExactAmountIn = async (ctx: HandlerContext) => {
    if (ctx.tx.hash === "2C27D347C7D722E60C779AEE640E42FEC94C98506430F77C8EF183B4D8626C3C")
        debugger;
    let decodedMsg = ctx.decodedMsg as MsgSwapExactAmountIn;
    let swap = await parseSwapMsg(ctx);
    if (ctx.tx.hash === "2C27D347C7D722E60C779AEE640E42FEC94C98506430F77C8EF183B4D8626C3C")
        debugger;
    if (!swap || swap.inTicker === swap.outTicker)
        return;

    let allNotifyDenoms = getConfig().networks.find(x => x.name === ctx.chain.chain_name)?.notifyDenoms;
    if (!allNotifyDenoms)
        return;

    //todo match by denom instead of ticker
    let inTickerMatch = allNotifyDenoms.find(x => x.ticker === swap!.inTicker);
    let outTickerMatch = allNotifyDenoms.find(x => x.ticker === swap!.outTicker);

    let inAmountThreshhold = getNotifyAmountThreshold(allNotifyDenoms, swap.inTicker, "msgSwapExactAmountIn");
    let outAmountThreshhold = getNotifyAmountThreshold(allNotifyDenoms, swap.outTicker, "msgSwapExactAmountIn");

    if (inTickerMatch && inAmountThreshhold && Big(swap.inAmount).gte(Big(inAmountThreshhold)) ||
        outTickerMatch && outAmountThreshhold && Big(swap.outAmount).gte(Big(outAmountThreshhold)))
        notifyOsmosisSwap(
            decodedMsg.sender,
            fromBaseUnit(swap.inAmount, swap.inTokenDecimals),
            swap.inTicker,
            fromBaseUnit(swap.outAmount, swap.outTokenDecimals),
            swap.outTicker,
            ctx.tx.hash,
            ctx.chain.chain_name
        );
}

const getNotifyAmountThreshold = (allNotifyDenoms: NotifyDenom[] | undefined, ticker: string, msgType: MsgTypes) => {
    let inTickerMatch = allNotifyDenoms?.find(x => x.ticker === ticker);
    return inTickerMatch?.msgAmounts?.[msgType] || inTickerMatch?.amount;
}

const parseSwapMsg = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgSwapExactAmountIn;

    let tokenSwappedLast = ctx.tx.events.filter(x => x.type === "token_swapped").at(-1);
    let tokenOut = tokenSwappedLast?.attributes.find(x => x.key === "tokens_out")?.value;
    if (!tokenOut)
        return;

    let parsedTokenOut = await parseOutCoin(tokenOut);
    if (!parsedTokenOut)
        return;

    let infoResult = await searchInfoByDenom(decodedMsg.tokenIn.denom);
    if (!infoResult)
        return;

    return {
        inTicker: infoResult.ticker,
        inAmount: decodedMsg.tokenIn.amount,
        inTokenDecimals: infoResult.decimals,
        outTicker: parsedTokenOut.outTicker,
        outAmount: parsedTokenOut.outAmount,
        outTokenDecimals: parsedTokenOut.decimals
    }
}

//splits 83927482ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2
//to sum and ticker
const parseOutCoin = async (swappedCoin: string) => {
    let separatorIndex = Array.from(swappedCoin).findIndex(x => !Number.isInteger(parseInt(x)));

    let amount = swappedCoin.substring(0, separatorIndex);
    let denom = swappedCoin.substring(separatorIndex, swappedCoin.length);
    let infoResult = await searchInfoByDenom(denom);
    if (!infoResult)
        return;

    return {
        outAmount: amount,
        outTicker: infoResult.ticker,
        decimals: infoResult.decimals
    }
}

const searchInfoByDenom = async (denom: string) => {
    let localdbResult = await getTokenByDenomFromDb("osmosis", denom);
    if (localdbResult)
        return localdbResult;

    //try fetch from github
    try {
        console.warn("searchInfoByDenom: trying to fetch from github");
        let url = "https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json";
        let githubTokensData = await axiosCached.get(url);

        for (let asset of githubTokensData.data.assets) {
            await saveTokenToDb(
                "osmosis",
                {
                    id: asset.base,
                    decimals: asset.denom_units.find((x: any) => x.exponent > 0)?.exponent,
                    ticker: asset.symbol,
                    coingeckoId: asset.coingecko_id || ""
                });
        }

        let githubListResult = searchDenomInAssetList(githubTokensData.data.assets, denom);
        if (githubListResult)
            return githubListResult;
    } catch (err: any) {
        console.log(`Cannot find on github denom ${denom} ${JSON.stringify(err?.message)}`)
    }

    //try search on imperator api
    try {
        let tickerUrl = 'https://api-osmosis.imperator.co/search/v1/symbol?denom=';
        let decimalsUrl = 'https://api-osmosis.imperator.co/search/v1/exponent?symbol=';
        let { data: { symbol } } = await axios.get(`${tickerUrl}${denom}`);
        let { data: { exponent } } = await axios.get(`${decimalsUrl}${denom}`);

        return {
            ticker: symbol || shortAddress(denom, 8, 4),
            decimals: exponent || 6
        }
    } catch (err: any) {
        console.log(`Cannot find denom ${denom} ${JSON.stringify(err?.message)}`)
    }
}

const searchDenomInAssetList = (list: any[], denom: string) => {
    let resultFromAssetlist = list?.find(x => x.base === denom);
    if (resultFromAssetlist) {
        return {
            ticker: resultFromAssetlist?.symbol,
            decimals: resultFromAssetlist?.denom_units
                .find((x: any) => x.denom.toLowerCase() === resultFromAssetlist?.symbol?.toLowerCase() ||
                    x.denom.toLowerCase() === resultFromAssetlist?.display?.toLowerCase())
                ?.exponent
        };
    }
}