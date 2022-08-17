const { StargateClient } = require("@cosmjs/stargate");
const axios = require("axios");
const { co } = require("co");
const NodeCache = require("node-cache");
const config = require("../config.json");
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
    for (const { address: rpc } of network.getEndpoints()) {
        try {
            let rpcClient = await StargateClient.connect(rpc);
            let txs = await rpcClient.searchTx({ height: parseInt(height) });
            console.log("fetched txs for height " + height + "from " + rpc)
            return txs;
        } catch (err) {
            console.log(`Error fetching txs in ${network.name}/${height} rpc ${rpc} error : ${JSON.stringify(err)}`);
        }
    }
}

const getNewHeight = async (network) => {
    for (const { address: rpc } of network.getEndpoints()) {
        try {
            let rpcClient = await StargateClient.connect(rpc);
            let height = await rpcClient.getHeight();
            console.log("fetched new height " + height + "from " + rpc)
            return height;
        } catch (err) {
            console.log(`Error fetching height in ${network.name} rpc ${rpc} error : ${JSON.stringify(err)}`);
        }
    }
};

const getChainData = (network) => {
    return co(function* () { 
        let name = network.registryName ?? network.name;

        for (let api of config.registryApis) {
            //let { data: assetList } = yield axios.get(`${api}/${name}/assetlist.json`);
            let { data: chainInfo } = yield axios.get(`${api}/${name}/chain.json`);

            return yield {
                endpoints: chainInfo.apis.rpc,
                explorers: chainInfo.explorers
            }
        }
    })
};

module.exports = {
    getValidatorProfiles,
    getTxsInBlock,
    getNewHeight,
    getChainData
}