const { getDefaultRegistry, fromBaseUnit, shortAddress } = require("../helpers");
const Big = require('big.js');
const { notify } = require("../requests");

const handleMsgSend = async (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let transfers = decodedMsg.amount.filter((x) => network.notifyDenoms.map(d => d.denom).includes(x.denom));
    for (const tr of transfers) {
        let transfferedDenomConfig = network.notifyDenoms.find(x => x.denom && (x.denom === tr.denom));
        if (!tr?.amount || !transfferedDenomConfig?.amount)
            return;

        //tr?.amount < transfferedDenomConfig?.amount using bigjs lib
        if (new Big(tr?.amount).lt(new Big(transfferedDenomConfig?.amount)))
            return;

        await notifyMsgSend(
            decodedMsg.fromAddress?.toString(),
            decodedMsg.toAddress?.toString(),
            transfferedDenomConfig.ticker,
            fromBaseUnit(tr?.amount, transfferedDenomConfig?.decimals),
            txhash,
            network.name);
    }
}

const notifyMsgSend = async (from, to, denom, amount, txhash, network) => {
    await notify(`💲 #transfer 💲\nAddress ${shortAddress(from)} ` +
        `sent ${amount} ${denom} to ${shortAddress(to)}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

module.exports = handleMsgSend;