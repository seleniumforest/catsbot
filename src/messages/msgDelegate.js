const { getDefaultRegistry, fromBaseUnit } = require("../helpers");
const { notifyMsgDelegate } = require("../tgbot");
const Big = require('big.js');

const handleMsgDelegate = (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let delegation = decodedMsg.amount;
    let delegatedDenomConfig = network.notifyDenoms.find(x => x.denom === delegation.denom);
    if (!delegation?.amount || !delegatedDenomConfig?.amount)
        return;

    if (new Big(delegation?.amount).lt(new Big(delegatedDenomConfig?.amount))) {
        console.log(`${network.name}: delegation less than ${delegatedDenomConfig.amount} ${delegatedDenomConfig.denom}`)
        return;
    }

    notifyMsgDelegate(
        decodedMsg.delegatorAddress?.toString(),
        decodedMsg.validatorAddress?.toString(),
        delegatedDenomConfig.ticker,
        fromBaseUnit(delegation?.amount, delegatedDenomConfig?.decimals),
        txhash,
        network.name);
}

module.exports = handleMsgDelegate