const { cosmWasmTypes, createWasmAminoConverters } = require("@cosmjs/cosmwasm-stargate");
const { wasmTypes } = require("@cosmjs/cosmwasm-stargate/build/modules");
const { Registry } = require("@cosmjs/proto-signing");
const { defaultRegistryTypes } = require("@cosmjs/stargate");
const big = require("big.js");

const fromBaseUnit = (amount, decimals = 6) => {
    if (!amount)
        return null;

    return big(amount.toString().replace(",", "."))
        .div(Math.pow(10, decimals))
        .toFixed();
}

const toBaseUnit = (amount, decimals = 6) => {
    if (!amount)
        return null;

    return big(amount.toString().replace(",", "."))
        .mul(Math.pow(10, decimals))
        .toFixed();
}

const getDefaultRegistry = () => new Registry(defaultRegistryTypes);
const getCosmwasmRegistry = () => new Registry(wasmTypes);

module.exports = {
    fromBaseUnit,
    toBaseUnit,
    getDefaultRegistry,
    getCosmwasmRegistry
}