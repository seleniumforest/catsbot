const { wasmTypes } = require("@cosmjs/cosmwasm-stargate/build/modules");
const { Registry } = require("@cosmjs/proto-signing");
const { defaultRegistryTypes } = require("@cosmjs/stargate");
const big = require("big.js");
const osmojs = require("osmojs");
const { getValidatorProfiles } = require("./requests");

const fromBaseUnit = (amount, decimals = 6, fractionDigits = 2) => {
    if (!amount)
        return null;

    return big(amount.toString().replace(",", "."))
        .div(Math.pow(10, decimals))
        .toFixed(fractionDigits);
}

const getDefaultRegistry = () => new Registry(defaultRegistryTypes);
const getOsmosisRegistry = () => new Registry([
    [
        "/osmosis.gamm.v1beta1.MsgSwapExactAmountIn",
        osmojs.osmosis.gamm.v1beta1.MsgSwapExactAmountIn
    ]
]);

const getCosmwasmRegistry = () => new Registry(wasmTypes);
const shortAddress = (addr, start = 9, end = 4) =>
    `${addr.slice(0, start)}...${addr.slice(addr.length - end, addr.length)}`;
const fromBase64 = (decoded) => Buffer.from(decoded, 'base64').toString();

const getValidatorMoniker = async (network, validatorAddress) => {
    let allProfiles = await getValidatorProfiles(network.name, network.validatorsApi);
    let address = validatorAddress?.toString();
    let profile = allProfiles
        .find(x => x.operator_address === address);

    if (profile)
        return profile?.moniker;

    return shortAddress(address);
}

const getDenomConfig = (network, denom, msgTrigger) => {
    let undelegatedDenomConfig =
        network.notifyDenoms.find(x => x.denom && (x.denom === denom));

    let thresholdAmount =
        undelegatedDenomConfig?.msgAmounts?.[msgTrigger] ||
        undelegatedDenomConfig?.amount;

    return {
        thresholdAmount,
        ticker: undelegatedDenomConfig?.ticker,
        decimals: undelegatedDenomConfig?.decimals
    }
}

module.exports = {
    fromBaseUnit,
    getDefaultRegistry,
    getCosmwasmRegistry,
    shortAddress,
    getOsmosisRegistry,
    fromBase64,
    getValidatorMoniker,
    getDenomConfig
}