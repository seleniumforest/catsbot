const { getDefaultRegistry, fromBaseUnit, shortAddress } = require("../helpers");
const { notifyMsgDelegate } = require("../tgbot");
const Big = require('big.js');
const { getValidatorProfiles } = require("../requests");

const handleMsgDelegate = async (network, msg, tx) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let delegation = decodedMsg.amount;
    let delegatedDenomConfig = 
        network.notifyDenoms.find(x => x.denom && (x.denom === delegation.denom));
    let amountThreshhold = 
        delegatedDenomConfig?.msgAmounts?.["msgDelegate"] || delegatedDenomConfig?.amount;

    if (!delegation?.amount || !amountThreshhold)
        return;

    if (new Big(delegation?.amount).lt(new Big(amountThreshhold)))
        return;

    let validatorProfiles =
        await getValidatorProfiles(network.name);
    let validatorAddress = decodedMsg.validatorAddress?.toString();
    let validatorName = validatorProfiles
        .find(x => x.operator_address === validatorAddress)?.moniker;

    await notifyMsgDelegate(
        decodedMsg.delegatorAddress?.toString(),
        validatorName || shortAddress(validatorAddress),
        delegatedDenomConfig.ticker,
        fromBaseUnit(delegation?.amount, delegatedDenomConfig?.decimals),
        tx.hash,
        network);
}

module.exports = handleMsgDelegate