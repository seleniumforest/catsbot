const axios = require("axios");
const NodeCache = require("node-cache");
const { reportStats, getEndpoints } = require("./endpoints");
const { fromBase64 } = require("@cosmjs/encoding");
const { Int53 } = require("@cosmjs/math");
const { CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");

const tokensCache = new NodeCache();
const validatorsCache = new NodeCache({
    stdTTL: 60 * 60 * 12 //12 hours in seconds
});

const getValidatorProfiles = async (networkName, validatorsApi) => {
    let cached = validatorsCache.get(networkName);
    if (cached)
        return cached;

    if (!validatorsApi)
        return [];

    try {
        let profiles = await axios.get(validatorsApi, {
            headers: {
                "Origin": "https://www.mintscan.io",
                "Referer": "https://www.mintscan.io/"
            }
        });
        validatorsCache.set(networkName, profiles.data);
        return profiles.data;
    }
    catch (err) {
        console.log("failed to fetch validators " + JSON.stringify(err));
        return [];
    }
}

const apiToSmallInt = (input) => {
    const asInt = typeof input === "number" ? new Int53(input) : Int53.fromString(input);
    return asInt.toNumber();
}

const tryParseJson = (data) => {
    try {
        return JSON.parse(data);
    } catch (err) { }
}

const getTxsInBlock = async (networkName, height) => {
    let endpoints = getEndpoints(networkName)
    for (const { address: rpc } of endpoints) {
        try {
            let allTxs = []
            let totalTxs;
            let page = 1;

            do {
                let url = `${rpc}/tx_search?query="tx.height%3D${height}"&page=${page++}`
                let { data: { result: { txs: pageTxs, total_count } } } = await axios({
                    method: "GET",
                    url,
                    timeout: 5000
                });

                totalTxs = parseInt(total_count);
                //todo write fail if node returns empty txs list when it's not empty
                reportStats(networkName, rpc, true);
                allTxs.push(...pageTxs);
            }
            while (allTxs.length < totalTxs)

            let result = allTxs.map(data => ({
                tx: fromBase64(data.tx),
                code: apiToSmallInt(data.tx_result.code) ?? 0,
                events: data.tx_result.events,
                log: tryParseJson(data?.tx_result?.log),
                hash: data.hash
            }));

            if (result.length !== 0)
                return result;
        } catch (err) {
            console.log(`Error fetching txs in ${networkName}/${height} rpc ${rpc} error : ${err?.message}`);
            reportStats(networkName, rpc, false);
        }
    }

    return [];
}

const getNewHeight = async (networkName) => {
    let endpoints = getEndpoints(networkName);
    for (const { address: rpc } of endpoints) {
        try {
            let url = `${rpc}/status`
            let { data } = await axios({
                method: "GET",
                url,
                timeout: 5000
            });

            reportStats(networkName, rpc, true);
            return {
                newHeight: parseInt(data.result.sync_info.latest_block_height),
                time: data.result.sync_info.latest_block_time
            }
        } catch (err) {
            console.log(`Error fetching height in ${networkName} rpc ${rpc} error : ${err?.message}`);
            reportStats(networkName, rpc, false);
        }
    }

    console.warn(`Couldn't get new height for network ${networkName} with endpoints set ${JSON.stringify(endpoints)}`);
};

const getCw20TokenInfo = async (network, contract) => {
    if (tokensCache.has(contract)) {
        return tokensCache.get(contract);
    }

    for (const { address: rpc } of getEndpoints(network.name)) {
        try {
            let client = await CosmWasmClient.connect(rpc);
            let info = await client.queryContractSmart(contract, { "token_info": {} });

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
    getNewHeight,
    getCw20TokenInfo
}