const { getDefaultRegistry, fromBaseUnit } = require("../helpers");
const { notifyMsgDelegate } = require("../tgbot");

const handleMsgDelegate = (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let delegation = decodedMsg.amount;
    let delegatedDenomConfig = network.notifyDenoms.find(x => x.denom === delegation.denom);
    let amountDelegated = fromBaseUnit(delegation?.amount, 6);
    let minNotifyAmount = fromBaseUnit(delegatedDenomConfig?.amount);
    if (!amountDelegated || !minNotifyAmount)
        return;

    if (parseFloat(amountDelegated) < minNotifyAmount) {
        console.log(`${network.name}: delegation less than ${delegatedDenomConfig.amount} ${delegatedDenomConfig.denom}`)
        return;
    }

    notifyMsgDelegate(
        decodedMsg.delegatorAddress?.toString(),
        decodedMsg.validatorAddress?.toString(),
        delegatedDenomConfig.ticker,
        amountDelegated,
        txhash,
        network.name);
}

module.exports = handleMsgDelegate