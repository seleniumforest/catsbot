const { getCosmwasmRegistry, fromBaseUnit } = require("../helpers");
const { notifyCw20Transfer } = require("../tgbot");
const Big = require('big.js');
const { CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const log = require("../logger");

const memoizedTokens = [];

const handleMsgExecuteContract = async (network, msg, txhash) => {
    let decodedMsg = getCosmwasmRegistry().decode(msg);
    let decodedExecuteContractMsg = JSON.parse(new TextDecoder().decode(decodedMsg.msg));
    let tokenConfig = network.notifyDenoms.find(x => x.contract === decodedMsg.contract);
    let isTransferMsg = isCw20TransferMsg(decodedExecuteContractMsg);
    if (!isTransferMsg || !tokenConfig)
        return;

    let tokenInfo = await getCw20TokenInfo(network.endpoints[0].rpc, decodedMsg.contract);
    if (!tokenInfo)
        return;

    if (new Big(decodedExecuteContractMsg.transfer.amount).lt(new Big(tokenConfig.amount)))
        return;

    notifyCw20Transfer(
        decodedMsg.sender, 
        decodedExecuteContractMsg.transfer.recipient, 
        tokenInfo.symbol, 
        fromBaseUnit(decodedExecuteContractMsg.transfer.amount, tokenInfo.decimals), 
        txhash,
        network.name
    )
}

const getCw20TokenInfo = async (rpc, contract) => {
    if (memoizedTokens[contract])
        return memoizedTokens[contract];

    try {
        const client = await CosmWasmClient.connect(rpc);
        const info = await client.queryContractSmart(contract, { "token_info": {} });

        memoizedTokens[contract] = info;
        return info;
    }
    catch (err) {
        log.error(JSON.stringify(err));
    }
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