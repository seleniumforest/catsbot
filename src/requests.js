const { StargateClient } = require("@cosmjs/stargate");
const axios = require("axios");
const NodeCache = require("node-cache");
const log = require("./logger");

const validatorsCache = new NodeCache({
    stdTTL: 60 * 60 * 12 //12 hours in seconds
});

const getValidatorProfiles = async (network, fetchUrl) => {
    let cached = validatorsCache.get(network);
    if (cached)
        return cached;

    try {
        let profiles = await axios.get(fetchUrl, {
            headers: {
                "Origin": "https://www.mintscan.io",
                "Referer": "https://www.mintscan.io/"
            }
        });
        validatorsCache.set(network, profiles.data);
        return profiles.data;
    }
    catch (err) {
        log.error("failed to fetch validators " + JSON.stringify(err));
        return [];
    }
}

const getTxsInBlock = async (network, height) => {
    let rpcs = network.endpoints.map(x => x.rpc);
    for (const rpc of rpcs) {
        try {
            let rpcClient = await StargateClient.connect(rpc);
            let txs = await rpcClient.searchTx({ height: parseInt(height) });
            return txs;
        } catch (err) {
            console.log(`Error fetching txs in ${network.name}/${height} error : ${JSON.stringify(err)}`);
        }
    }
}


module.exports = {
    getValidatorProfiles,
    getTxsInBlock
}