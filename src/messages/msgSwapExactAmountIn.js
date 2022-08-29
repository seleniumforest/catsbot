const { fromBaseUnit, getOsmosisRegistry, shortAddress, fromBase64, getDenomConfig } = require("../helpers");
const { notifyOsmosisSwap } = require("../tgbot");
const Big = require('big.js');
const { default: axios } = require("axios");
const assetlist = require("../osmosis_assetlist.json").assets;
const config = require("../../config.json");
const msgTrigger = "msgSwapExactAmountIn";

const handleMsgSwapExactAmountIn = async (network, msg, tx) => {
    let decodedMsg = getOsmosisRegistry().decode(msg);

    let {
        inTicker,
        inAmount,
        inTokenDecimals,
        outTicker,
        outAmount,
        outTokenDecimals
    } = await parseSwapMsg(decodedMsg, tx);

    //probably arbitrage
    if (inTicker === outTicker)
        return;

    let allNotifyDenoms = config.networks.flatMap(x => x.notifyDenoms);
    let inTickerMatch = allNotifyDenoms.find(x => x.ticker === inTicker);
    let outTickerMatch = allNotifyDenoms.find(x => x.ticker === outTicker);

    let inAmountThreshhold = getNotifyAmountThreshold(allNotifyDenoms, inTicker);
    let outAmountThreshhold = getNotifyAmountThreshold(allNotifyDenoms, outTicker);

    if (inTickerMatch && new Big(inAmount).gte(new Big(inAmountThreshhold)) ||
        outTickerMatch && new Big(outAmount).gte(new Big(outAmountThreshhold)))
        notifyOsmosisSwap(
            decodedMsg.sender,
            fromBaseUnit(inAmount, inTokenDecimals),
            inTicker,
            fromBaseUnit(outAmount, outTokenDecimals),
            outTicker,
            tx.hash,
            network
        );
}

const getNotifyAmountThreshold = (allNotifyDenoms, ticker) => {
    let inTickerMatch = allNotifyDenoms.find(x => x.ticker === ticker);
    return inTickerMatch?.msgAmounts?.[msgTrigger] || inTickerMatch?.amount;
}

const parseSwapMsg = async (decodedMsg, tx) => {
    let targetDenom = decodedMsg.routes[decodedMsg.routes.length - 1].tokenOutDenom;

    let recievedCoin = tx.events
        .filter(x => x.type === "token_swapped")
        .flatMap(x => x.attributes)
        .find(x => fromBase64(x.key) === "tokens_out" &&
            fromBase64(x.value).includes(targetDenom))?.value;

    let { ticker: inTicker, decimals: inTokenDecimals } =
        await searchInfoByDenom(decodedMsg.tokenIn.denom);
    let inAmount = decodedMsg.tokenIn.amount;

    let { outTicker, outAmount, decimals: outTokenDecimals } =
        await parseOutCoin(fromBase64(recievedCoin))

    return {
        inTicker,
        inAmount,
        inTokenDecimals,
        outTicker,
        outAmount,
        outTokenDecimals
    }
}

//splits 83927482ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2
//to sum and ticker
const parseOutCoin = async (swappedCoin) => {
    let separatorIndex = Array.from(swappedCoin).findIndex(x => !Number.isInteger(parseInt(x)));

    let amount = swappedCoin.substring(0, separatorIndex);
    let denom = swappedCoin.substring(separatorIndex, swappedCoin.length);
    let { ticker, decimals, sourceDenom } = await searchInfoByDenom(denom);

    return {
        outAmount: amount,
        outTicker: ticker,
        decimals,
        sourceDenom
    }
}

const searchInfoByDenom = async (denom) => {
    //try search in assetlist.json
    let resultFromAssetlist = assetlist?.find(x => x.base === denom);
    if (resultFromAssetlist) {
        return {
            sourceDenom: resultFromAssetlist?.ibc?.source_denom,
            ticker: resultFromAssetlist?.symbol,
            decimals: resultFromAssetlist?.denom_units
                .find(x => x.denom.toLowerCase() === resultFromAssetlist?.symbol?.toLowerCase() ||
                    x.denom.toLowerCase() === resultFromAssetlist?.display?.toLowerCase())
                ?.exponent
        };
    }
    //try search on imperator api
    try {
        let tickerUrl = 'https://api-osmosis.imperator.co/search/v1/symbol?denom=';
        let decimalsUrl = 'https://api-osmosis.imperator.co/search/v1/exponent?symbol=';
        let { data: { symbol } } = await axios.get(`${tickerUrl}${denom}`);
        let { data: { exponent } } = await axios.get(`${decimalsUrl}${denom}`);

        return {
            ticker: symbol,
            decimals: exponent
        }
    } catch (err) { }
}

module.exports = handleMsgSwapExactAmountIn;