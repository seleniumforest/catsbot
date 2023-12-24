import { MsgSwapExactAmountIn } from "osmojs/dist/codegen/osmosis/gamm/v1beta1/tx";
import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import Big from "big.js";
import { notifyOsmosisSwap } from "../integrations/telegram";
import { fromBaseUnit } from "../helpers";
import { prisma } from "../db";
import { Token } from "@prisma/client";
import { getPriceByIdentifier } from "../integrations/coingecko";


export const handleMsgSwapExactAmountIn = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgSwapExactAmountIn;
    let swap = await parseSwapMsg(ctx);

    if (!swap || swap.tokenIn.ticker === swap.tokenOut.ticker)
        return;

    let inAmountConfig = await getNotifyDenomConfig(ctx.chain.chain_name, swap.tokenIn.identifier, "msgSwapExactAmountIn");
    let outAmountConfig = await getNotifyDenomConfig(ctx.chain.chain_name, swap.tokenOut.identifier, "msgSwapExactAmountIn");

    let inUsdPriceValue = await getPriceByIdentifier(inAmountConfig?.identifier);
    let outUsdPriceValue = await getPriceByIdentifier(outAmountConfig?.identifier);
    let inUsdValue = inUsdPriceValue && fromBaseUnit(swap.tokenIn.amount, swap.tokenIn.decimals).mul(inUsdPriceValue).toNumber();
    let outUsdValue = outUsdPriceValue && fromBaseUnit(swap.tokenOut.amount, swap.tokenOut.decimals).mul(outUsdPriceValue).toNumber();

    if (inAmountConfig && Big(swap.tokenIn.amount).gte(Big(inAmountConfig.thresholdAmount)) ||
        outAmountConfig && Big(swap.tokenOut.amount).gte(Big(outAmountConfig.thresholdAmount)))
        notifyOsmosisSwap(
            decodedMsg.sender,
            fromBaseUnit(swap.tokenIn.amount, swap.tokenIn.decimals),
            swap.tokenIn.ticker,
            fromBaseUnit(swap.tokenOut.amount, swap.tokenOut.decimals),
            swap.tokenOut.ticker,
            ctx.tx.hash,
            ctx.chain.chain_name,
            inUsdValue || outUsdValue
        );
}

const parseSwapMsg = async (ctx: HandlerContext): Promise<TokenSwapInfo | undefined> => {
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

    let tokenInResult = await prisma.token.findUnique({
        where: {
            network: "osmosis",
            identifier: decodedMsg.tokenIn.denom
        }
    });
    if (!tokenInResult)
        return;

    return {
        tokenIn: {
            ...tokenInResult,
            amount: decodedMsg.tokenIn.amount
        },
        tokenOut: { ...parsedTokenOut }
    }
}

//splits 83927482ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2
//to sum and ticker
const parseOutCoin = async (swappedCoin: string): Promise<SwappedToken | undefined> => {
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
        amount,
        ...infoResult
    }
}

type SwappedToken = Token & { amount: string };

type TokenSwapInfo = {
    tokenIn: SwappedToken,
    tokenOut: SwappedToken
}