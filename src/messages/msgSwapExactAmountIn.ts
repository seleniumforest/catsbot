import { MsgSwapExactAmountIn } from "osmojs/dist/codegen/osmosis/gamm/v1beta1/tx";
import { HandlerContext } from ".";
import { MsgTypes, NotifyDenom, getConfig } from "../config";
import Big from "big.js";
import { notifyOsmosisSwap } from "../integrations/telegram";
import { fromBaseUnit } from "../helpers";
import { prisma } from "../db";


export const handleMsgSwapExactAmountIn = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgSwapExactAmountIn;
    let swap = await parseSwapMsg(ctx);

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

    let tokenSwappedLast = ctx.tx.events
        .filter(x => x.type === "token_swapped")
        .find(x => x.attributes.find(y => y?.key === "pool_id")?.value.toString() === decodedMsg.routes.at(-1)?.poolId.toString());
    let tokenOut = tokenSwappedLast?.attributes.find(x => x.key === "tokens_out")?.value;
    if (!tokenOut)
        return;

    let parsedTokenOut = await parseOutCoin(tokenOut);
    if (!parsedTokenOut)
        return;

    let infoResult = await await prisma.token.findUnique({
        where: {
            network: "osmosis",
            identifier: decodedMsg.tokenIn.denom
        }
    });
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
    let infoResult = await prisma.token.findUnique({
        where: {
            network: "osmosis",
            identifier: denom
        }
    });
    if (!infoResult)
        return;

    return {
        outAmount: amount,
        outTicker: infoResult.ticker,
        decimals: infoResult.decimals
    }
}
