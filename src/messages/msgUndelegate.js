const { getDefaultRegistry, fromBaseUnit } = require("../helpers");
const { notifyMsgUndelegate } = require("../tgbot");

const handleMsgUndelegate = (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let delegation = decodedMsg.amount;
    let undelegatedDenomConfig = network.notifyDenoms.find(x => x.denom === delegation.denom);
    let amountDelegated = fromBaseUnit(delegation?.amount, 6);
    let minNotifyAmount = fromBaseUnit(undelegatedDenomConfig?.amount);
    if (!amountDelegated || !minNotifyAmount)
        return;

    if (parseFloat(amountDelegated) < minNotifyAmount) {
        console.log(`${network.name}: undelegation less than ${undelegatedDenomConfig.amount} ${undelegatedDenomConfig.denom}`)
        return;
    }

    notifyMsgUndelegate(
        decodedMsg.delegatorAddress?.toString(),
        decodedMsg.validatorAddress?.toString(),
        undelegatedDenomConfig.ticker,
        amountDelegated,
        txhash,
        network.name);
}

module.exports = handleMsgUndelegate