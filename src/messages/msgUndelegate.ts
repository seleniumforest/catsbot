import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import Big from "big.js";
import { fromBaseUnit, getValidatorMoniker } from "../helpers";
import { notifyMsgUndelegate } from "../integrations/telegram";

export const handleMsgUndelegate = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgDelegate;
    let coin = decodedMsg.amount;

    let config = getNotifyDenomConfig(ctx.chain.chain_name, coin.denom, "msgUndelegate");
    if (!config)
        return;

    if (!coin.amount || !config.thresholdAmount)
        return;

    if (Big(coin.amount).lt(Big(config.thresholdAmount)))
        return;

    await notifyMsgUndelegate(
        decodedMsg.delegatorAddress,
        await getValidatorMoniker(ctx.chain.chain_name, decodedMsg.validatorAddress),
        config.ticker,
        fromBaseUnit(coin.amount, config.decimals),
        ctx.tx.hash,
        ctx.chain.chain_name);
}
