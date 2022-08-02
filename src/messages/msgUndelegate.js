const { getDefaultRegistry, fromBaseUnit } = require("../helpers");
const { notifyMsgUndelegate } = require("../tgbot");
const Big = require('big.js');

const handleMsgUndelegate = (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let undelegation = decodedMsg.amount;
    let undelegatedDenomConfig = network.notifyDenoms.find(x => x.denom === undelegation.denom);
    if (!undelegation?.amount || !undelegatedDenomConfig?.amount)
        return;

    if (new Big(undelegation?.amount).lt(new Big(undelegatedDenomConfig?.amount))) {
        console.log(`${network.name}: undelegation less than ${undelegatedDenomConfig.amount} ${undelegatedDenomConfig.denom}`)
        return;
    }

    notifyMsgUndelegate(
        decodedMsg.delegatorAddress?.toString(),
        decodedMsg.validatorAddress?.toString(),
        undelegatedDenomConfig.ticker,
        fromBaseUnit(undelegation?.amount, undelegatedDenomConfig?.decimals),
        txhash,
        network.name);
}

module.exports = handleMsgUndelegate