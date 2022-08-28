const { getDefaultRegistry, fromBaseUnit, shortAddress } = require("../helpers");
const { notifyMsgUndelegate } = require("../tgbot");
const Big = require('big.js');
const { getValidatorProfiles } = require("../requests");

const handleMsgUndelegate = async (network, msg, tx) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let undelegation = decodedMsg.amount;
    let undelegatedDenomConfig =
        network.notifyDenoms.find(x => x.denom && (x.denom === undelegation.denom));

    let amountThreshhold =
        undelegatedDenomConfig?.msgAmounts?.["msgUndelegate"] ||
        undelegatedDenomConfig?.amount;

    if (!undelegation?.amount || !amountThreshhold)
        return;

    if (new Big(undelegation?.amount).lt(new Big(amountThreshhold)))
        return;

    let validatorProfiles =
        await getValidatorProfiles(network.name);
    let validatorAddress = decodedMsg.validatorAddress?.toString();
    let validatorName = validatorProfiles
        .find(x => x.operator_address === validatorAddress)?.moniker;

    await notifyMsgUndelegate(
        decodedMsg.delegatorAddress?.toString(),
        validatorName || shortAddress(validatorAddress),
        undelegatedDenomConfig.ticker,
        fromBaseUnit(undelegation?.amount, undelegatedDenomConfig?.decimals),
        tx.hash,
        network);
}

module.exports = handleMsgUndelegate