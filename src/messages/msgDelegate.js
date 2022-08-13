const { getDefaultRegistry, fromBaseUnit, shortAddress } = require("../helpers");
const Big = require('big.js');
const { getValidatorProfiles, notify } = require("../requests");

const handleMsgDelegate = async (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let delegation = decodedMsg.amount;
    let delegatedDenomConfig = network.notifyDenoms.find(x => x.denom && (x.denom === delegation.denom));
    if (!delegation?.amount || !delegatedDenomConfig?.amount)
        return;

    if (new Big(delegation?.amount).lt(new Big(delegatedDenomConfig?.amount)))
        return;

    let validatorProfiles =
        await getValidatorProfiles(network.name, network.endpoints[0].validators);
    let validatorAddress = decodedMsg.validatorAddress?.toString();
    let validatorName = validatorProfiles
        .find(x => x.operator_address === validatorAddress)?.moniker;

    await notifyMsgDelegate(
        decodedMsg.delegatorAddress?.toString(),
        validatorName ?? shortAddress(validatorAddress),
        delegatedDenomConfig.ticker,
        fromBaseUnit(delegation?.amount, delegatedDenomConfig?.decimals),
        txhash,
        network.name);
}

const notifyMsgDelegate = async (from, to, denom, amount, txhash, network) => {
    await notify(`🐳 #delegation 🐳\nAddress ${shortAddress(from)} ` +
        `delegated ${amount} ${denom} to ${to}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

module.exports = handleMsgDelegate