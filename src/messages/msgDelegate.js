const { getDefaultRegistry, fromBaseUnit, getDenomConfig, getValidatorMoniker } = require("../helpers");
const { notifyMsgDelegate } = require("../integrations/telegram");
const Big = require('big.js');
const msgTrigger = "msgDelegate";

const handleMsgDelegate = async (network, msg, tx) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let delegation = decodedMsg.amount;

    let {
        thresholdAmount,
        ticker, 
        decimals
    } = getDenomConfig(network, delegation.denom, msgTrigger);

    if (!delegation?.amount || !thresholdAmount)
        return;

    if (new Big(delegation?.amount).lt(new Big(thresholdAmount)))
        return;

    await notifyMsgDelegate(
        decodedMsg.delegatorAddress?.toString(),
        await getValidatorMoniker(network, decodedMsg.validatorAddress),
        ticker,
        fromBaseUnit(delegation?.amount, decimals),
        tx.hash,
        network);
}

module.exports = handleMsgDelegate