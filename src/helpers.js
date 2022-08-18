const { wasmTypes } = require("@cosmjs/cosmwasm-stargate/build/modules");
const { Registry } = require("@cosmjs/proto-signing");
const { defaultRegistryTypes } = require("@cosmjs/stargate");
const big = require("big.js");
const _ = require('lodash');

const fromBaseUnit = (amount, decimals = 6, fractionDigits = 2) => {
    if (!amount)
        return null;

    return big(amount.toString().replace(",", "."))
        .div(Math.pow(10, decimals))
        .toFixed(fractionDigits);
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
const shortAddress = (addr, start = 9, end = 4) =>
    `${addr.slice(0, start)}...${addr.slice(addr.length - end, addr.length)}`;


//enpointRankings section 
let enpointRankings = new Map();

const writeStats = (rpc, result) => {
    let key = rpc;
    let rank = enpointRankings.get(key) || 0;

    enpointRankings.set(key, result ? ++rank : --rank);
}

/*
    Ranking Algo: 
    1. Collect stats choosing random rpc from minRequestsToRank requiets.
        Give them +1 point for succesful response or -1 point for error.
        On this step we should just return shuffled array of rpcs.
    2. When there's some stats collected, just filter those who
        have negative rating and shuffle them for something 
        like load-balancing.
*/
const getRankedEndpoints = (endpoints) => {
    let minRequestsToRank = 100;
    let totalRequests = [...enpointRankings.entries()]
        .reduce((prev, [_, v]) => prev + Math.abs(v), 0);

    let ranked = [ ...endpoints ];

    if (totalRequests > minRequestsToRank) 
        ranked = ranked
            .filter(x => enpointRankings.get(x.address) > 0)
    
    return _.shuffle(ranked);
};

//end of enpointRankings section

module.exports = {
    fromBaseUnit,
    toBaseUnit,
    getDefaultRegistry,
    getCosmwasmRegistry,
    shortAddress,
    writeStats,
    getRankedEndpoints
}