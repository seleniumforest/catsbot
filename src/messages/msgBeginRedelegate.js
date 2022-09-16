const {
    getDefaultRegistry,
    fromBaseUnit,
    getValidatorMoniker,
    getDenomConfig } = require("../helpers");
const { notifyMsgRedelegate } = require("../tgbot");
const Big = require('big.js');
const msgTrigger = "msgBeginRedelegate";

const handleMsgBeginRedelegate = async (network, msg, tx) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let redelegation = decodedMsg.amount;

    let {
        thresholdAmount,
        decimals,
        ticker
    } = getDenomConfig(network, redelegation.denom, msgTrigger);

    if (!redelegation?.amount || !thresholdAmount)
        return;

    if (new Big(redelegation.amount).lt(new Big(thresholdAmount)))
        return;

    await notifyMsgRedelegate(
        decodedMsg.delegatorAddress?.toString(),
        await getValidatorMoniker(network, decodedMsg.validatorSrcAddress),
        await getValidatorMoniker(network, decodedMsg.validatorDstAddress),
        ticker,
        fromBaseUnit(redelegation?.amount, decimals),
        tx.hash,
        network);
}

module.exports = handleMsgBeginRedelegate