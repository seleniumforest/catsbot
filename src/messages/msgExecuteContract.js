const { getCosmwasmRegistry, fromBaseUnit } = require("../helpers");
const { notifyCw20Transfer } = require("../tgbot");
const Big = require('big.js');
const { getCw20TokenInfo } = require("../requests");

const handleMsgExecuteContract = async (network, msg, tx) => {
    let decodedMsg = getCosmwasmRegistry().decode(msg);
    let decodedExecuteContractMsg = JSON.parse(new TextDecoder().decode(decodedMsg.msg));
    let tokenConfig = network.notifyDenoms.find(x => x.contract === decodedMsg.contract);

    let amountThreshhold = 
        tokenConfig?.msgAmounts?.["msgExecuteContract"] || tokenConfig?.amount;

    let isTransferMsg = isCw20TransferMsg(decodedExecuteContractMsg);
    if (!isTransferMsg || !tokenConfig)
        return;

    let tokenInfo = await getCw20TokenInfo(network, decodedMsg.contract);
    if (!tokenInfo)
        return;

    if (new Big(decodedExecuteContractMsg.transfer.amount).lt(new Big(amountThreshhold)))
        return;

    await notifyCw20Transfer(
        decodedMsg.sender,
        decodedExecuteContractMsg.transfer.recipient,
        tokenInfo.symbol,
        fromBaseUnit(decodedExecuteContractMsg.transfer.amount, tokenInfo.decimals),
        tx.hash,
        network
    )
}

const isCw20TransferMsg = (msg) => {
    // ¯\_(ツ)_/¯
    return msg?.transfer &&
        msg?.transfer?.recipient &&
        msg?.transfer?.amount &&
        Object.keys(msg).length === 1 &&
        Object.keys(msg.transfer).length === 2;
}

module.exports = handleMsgExecuteContract