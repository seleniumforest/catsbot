const axios = require("axios");
const { reportStats, getEndpoints } = require("./endpoints");
const { fromBase64 } = require("@cosmjs/encoding");
const { Int53 } = require("@cosmjs/math");
const { CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { CantGetNewBlockErr, CantGetCw20TokenInfoErr } = require("./errors");
const { getTokenByDenom, saveToken } = require("./db");

const getValidatorProfiles = async (validatorsApi) => {
    console.log(`Fetching validator profiles from ${validatorsApi}`);
    try {
        let profiles = await axios.get(validatorsApi, {
            headers: {
                "Origin": "https://www.mintscan.io",
                "Referer": "https://www.mintscan.io/"
            }
        });
        
        return profiles.data;
    }
    catch (err) {
        console.log("failed to fetch validators " + JSON.stringify(err));
    }

    return [];
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
    let endpoints = getEndpoints(networkName);

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

    //!!!probably!!!, there's no txs in blocks
    return [];
}

const pollForLatestHeight = async (networkName) => {
    let endpoints = getEndpoints(networkName);

    let results = await Promise.all(endpoints.map(async (e) => {
        let url = `${e.address}/status`
        let { data } = await axios({
            method: "GET",
            url,
            timeout: 5000
        });

        return data.result.sync_info.latest_block_height;
    }));

    return Math.max(...results);
}

const getNewHeight = async (networkName, lastHeight) => {
    if (!lastHeight)
        lastHeight = await pollForLatestHeight(networkName);

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
            let newHeight = parseInt(data.result.sync_info.latest_block_height);
            if (newHeight >= lastHeight)
                return {
                    newHeight,
                    time: data.result.sync_info.latest_block_time
                }
        } catch (err) {
            console.log(`Error fetching height in ${networkName} rpc ${rpc} error : ${err?.message}`);
            reportStats(networkName, rpc, false);
        }
    }

    throw CantGetNewBlockErr(networkCtx.name, chainData.endpoints);
};

const getCw20TokenInfo = async (network, contract) => {
    let savedToken = getTokenByDenom(network.name, contract);
    if (savedToken)
        return savedToken;

    console.log(`Fetching token on ${network} ${contract}`)
    for (const { address: rpc } of getEndpoints(network.name)) {
        try {
            let client = await CosmWasmClient.connect(rpc);
            let info = await client.queryContractSmart(contract, { "token_info": {} });

            await saveToken(network.name, { contract, ...info })
            return info;
        }
        catch (err) {
            console.log("failed to fetch cw20 token info " + JSON.stringify(err));
        }
    }

    throw CantGetCw20TokenInfoErr(network.name, contract);
}

module.exports = {
    getValidatorProfiles,
    getTxsInBlock,
    getNewHeight,
    getCw20TokenInfo
}
