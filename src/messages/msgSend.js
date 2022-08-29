const { getDefaultRegistry, fromBaseUnit, getDenomConfig } = require("../helpers");
const { notifyMsgSend } = require("../tgbot");
const Big = require('big.js');
const msgTrigger = "msgSend";

const handleMsgSend = async (network, msg, tx) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let transfers = decodedMsg.amount
        .filter((x) => network.notifyDenoms.map(d => d.denom).includes(x.denom));

    for (const tr of transfers) {
        let {
            thresholdAmount,
            ticker, 
            decimals
        } = getDenomConfig(network, tr.denom, msgTrigger);

        if (!tr?.amount || !thresholdAmount)
            return;

        //tr?.amount < transfferedDenomConfig?.amount using bigjs lib
        if (new Big(tr?.amount).lt(new Big(thresholdAmount)))
            return;

        await notifyMsgSend(
            decodedMsg.fromAddress?.toString(),
            decodedMsg.toAddress?.toString(),
            ticker,
            fromBaseUnit(tr?.amount, decimals),
            tx.hash,
            network);
    }
}

module.exports = handleMsgSend;