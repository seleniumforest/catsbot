const axios = require("axios");
const { co } = require("co");
const NodeCache = require("node-cache");
const config = require("../config.json");
const { chains } = require('chain-registry');
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

const getTxsInBlock = async (networkName, height) => {
    for (const { address: rpc } of getEndpoints(networkName)) {
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
                reportStats(networkName, rpc, true);
                allTxs.push(...pageTxs);
            }
            while (allTxs.length < totalTxs)

            let result = allTxs.map(data => ({
                tx: fromBase64(data.tx),
                code: apiToSmallInt(data.tx_result.code) ?? 0,
                events: data.tx_result.events,
                hash: data.hash
            }));

            if (result.length !== 0)
                return result;
        } catch (err) {
            console.log(`Error fetching txs in ${networkName}/${height} rpc ${rpc} error : ${JSON.stringify(err)}`);
            reportStats(networkName, rpc, false);
        }
    }

    return [];
}

const getNewHeight = async ({ name: networkName }) => {
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
            return parseInt(data.result.sync_info.latest_block_height)
        } catch (err) {
            console.log(`Error fetching height in ${networkName} rpc ${rpc} error : ${JSON.stringify(err)}`);
            reportStats(networkName, rpc, false);
        }
    }

    console.warn(`Couldn't get new height for network ${networkName} with endpoints set ${JSON.stringify(endpoints)}`);
};

const getChainData = (network) => {
    return co(function* () {
        let name = network.registryName || network.name;

        for (let api of config.registryApis) {
            let chainInfo = null;

            try {
                chainInfo = yield axios.get(`${api}/${name}/chain.json`);
            } catch (err) { }

            chainInfo = chainInfo.data ||
                chains.find(chain => chain.chain_name === network.registryName ||
                    chain.chain_name === network.name);

            console.log("Checking rpcs availability");

            let aliveRpcs = yield chainInfo.apis.rpc.map(rpc => {
                return axios({
                    method: "GET",
                    url: `${rpc.address}/status`,
                    timeout: 5000
                }).then(response => {
                    if (!response || response.status !== 200)
                        return;

                    let blockTime = Date.parse(response.data.result.sync_info.latest_block_time);
                    let now = Date.now();
                    if (Math.abs(now - blockTime) < 60000) {
                        console.log(`${rpc.address} is alive, sync block ${response.data.result.sync_info.latest_block_height}`);
                        return rpc;
                    }

                    console.log(`${rpc.address} is alive, but not synced`);
                }).catch(() => console.log(`${rpc.address} is dead`));
            });

            return yield {
                endpoints: aliveRpcs.filter(x => !!x),
                explorers: chainInfo.explorers
            }
        }
    })
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
    getChainData,
    getCw20TokenInfo
}