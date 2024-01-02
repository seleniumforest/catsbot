import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import { notifyOsmosisExitPool, notifyOsmosisJoinPool } from "../integrations/telegram";
import { fromBaseUnit, parseStringCoin, shortAddress } from "../helpers";
import { getPriceByIdentifier } from "../integrations/coingecko";
import { MsgTypes } from "../types";
import Big from "big.js";

export const handleMsgJoinExitPool = async (ctx: HandlerContext) => {
    let msgType: MsgTypes | undefined = "msgJoinPool";
    let tokensEventKey = "tokens_in";
    let eventKey = "pool_joined";
    let notifierFunc = notifyOsmosisJoinPool;
    if (ctx.msgType === "/osmosis.gamm.v1beta1.MsgExitPool") {
        msgType = "msgExitPool";
        tokensEventKey = "tokens_out";
        eventKey = "pool_exited";
        notifierFunc = notifyOsmosisExitPool
    }
    else if (ctx.msgType !== "/osmosis.gamm.v1beta1.MsgJoinPool")
        return;

    let event = ctx.tx.events.find(x => x.type === eventKey);
    if (!event)
        return;

    let poolIdEventValue = event.attributes.find(x => x.key === "pool_id")?.value;
    let tokensInEventValue = event.attributes.find(x => x.key === tokensEventKey)?.value;
    let sender = event.attributes.find(x => x.key === "sender")?.value;
    if (!poolIdEventValue || !tokensInEventValue || !sender)
        return;

    let [token1, token2] = await Promise.all(tokensInEventValue.split(",").map(x => parseStringCoin(x, true)));
    let token1Config = await getNotifyDenomConfig(ctx.chain.chain_name, token1?.identifier, msgType);
    let token2Config = await getNotifyDenomConfig(ctx.chain.chain_name, token2?.identifier, msgType);
    if (!token1Config && !token2Config)
        return;

    let matchByToken1 = token1Config?.thresholdAmount && token1?.amount && Big(token1.amount).gt(token1Config.thresholdAmount);
    let matchByToken2 = token2Config?.thresholdAmount && token2?.amount && Big(token2.amount).gt(token2Config.thresholdAmount);
    if (!matchByToken1 && !matchByToken2)
        return;

    let token1Price = await getPriceByIdentifier(token1?.identifier);
    let token2Price = await getPriceByIdentifier(token2?.identifier);
    let token1Value = fromBaseUnit(token1?.amount || 0, token1?.decimals).mul(token1Price || 0);
    let token2Value = fromBaseUnit(token2?.amount || 0, token2?.decimals).mul(token2Price || 0);
    let usdValue: number | undefined;

    if (token1Value.eq(0) || token2Value.eq(0)) {
        usdValue = (token1Value.gt(token2Value) ? token1Value : token2Value).mul(2).toNumber();
    } else if (token1Value.gt(0) && token2Value.gt(0)) {
        usdValue = token1Value.plus(token2Value).toNumber();
    }

    await notifierFunc(
        sender,
        fromBaseUnit(token1?.amount || 0, token1?.decimals).toFixed() || "",
        token1?.ticker || shortAddress(token1?.identifier || "") || "",
        fromBaseUnit(token2?.amount || 0, token2?.decimals).toFixed() || "",
        token2?.ticker || shortAddress(token2?.identifier || "") || "",
        ctx.tx.hash,
        ctx.chain.chain_name,
        poolIdEventValue,
        usdValue
    )
}