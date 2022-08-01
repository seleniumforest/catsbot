const { getDefaultRegistry, fromBaseUnit } = require("../helpers");
const { notifyMsgSend } = require("../tgbot");

const handleMsgSend = (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let transfers = decodedMsg.amount.filter((x) => network.notifyDenoms.map(d => d.denom).includes(x.denom));
    transfers.forEach(tr => {
        let transfferedDenomConfig = network.notifyDenoms.find(x => x.denom === tr.denom);
        let amountSent = fromBaseUnit(tr?.amount, 6);
        let minNotifyAmount = fromBaseUnit(transfferedDenomConfig?.amount);
        if (!amountSent || !minNotifyAmount)
            return;

        if (parseFloat(amountSent) < minNotifyAmount) {
            console.log(`${network.name}: transfer less than ${transfferedDenomConfig.amount} ${transfferedDenomConfig.denom}`)
            return;
        }

        notifyMsgSend(
            decodedMsg.fromAddress?.toString(),
            decodedMsg.toAddress?.toString(),
            transfferedDenomConfig.ticker,
            amountSent,
            txhash,
            network.name);
    })
}

module.exports = handleMsgSend;