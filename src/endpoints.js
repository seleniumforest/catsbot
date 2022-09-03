const { default: axios } = require("axios");
const { co } = require("co");
const config = require("../config.json");
const { chains } = require('chain-registry');

const minRequestsToTest = 20;
const minSuccessRate = 0.85;
let endpointRankings = {};

const registerNetwork = async (network) => {
    let name = network.name;
    let regName = network.registryName;
    let chainData = await registerEndpoints(regName, name);

    setTimeout(() => {
        registerEndpoints(regName, name)
    }, 1000 * 60 * 3600 * (config?.rpcsTtl || 12));

    return chainData;
}

const registerEndpoints = async (regName, name) => {
    let current = [...endpointRankings[name]?.entries() ?? []];
    console.log(`endpoints for ${name}: ${JSON.stringify(current)}`);

    let chainData = await getChainData(regName || name);
    if (!chainData?.endpoints?.length || chainData.endpoints.length === 0) {
        console.warn("No endpoints");
        return;
    }

    endpointRankings[name] = new Map();
    chainData.endpoints.forEach(end => {
        let key = `${name}/${end.address}`;
        endpointRankings[name].set(key, { ok: 0, fail: 0, address: end.address });
    });

    return chainData;
}

const getChainData = (registryName) => {
    return co(function* () {
        for (let api of config.registryApis) {
            let chainInfo = null;

            try {
                chainInfo = yield axios.get(`${api}/${registryName}/chain.json`);
            } catch (err) { }

            chainInfo = chainInfo.data ||
                chains.find(chain => chain.chain_name === registryName);

            console.log(`Checking rpcs availability for ${registryName}`);

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
                }).catch(() => {
                    console.log(`${rpc.address} is dead`);
                    //todo make 2nd request
                });
            });

            return yield {
                endpoints: aliveRpcs.filter(x => !!x),
                explorers: chainInfo.explorers
            }
        }
    })
};

const reportStats = (networkName, rpc, result) => {
    let key = `${networkName}/${rpc}`;
    let endp = endpointRankings[networkName].get(key);
    endpointRankings[networkName].set(key, result ? { ...endp, ok: ++endp.ok } :
        { ...endp, fail: ++endp.fail });
}

const getEndpoints = (networkName) => {
    let result = [...endpointRankings[networkName].entries()]
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

module.exports = {
    reportStats,
    getEndpoints,
    registerNetwork
}