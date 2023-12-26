import { MsgSwapExactAmountIn, MsgSwapExactAmountOut } from "osmojs/dist/codegen/osmosis/gamm/v1beta1/tx";
import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import Big from "big.js";
import { notifyOsmosisSwap } from "../integrations/telegram";
import { fromBaseUnit } from "../helpers";
import { prisma } from "../db";
import { Token } from "@prisma/client";
import { getPriceByIdentifier } from "../integrations/coingecko";


export const handleMsgSwapExactAmountInOut = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgSwapExactAmountOut;
    if (ctx.tx.hash === "01A7ED4F6EA7B0373C1AF9B6E70B2C04AAFAE89C2F35BE828F5EF3DBB5E79A56")
        debugger;
    let swap: TokenSwapInfo | undefined;
    if (ctx.msgType.includes("MsgSwapExactAmountIn"))
        swap = await parseSwapMsgIn(ctx);
    else if (ctx.msgType.includes("MsgSwapExactAmountOut"))
        swap = await parseSwapMsgOut(ctx);

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

const parseSwapMsgOut = async (ctx: HandlerContext): Promise<TokenSwapInfo | undefined> => {
    let decodedMsg = ctx.decodedMsg as MsgSwapExactAmountOut;

    let tokenSwappedFirst = ctx.tx.events
        .filter(x => x.type === "token_swapped")
        .find(x => x.attributes.find(y => y?.key === "pool_id")?.value.toString() === decodedMsg.routes.at(1)?.poolId.toString());
    let tokenIn = tokenSwappedFirst?.attributes.find(x => x.key === "tokens_in")?.value;
    if (!tokenIn)
        return;

    let tokenInMeta = await parseStringCoin(tokenIn);
    if (!tokenInMeta)
        return;

    let tokenOutMeta = await prisma.token.findUnique({
        where: {
            identifier: decodedMsg.tokenOut.denom
        }
    });
    if (!tokenOutMeta)
        return;

    return {
        tokenIn: {
            ...tokenInMeta
        },
        tokenOut: {
            ...tokenOutMeta,
            amount: decodedMsg.tokenOut.amount
        }
    }
}

const parseSwapMsgIn = async (ctx: HandlerContext): Promise<TokenSwapInfo | undefined> => {
    let decodedMsg = ctx.decodedMsg as MsgSwapExactAmountIn;

    let tokenSwappedLast = ctx.tx.events
        .filter(x => x.type === "token_swapped")
        .find(x => x.attributes.find(y => y?.key === "pool_id")?.value.toString() === decodedMsg.routes.at(-1)?.poolId.toString());
    let tokenOut = tokenSwappedLast?.attributes.find(x => x.key === "tokens_out")?.value;
    if (!tokenOut)
        return;

    let parsedTokenOut = await parseStringCoin(tokenOut);
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
//to meta
const parseStringCoin = async (swappedCoin: string): Promise<SwappedToken | undefined> => {
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