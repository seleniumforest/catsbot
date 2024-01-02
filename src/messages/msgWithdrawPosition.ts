import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import { notifyOsmosisExitPool, notifyOsmosisExitPoolOneSide } from "../integrations/telegram";
import { fromBaseUnit, isContractAddress, parseStringCoin, shortAddress } from "../helpers";
import { getPriceByIdentifier } from "../integrations/coingecko";
import { MsgWithdrawPosition } from "osmojs/dist/codegen/osmosis/concentrated-liquidity/tx";
import Big from "big.js";

export const msgWithdrawPosition = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgWithdrawPosition;
    let oneSidePosition = false;
    let sender = decodedMsg.sender;

    let positionEvent = ctx.tx.events.find(x => x.type === "withdraw_position");
    let amount0 = positionEvent?.attributes.find(x => x.key === "amount0")?.value;
    let amount1 = positionEvent?.attributes.find(x => x.key === "amount1")?.value;
    if (!positionEvent || !amount0 || !amount1)
        return;

    let amount0Big = Big(amount0).abs();
    let amount1Big = Big(amount1).abs();

    if (amount0Big.eq(0) || amount1Big.eq(0))
        oneSidePosition = true;

    //just for example tx B029F5A54C3A48A0688DE5028BA71DE5BFC99FB2C6537EAC80D25DD398A402F7
    //we want to find transfer from contract's address to sender where 
    //amount0 = 4253 and amount1 = 314737 from withdraw_position match transfer's amount
    //4253factory/osmo1xqw2sl9zk8a6pch0csaw78n4swg5ws8t62wc5qta4gnjxfqg6v2qcs243k/stuibcx,314737uosmo
    let trasferEvent = ctx.tx.events.find(x => {
        let withdrawnAmounts = x.attributes.find(y => y.key === "amount")?.value;
        if (!withdrawnAmounts)
            return false;
        //split 4253factory/osmo1xqw2sl9zk8a6pch0csaw78n4swg5ws8t62wc5qta4gnjxfqg6v2qcs243k/stuibcx,314737uosmo
        //to 4253factory/osmo1xqw2sl9zk8a6pch0csaw78n4swg5ws8t62wc5qta4gnjxfqg6v2qcs243k/stuibcx AND 314737uosmo
        let assets = withdrawnAmounts.split(",");

        //check if there's asset starts with 4253 amount, if amount0 === 0 then it's one sided withdraw
        if (amount0Big.gt(0) && !assets.find(x => x.startsWith(amount0Big.toFixed())))
            return false;

        //check if there's asset starts with 314737 amount, if amount0 === 0 then it's one sided withdraw
        if (amount1Big.gt(0) && !assets.find(x => x.startsWith(amount1Big.toFixed())))
            return false;

        return x.type === "transfer" &&
            //we search transfer from sender's address
            x.attributes.find(y => y.key === "recipient")?.value === sender &&
            //to contract address
            isContractAddress(x.attributes.find(y => y.key === "sender")?.value) &&
            //if there's multiple msgs executed through authz, we should also check msg_index
            ((ctx.msgIndex > 0 && ctx.isAuthzTx) ? x.attributes.find(y => y.key === "authz_msg_index")?.value === ctx.msgIndex.toString() : true)
    });

    let poolIdValue = positionEvent.attributes.find(x => x.key === "pool_id")?.value;
    let transferEventValue = trasferEvent?.attributes.find(x => x.key === "amount")?.value;
    if (!poolIdValue || !transferEventValue || !sender)
        return;

    let [token1, token2] = await Promise.all(transferEventValue.split(",").map(x => parseStringCoin(x, true)));
    let token1Config = await getNotifyDenomConfig(ctx.chain.chain_name, token1?.identifier, "msgWithdrawPosition");
    let token2Config = await getNotifyDenomConfig(ctx.chain.chain_name, token2?.identifier, "msgWithdrawPosition");
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
    if (oneSidePosition)
        usdValue = (token1Price ? token1Value : token2Value).toNumber();
    else
        usdValue = token1Price && token2Price ? token1Value.plus(token2Value).toNumber() : undefined


    if (oneSidePosition) {
        return await notifyOsmosisExitPoolOneSide(
            sender,
            fromBaseUnit(token1?.amount || 0, token1?.decimals).toFixed(),
            token1Config!.ticker,
            ctx.tx.hash,
            ctx.chain.chain_name,
            poolIdValue,
            usdValue
        );
    };

    await notifyOsmosisExitPool(
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