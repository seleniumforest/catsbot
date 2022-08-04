const { getDefaultRegistry, fromBaseUnit } = require("../helpers");
const { notifyMsgSend } = require("../tgbot");
const Big = require('big.js');

const handleMsgSend = (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let transfers = decodedMsg.amount.filter((x) => network.notifyDenoms.map(d => d.denom).includes(x.denom));
    transfers.forEach(tr => {
        let transfferedDenomConfig = network.notifyDenoms.find(x => x.denom && (x.denom === tr.denom));
        if (!tr?.amount || !transfferedDenomConfig?.amount)
            return;

        //tr?.amount < transfferedDenomConfig?.amount using bigjs lib
        if (new Big(tr?.amount).lt(new Big(transfferedDenomConfig?.amount)))
            return;

        notifyMsgSend(
            decodedMsg.fromAddress?.toString(),
            decodedMsg.toAddress?.toString(),
            transfferedDenomConfig.ticker,
            fromBaseUnit(tr?.amount, transfferedDenomConfig?.decimals),
            txhash,
            network.name);
    })
}

module.exports = handleMsgSend;