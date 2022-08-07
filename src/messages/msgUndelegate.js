const { getDefaultRegistry, fromBaseUnit, shortAddress } = require("../helpers");
const { notifyMsgUndelegate } = require("../tgbot");
const Big = require('big.js');
const { getValidatorProfiles } = require("../validators");

const handleMsgUndelegate = async (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let undelegation = decodedMsg.amount;
    let undelegatedDenomConfig = network.notifyDenoms.find(x => x.denom && (x.denom === undelegation.denom));
    if (!undelegation?.amount || !undelegatedDenomConfig?.amount)
        return;

    if (new Big(undelegation?.amount).lt(new Big(undelegatedDenomConfig?.amount)))
        return;

    let validatorProfiles =
        await getValidatorProfiles(network.name, network.endpoints[0].validators);
    let validatorAddress = decodedMsg.validatorAddress?.toString();
    let validatorName = validatorProfiles
        .find(x => x.operator_address === validatorAddress)?.moniker;

    await notifyMsgUndelegate(
        decodedMsg.delegatorAddress?.toString(),
        validatorName ?? shortAddress(validatorAddress),
        undelegatedDenomConfig.ticker,
        fromBaseUnit(undelegation?.amount, undelegatedDenomConfig?.decimals),
        txhash,
        network.name);
}

module.exports = handleMsgUndelegate