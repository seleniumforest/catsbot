const { getCosmwasmRegistry, fromBaseUnit, shortAddress } = require("../helpers");
const Big = require('big.js');
const { notify, getCw20TokenInfo } = require("../requests");

const handleMsgExecuteContract = async (network, msg, txhash) => {
    let decodedMsg = getCosmwasmRegistry().decode(msg);
    let decodedExecuteContractMsg = JSON.parse(new TextDecoder().decode(decodedMsg.msg));
    let tokenConfig = network.notifyDenoms.find(x => x.contract === decodedMsg.contract);
    let isTransferMsg = isCw20TransferMsg(decodedExecuteContractMsg);
    if (!isTransferMsg || !tokenConfig)
        return;

    let tokenInfo = await getCw20TokenInfo(network, decodedMsg.contract);
    if (!tokenInfo)
        return;

    if (new Big(decodedExecuteContractMsg.transfer.amount).lt(new Big(tokenConfig.amount)))
        return;

    await notifyCw20Transfer(
        decodedMsg.sender, 
        decodedExecuteContractMsg.transfer.recipient, 
        tokenInfo.symbol, 
        fromBaseUnit(decodedExecuteContractMsg.transfer.amount, tokenInfo.decimals), 
        txhash,
        network.name
    )
}

const notifyCw20Transfer = async (sender, reciever, denom, amount, txhash, network) => {
    await notify(`💲 #tokentransfer 💲\nAddress ${shortAddress(sender)} ` +
        `transferred ${amount} ${denom} tokens to ${shortAddress(reciever)}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>TX link</a>`);
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