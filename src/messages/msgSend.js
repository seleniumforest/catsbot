const { getDefaultRegistry, fromBaseUnit } = require("../helpers");
const { notifyMsgSend } = require("../tgbot");
const Big = require('big.js');

const handleMsgSend = async (network, msg, tx) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let transfers = decodedMsg.amount
        .filter((x) => network.notifyDenoms.map(d => d.denom).includes(x.denom));

    for (const tr of transfers) {
        let transfferedDenomConfig = 
            network.notifyDenoms.find(x => x.denom && (x.denom === tr.denom));

        let amountThreshhold = 
            transfferedDenomConfig?.msgAmounts?.["msgSend"] || transfferedDenomConfig?.amount;

        if (!tr?.amount || !amountThreshhold)
            return;

        //tr?.amount < transfferedDenomConfig?.amount using bigjs lib
        if (new Big(tr?.amount).lt(new Big(amountThreshhold)))
            return;

        await notifyMsgSend(
            decodedMsg.fromAddress?.toString(),
            decodedMsg.toAddress?.toString(),
            transfferedDenomConfig.ticker,
            fromBaseUnit(tr?.amount, transfferedDenomConfig?.decimals),
            tx.hash,
            network);
    }
}

module.exports = handleMsgSend;