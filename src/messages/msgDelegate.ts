import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import Big from "big.js";
import { fromBaseUnit } from "../helpers";
import { notifyMsgDelegate } from "../integrations/telegram";
import { getValidatorMoniker } from "../integrations/validators";

export const handleMsgDelegate = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgDelegate;
    let coin = decodedMsg.amount;

    let config = getNotifyDenomConfig(ctx.chain.chain_name, coin.denom, "msgDelegate");
    if (!config)
        return;

    if (!coin.amount || !config.thresholdAmount)
        return;

    if (Big(coin.amount).lt(Big(config.thresholdAmount)))
        return;

    await notifyMsgDelegate(
        decodedMsg.delegatorAddress?.toString(),
        await getValidatorMoniker(ctx.chain.chain_name, decodedMsg.validatorAddress),
        config.ticker,
        fromBaseUnit(coin.amount, config.decimals),
        ctx.tx.hash,
        ctx.chain.chain_name);
}