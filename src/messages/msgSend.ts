import { HandlerContext } from ".";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { getNotifyDenomConfig } from "../config";
import Big from "big.js";
import { notifyMsgSend } from "../integrations/telegram";
import { fromBaseUnit } from "../helpers";
import { getPriceByIdentifier } from "../integrations/coingecko";

export const handleMsgSend = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgSend;

    for (const transfer of decodedMsg.amount) {
        let config = await getNotifyDenomConfig(ctx.chain.chain_name, transfer.denom, "msgSend");
        if (!config)
            continue;

        if (Big(transfer.amount).lt(Big(config.thresholdAmount)))
            return;

        let usdPrice = await getPriceByIdentifier(config.identifier);
        if (!usdPrice)
            return;
        let usdValue = fromBaseUnit(transfer.amount, config.decimals).mul(usdPrice).toNumber();

        notifyMsgSend(
            decodedMsg.fromAddress,
            decodedMsg.toAddress,
            config.ticker,
            fromBaseUnit(transfer.amount, config.decimals),
            ctx.tx.hash,
            ctx.chain.chain_name,
            usdValue
        )
    }
}