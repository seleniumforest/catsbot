import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import { notifyOsmosisJoinPool } from "../integrations/telegram";
import { fromBaseUnit, parseStringCoin, shortAddress } from "../helpers";
import { getPriceByIdentifier } from "../integrations/coingecko";

export const handleMsgJoinPool = async (ctx: HandlerContext) => {
    let event = ctx.tx.events.find(x => x.type === "pool_joined");
    if (!event)
        return;

    let poolIdEventValue = event.attributes.find(x => x.key === "pool_id")?.value;
    let tokensInEventValue = event.attributes.find(x => x.key === "tokens_in")?.value;
    let sender = event.attributes.find(x => x.key === "sender")?.value;
    if (!poolIdEventValue || !tokensInEventValue || !sender)
        return;

    let [token1, token2] = await Promise.all(tokensInEventValue.split(",").map(x => parseStringCoin(x, true)));
    let token1Config = await getNotifyDenomConfig(ctx.chain.chain_name, token1?.identifier, "msgJoinPool");
    let token2Config = await getNotifyDenomConfig(ctx.chain.chain_name, token2?.identifier, "msgJoinPool");
    if (!token1Config && !token2Config)
        return;

    let token1Price = await getPriceByIdentifier(token1Config?.identifier);
    let token2Price = await getPriceByIdentifier(token2Config?.identifier);
    let token1Value = fromBaseUnit(token1?.amount || 0, token1?.decimals).mul(token1Price || 0);
    let token2Value = fromBaseUnit(token2?.amount || 0, token2?.decimals).mul(token2Price || 0);
    let usdValue: number | undefined;

    if (token1Value.eq(0) || token2Value.eq(0)) {
        usdValue = (token1Value.gt(token2Value) ? token1Value : token2Value).mul(2).toNumber();
    } else if (token1Value.gt(0) && token2Value.gt(0)) {
        usdValue = token1Value.plus(token2Value).toNumber();
    }

    notifyOsmosisJoinPool(
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