import { MsgBeginRedelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { HandlerContext } from ".";
import Big from "big.js";
import { getNotifyDenomConfig } from "../config";
import { notifyMsgRedelegate } from "../integrations/telegram";
import { fromBaseUnit, getValidatorMoniker } from "../helpers";

export const handleMsgBeginRedelegate = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgBeginRedelegate;
    let coin = decodedMsg.amount;

    let config = getNotifyDenomConfig(ctx.chain.chain_name, coin.denom, "msgBeginRedelegate");
    if (!config)
        return;

    if (!coin.amount || !config.thresholdAmount)
        return;

    let amount = Big(coin.amount);
    if (amount.lt(Big(config.thresholdAmount)))
        return;

    await notifyMsgRedelegate(
        decodedMsg.delegatorAddress?.toString(),
        await getValidatorMoniker(ctx.chain.chain_name, decodedMsg.validatorSrcAddress),
        await getValidatorMoniker(ctx.chain.chain_name, decodedMsg.validatorDstAddress),
        config.ticker,
        fromBaseUnit(amount, config.decimals),
        ctx.tx.hash,
        ctx.chain.chain_name);
};