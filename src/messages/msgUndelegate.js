const {
    getDefaultRegistry,
    fromBaseUnit,
    getValidatorMoniker,
    getDenomConfig } = require("../helpers");
const { notifyMsgUndelegate } = require("../tgbot");
const Big = require('big.js');
const msgTrigger = "msgUndelegate";

const handleMsgUndelegate = async (network, msg, tx) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let undelegation = decodedMsg.amount;

    let {
        thresholdAmount,
        decimals,
        ticker
    } = getDenomConfig(network, undelegation.denom, msgTrigger);

    if (!undelegation?.amount || !thresholdAmount)
        return;

    if (new Big(undelegation.amount).lt(new Big(thresholdAmount)))
        return;

    await notifyMsgUndelegate(
        decodedMsg.delegatorAddress?.toString(),
        await getValidatorMoniker(network, decodedMsg.validatorAddress),
        ticker,
        fromBaseUnit(undelegation?.amount, decimals),
        tx.hash,
        network);
}

module.exports = handleMsgUndelegate