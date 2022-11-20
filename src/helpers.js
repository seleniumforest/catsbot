const { wasmTypes } = require("@cosmjs/cosmwasm-stargate/build/modules");
const { Registry } = require("@cosmjs/proto-signing");
const { defaultRegistryTypes } = require("@cosmjs/stargate");
const big = require("big.js");
const osmojs = require("osmojs");
const { getValidatorProfiles, getValidatorInfo } = require("./requests");
const sifchainDecoder = require("../chain-specific/sifchain/tx");
const { getValidatorByAddress, saveValidator } = require("./db");

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

const getSifchainRegistry = () => new Registry([
    [
        "/sifnode.clp.v1.MsgSwap",
        sifchainDecoder.msgSwap
    ]
]);

const getCosmwasmRegistry = () => new Registry(wasmTypes);
const shortAddress = (addr, start = 9, end = 4) =>
    `${addr.slice(0, start)}...${addr.slice(addr.length - end, addr.length)}`;
const fromBase64 = (decoded) => Buffer.from(decoded, 'base64').toString();

const getValidatorMoniker = async (network, validatorAddress) => {
    let targetProfile = await getValidatorByAddress(network.name, validatorAddress);

    if (!targetProfile) {
        let fetchedProfile = await getValidatorInfo(network.name, validatorAddress);
        await saveValidator(network.name, fetchedProfile);
        targetProfile = fetchedProfile;
    }

    return targetProfile?.moniker || shortAddress(validatorAddress);
}

const getDenomConfig = (network, denom, msgTrigger) => {
    let denomConfig =
        network.notifyDenoms.find(x => x.denom && (x.denom === denom));

    let thresholdAmount =
        denomConfig?.msgAmounts?.[msgTrigger] ||
        denomConfig?.amount;

    return {
        thresholdAmount,
        ticker: denomConfig?.ticker,
        decimals: denomConfig?.decimals || 6
    }
}

const dateToUnix = (dateStr) =>
    Math.floor(new Date(dateStr).getTime() / 1000)

module.exports = {
    fromBaseUnit,
    getDefaultRegistry,
    getCosmwasmRegistry,
    shortAddress,
    getOsmosisRegistry,
    fromBase64,
    getValidatorMoniker,
    getDenomConfig,
    getSifchainRegistry,
    dateToUnix
}