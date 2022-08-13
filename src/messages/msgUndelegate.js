const { getDefaultRegistry, fromBaseUnit, shortAddress } = require("../helpers");
const Big = require('big.js');
const { getValidatorProfiles, notify } = require("../requests");

const handleMsgUndelegate = async (network, msg, txhash) => {
    let decodedMsg = getDefaultRegistry().decode(msg);
    let undelegation = decodedMsg.amount;
    let undelegatedDenomConfig = network.notifyDenoms.find(x => x.denom && (x.denom === undelegation.denom));
    if (!undelegation?.amount || !undelegatedDenomConfig?.amount)
        return;

    if (new Big(undelegation?.amount).lt(new Big(undelegatedDenomConfig?.amount)))
        return;

    let validatorProfiles =
        await getValidatorProfiles(network.name, network.endpoints[0].validators);
    let validatorAddress = decodedMsg.validatorAddress?.toString();
    let validatorName = validatorProfiles
        .find(x => x.operator_address === validatorAddress)?.moniker;

    await notifyMsgUndelegate(
        decodedMsg.delegatorAddress?.toString(),
        validatorName ?? shortAddress(validatorAddress),
        undelegatedDenomConfig.ticker,
        fromBaseUnit(undelegation?.amount, undelegatedDenomConfig?.decimals),
        txhash,
        network.name);
}

const notifyMsgUndelegate = async (delegator, validator, denom, amount, txhash, network) => {
    await notify(`🦐 #undelegation 🦐\nAddress ${shortAddress(delegator)} ` +
        `undelegated ${amount} ${denom} from ${validator}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

module.exports = handleMsgUndelegate