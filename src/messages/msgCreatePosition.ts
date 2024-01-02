import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import { notifyOsmosisJoinPool, notifyOsmosisJoinPoolOneSide } from "../integrations/telegram";
import { fromBaseUnit, isContractAddress, parseStringCoin, shortAddress } from "../helpers";
import { getPriceByIdentifier } from "../integrations/coingecko";
import { MsgCreatePosition } from "osmojs/dist/codegen/osmosis/concentrated-liquidity/tx";
import Big from "big.js";

export const msgCreatePosition = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgCreatePosition;
    let oneSidePosition = false;
    if (ctx.tx.hash === "61638087981C64F08D74361D82AE38FBC04D08504E9636469BAD9D7BA8B575CE")
        debugger;
    let sender = decodedMsg.sender;
    let trasferEvent = ctx.tx.events.find(x => x.type === "transfer" &&
        //we search transfer from sender's address
        x.attributes.find(y => y.key === "sender")?.value === sender &&
        //to contract address
        isContractAddress(x.attributes.find(y => y.key === "recipient")?.value) &&
        //if there's multiple msgs executed through authz, we should also check msg_index
        ((ctx.msgIndex > 0 && ctx.isAuthzTx) ? x.attributes.find(y => y.key === "authz_msg_index")?.value === ctx.msgIndex.toString() : true));
    let positionEvent = ctx.tx.events.find(x => x.type === "create_position");
    if (!trasferEvent || !positionEvent)
        return;

    let poolIdValue = positionEvent.attributes.find(x => x.key === "pool_id")?.value;
    let transferEventValue = trasferEvent.attributes.find(x => x.key === "amount")?.value;
    if (positionEvent.attributes.find(x => x.key === "amount0")?.value === "0" ||
        positionEvent.attributes.find(x => x.key === "amount1")?.value === "0")
        oneSidePosition = true;
    if (!poolIdValue || !transferEventValue || !sender)
        return;

    let [token1, token2] = await Promise.all(transferEventValue.split(",").map(x => parseStringCoin(x, true)));
    let token1Config = await getNotifyDenomConfig(ctx.chain.chain_name, token1?.identifier, "msgCreatePosition");
    let token2Config = await getNotifyDenomConfig(ctx.chain.chain_name, token2?.identifier, "msgCreatePosition");
    if ((!token1Config && !token2Config))
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
    if (oneSidePosition)
        usdValue = (token1Price ? token1Value : token2Value).toNumber();
    else
        usdValue = token1Price && token2Price ? token1Value.plus(token2Value).toNumber() : undefined

    if (oneSidePosition) {
        return await notifyOsmosisJoinPoolOneSide(
            sender,
            fromBaseUnit(token1?.amount || 0, token1?.decimals).toFixed(),
            token1Config!.ticker,
            ctx.tx.hash,
            ctx.chain.chain_name,
            poolIdValue,
            usdValue
        );
    };

    await notifyOsmosisJoinPool(
        sender,
        fromBaseUnit(token1?.amount || 0, token1?.decimals).toFixed() || "",
        token1?.ticker || shortAddress(token1?.identifier || "") || "",
        fromBaseUnit(token2?.amount || 0, token2?.decimals).toFixed() || "",
        token2?.ticker || shortAddress(token2?.identifier || "") || "",
        ctx.tx.hash,
        ctx.chain.chain_name,
        poolIdValue,
        usdValue,
        true
    )
}