import { MsgDelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import Big from "big.js";
import { fromBaseUnit } from "../helpers";
import { notifyMsgUndelegate } from "../integrations/telegram";
import { getValidatorMoniker } from "../integrations/validators";
import { getPriceByIdentifier } from "../integrations/coingecko";

export const handleMsgUndelegate = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgDelegate;
    let coin = decodedMsg.amount;

    let config = await getNotifyDenomConfig(ctx.chain.chain_name, coin.denom, "msgUndelegate");
    if (!config)
        return;

    if (!coin.amount || !config.thresholdAmount)
        return;

    if (Big(coin.amount).lt(Big(config.thresholdAmount)))
        return;

    let usdPrice = await getPriceByIdentifier(config.identifier);
    if (!usdPrice)
        return;
    let usdValue = fromBaseUnit(coin.amount, config.decimals).mul(usdPrice).toNumber();

    await notifyMsgUndelegate(
        decodedMsg.delegatorAddress,
        await getValidatorMoniker(ctx.chain.chain_name, decodedMsg.validatorAddress),
        config.ticker,
        fromBaseUnit(coin.amount, config.decimals),
        ctx.tx.hash,
        ctx.chain.chain_name,
        usdValue);
}
