const { getDefaultRegistry, fromBaseUnit, shortAddress } = require("../helpers");
const { notifyMsgDelegate } = require("../tgbot");
const Big = require('big.js');
const { getValidatorProfiles } = require("../validators");

const handleMsgDelegate = async (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let delegation = decodedMsg.amount;
    let delegatedDenomConfig = network.notifyDenoms.find(x => x.denom && (x.denom === delegation.denom));
    if (!delegation?.amount || !delegatedDenomConfig?.amount)
        return;

    if (new Big(delegation?.amount).lt(new Big(delegatedDenomConfig?.amount)))
        return;

    let validatorProfiles =
        await getValidatorProfiles(network.name, network.endpoints[0].validators);
    let validatorAddress = decodedMsg.validatorAddress?.toString();
    let validatorName = validatorProfiles
        .find(x => x.operator_address === validatorAddress)?.moniker;

    notifyMsgDelegate(
        decodedMsg.delegatorAddress?.toString(),
        validatorName ?? shortAddress(validatorAddress),
        delegatedDenomConfig.ticker,
        fromBaseUnit(delegation?.amount, delegatedDenomConfig?.decimals),
        txhash,
        network.name);
}

module.exports = handleMsgDelegate