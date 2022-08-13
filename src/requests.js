const { StargateClient } = require("@cosmjs/stargate");
const axios = require("axios");
const NodeCache = require("node-cache");

const serverBase = "http://localhost:3000";
const validatorsCache = new NodeCache({
    stdTTL: 60 * 60 * 12 //12 hours in seconds
});

const tokensCache = new NodeCache();

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
        console.log("failed to fetch validators " + JSON.stringify(err));
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

const saveProcessedTx = async (network, height, txHash) => {
    await axios.post(`${serverBase}/saveProcessedTx`, {
        network: network.name, height, txHash
    });
}

const createEmptyBlock = async (network, height) => {
    await axios.post(`${serverBase}/createEmptyBlock`, {
        network: network.name, height
    });
}

const getLastProcessedTxs = async (network) => {
    let response = await axios.post(`${serverBase}/getLastProcessedTxs`, {
        network: network.name
    });

    return response.data.data;
}

const notify = async (message) => {
    await axios.post(`${serverBase}/send`, {
        message
    });
}

const getCw20TokenInfo = async (network, contract) => {
    let cached = tokensCache.get(contract);
    if (cached)
        return cached;

    let rpcs = network.endpoints.map(x => x.rpc);
    console.log(rpcs)
    for (const rpc of rpcs) {
        try {
            const client = await CosmWasmClient.connect(rpc);
            const info = await client.queryContractSmart(contract, { "token_info": {} });

            tokensCache.set(contract, info);
            return info;
        }
        catch (err) {
            console.log("failed to fetch cw20 token info " + JSON.stringify(err));
        }
    }
}

module.exports = {
    getValidatorProfiles,
    getTxsInBlock,
    saveProcessedTx,
    getLastProcessedTxs,
    createEmptyBlock,
    getCw20TokenInfo,
    notify
}