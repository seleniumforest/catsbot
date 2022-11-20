const { default: axios } = require("axios");
const config = require("../config.json");
const { chains } = require('chain-registry');
const { NoEndpointsRecievedErr } = require("./errors");

const minRequestsToTest = 20;
const minSuccessRate = 0.85;
const oldBlockMs = 60000;
let endpointRankings = {
    rpc: {},
    rest: {}
};

const registerNetwork = async (network) => {
    let regName = network.registryName;
    let name = network.name;

    let chainData = await getChainData(regName || name);

    endpointRankings.rpc[name] = new Map();
    chainData.rpcEndpoints.forEach(end => {
        let key = `${name}/${end.address}`;
        endpointRankings.rpc[name].set(key, { ok: 0, fail: 0, address: end.address });
    });

    endpointRankings.rest[name] = new Map();
    chainData.restEndpoints.forEach(end => {
        let key = `${name}/${end.address}`;
        endpointRankings.rest[name].set(key, { ok: 0, fail: 0, address: end.address });
    });

    return chainData;
}

const getChainData = async (registryName) => {
    let chainInfo = null;

    for (let api of config.registryApis) {
        let url = `${api}/${registryName}/chain.json`;
        try {
            let { data } = await axios.get(url);
            chainInfo = data;
            break;
        } catch (err) {
            //console.warn(`Getting chainData for ${registryName}: ${url} is dead`);
            chainInfo = chains.find(chain => chain.chain_name === registryName);
        }
    }

    let aliveRpcs = await filterAliveRpcs(chainInfo?.apis?.rpc);
    if (!aliveRpcs?.length || aliveRpcs.length === 0)
        throw new NoEndpointsRecievedErr(registryName, "rpc");

    let aliveRestRpcs = await filterAliveRestRpcs(chainInfo?.apis?.rest);
    if (!aliveRestRpcs?.length || aliveRestRpcs.length === 0)
        throw new NoEndpointsRecievedErr(registryName, "rest");

    return {
        rpcEndpoints: aliveRpcs,
        restEndpoints: aliveRestRpcs,
        explorers: chainInfo.explorers
    }
};

const filterAliveRestRpcs = async (rpcs) => {
    let aliveRestRpcs = [];

    for (let rpc of rpcs) {
        try {
            let response = await axios({
                method: "GET",
                url: `${rpc.address}/cosmos/base/tendermint/v1beta1/blocks/latest`,
                timeout: 5000
            });

            if (!response || response.status !== 200)
                continue;

            let blockTime = Date.parse(response.data.block.header.time);
            let now = Date.now();

            if (Math.abs(now - blockTime) < oldBlockMs) {
                aliveRestRpcs.push(rpc);
                continue;
            }

        } catch (err) {
        }
    }

    return aliveRestRpcs;
}

const filterAliveRpcs = async (rpcs) => {
    let aliveRpcs = [];

    for (let rpc of rpcs) {
        try {
            let response = await axios({
                method: "GET",
                url: `${rpc.address}/status`,
                timeout: 5000
            });

            if (!response || response.status !== 200)
                continue;

            let blockTime = Date.parse(response?.data?.result?.sync_info?.latest_block_time);
            let now = Date.now();
            if (Math.abs(now - blockTime) < oldBlockMs) {
                //console.log(`${rpc.address} is alive, sync block ${response.data.result.sync_info.latest_block_height}`);
                aliveRpcs.push(rpc);
                continue;
            }

            //console.log(`${rpc.address} is alive, but not synced`);
        } catch (err) {
            //console.log(`${rpc.address} is dead. Error ${err?.message}`) 
        }
    }

    return aliveRpcs;
}

const reportStats = (networkName, rpcAddress, rpcType, result) => {
    let key = `${networkName}/${rpcAddress}`;
    let endp = endpointRankings[rpcType][networkName].get(key);

    //todo fix this
    if (!endp)
        return;

    endpointRankings[rpcType][networkName].set(key, result ? { ...endp, ok: ++endp.ok } :
        { ...endp, fail: ++endp.fail });
}

//<magic>
const getEndpoints = (networkName, rpcType) => {
    let result = [...endpointRankings[rpcType][networkName].entries()]
        .filter(([k]) => k.startsWith(networkName))
        .map(([_, value]) => value)
        .sort((a, b) => a.ok + a.fail > b.ok + b.fail ? 1 : -1);

    let minRequests =
        result.reduce((prev, cur) =>
            prev > cur.ok + cur.fail ? cur.ok + cur.fail : prev, Number.POSITIVE_INFINITY);

    if (minRequests < minRequestsToTest)
        return result;

    return result
        .filter(x => x.ok / (x.ok + x.fail) > minSuccessRate)
        .sort((a, b) => {
            if (a.ok / a.fail <= 1)
                return 1;

            if (b.ok / b.fail <= 1)
                return -1;

            return (a.ok / (a.fail || 1)) > (b.ok / (b.fail || 1)) ? 1 : 0;
        });
};
//</magic>

module.exports = {
    reportStats,
    getEndpoints,
    registerNetwork
}