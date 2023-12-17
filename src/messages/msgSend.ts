import { HandlerContext } from ".";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { getNotifyDenomConfig } from "../config";
import Big from "big.js";
import { notifyMsgSend } from "../integrations/telegram";
import { fromBaseUnit } from "../helpers";

export const handleMsgSend = async (ctx: HandlerContext) => {
    let decodedMsg = ctx.decodedMsg as MsgSend;

    for (const transfer of decodedMsg.amount) {
        let config = getNotifyDenomConfig(ctx.chain.chain_name, transfer.denom, "msgSend");
        if (!config)
            continue;

        if (Big(transfer.amount).lt(Big(config.thresholdAmount)))
            return;

        notifyMsgSend(
            decodedMsg.fromAddress,
            decodedMsg.toAddress,
            config.ticker,
            fromBaseUnit(transfer.amount, config.decimals),
            ctx.tx.hash,
            ctx.chain.chain_name
        )
    }
}