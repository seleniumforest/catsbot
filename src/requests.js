const axios = require("axios");
const { co } = require("co");
const NodeCache = require("node-cache");
const config = require("../config.json");
const log = require("./logger");
const { chains } = require('chain-registry');
const { writeStats } = require("./helpers");
const { fromBase64 } = require("@cosmjs/encoding");
const { Int53 } = require("@cosmjs/math");
const { CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");

const memoizedTokens = [];
const validatorsCache = new NodeCache({
    stdTTL: 60 * 60 * 12 //12 hours in seconds
});

const getValidatorProfiles = async (network) => {
    let cached = validatorsCache.get(network.name);
    if (cached)
        return cached;

    try {
        let profiles = await axios.get(network.validatorsApi, {
            headers: {
                "Origin": "https://www.mintscan.io",
                "Referer": "https://www.mintscan.io/"
            }
        });
        validatorsCache.set(network.name, profiles.data);
        return profiles.data;
    }
    catch (err) {
        log.error("failed to fetch validators " + JSON.stringify(err));
        return [];
    }
}

const apiToSmallInt = (input) => {
    const asInt = typeof input === "number" ? new Int53(input) : Int53.fromString(input);
    return asInt.toNumber();
}

const getTxsInBlock = async (network, height) => {
    for (const { address: rpc } of network.getEndpoints()) {
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
                writeStats(rpc, true);
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
            console.log(`Error fetching txs in ${network.name}/${height} rpc ${rpc} error : ${JSON.stringify(err)}`);
            writeStats(rpc, false);
        }
    }

    return [];
}

const getNewHeight = async (network) => {
    let endpoints = network.getEndpoints();
    for (const { address: rpc } of endpoints) {
        try {
            let url = `${rpc}/status`
            let { data } = await axios({
                method: "GET",
                url,
                timeout: 5000
            });

            writeStats(rpc, true);
            return parseInt(data.result.sync_info.latest_block_height)
        } catch (err) {
            console.log(`Error fetching height in ${network.name} rpc ${rpc} error : ${JSON.stringify(err)}`);
            writeStats(rpc, false);
        }
    }

    console.warn(`Couldn't get new height for network ${network.name} with endpoints set ${JSON.stringify(endpoints)}`);
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
    if (memoizedTokens[contract])
        return memoizedTokens[contract];
        
    for (const { address: rpc } of network.getEndpoints()) {
        try {
            let client = await CosmWasmClient.connect(rpc);
            let info = await client.queryContractSmart(contract, { "token_info": {} });

            memoizedTokens[contract] = info;
            return info;
        }
        catch (err) {
            log.error("failed to fetch cw20 token info " + JSON.stringify(err));
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