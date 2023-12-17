import Big from "big.js";
import { HandlerContext } from ".";
import { getNotifyDenomConfig } from "../config";
import { fromBaseUnit, getCw20TokenInfo } from "../helpers";
import { notifyCw20Transfer } from "../integrations/telegram";


export const handleMsgExecuteContract = async (ctx: HandlerContext) => {
    let decodedExecuteContractMsg = JSON.parse(new TextDecoder().decode(ctx.decodedMsg.msg));
    let tokenConfig = getNotifyDenomConfig(ctx.chain.chain_name, ctx.decodedMsg.contract, "msgExecuteContract");

    let isTransferMsg = isCw20TransferMsg(decodedExecuteContractMsg);
    if (!isTransferMsg || !tokenConfig || !tokenConfig.thresholdAmount)
        return;

    let tokenInfo = await getCw20TokenInfo(ctx.chain.chain_name, ctx.decodedMsg.contract);
    if (!tokenInfo)
        return;

    if (Big(decodedExecuteContractMsg.transfer.amount).lt(Big(tokenConfig.thresholdAmount)))
        return;

    await notifyCw20Transfer(
        ctx.decodedMsg.sender,
        decodedExecuteContractMsg.transfer.recipient,
        tokenInfo.ticker,
        fromBaseUnit(decodedExecuteContractMsg.transfer.amount, tokenInfo.decimals),
        ctx.tx.hash,
        ctx.chain.chain_name
    )
}

//<kekw>
const isCw20TransferMsg = (msg: any) => {
    return msg?.transfer &&
        msg?.transfer?.recipient &&
        msg?.transfer?.amount &&
        Object.keys(msg).length === 1 &&
        Object.keys(msg.transfer).length === 2;
}
//</kekw>