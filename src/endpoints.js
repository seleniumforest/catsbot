const _ = require('lodash');
const minRequestsToRank = 100;

let enpointRankings = new Map();
let totalRequests = 0;

const registerEndpoint = (networkName, rpc) => {
    let key = `${networkName}/${rpc}`;
    enpointRankings.set(key, { points: 0, address: rpc });
}

const reportStats = (networkName, rpc, result) => {
    let key = `${networkName}/${rpc}`;
    let endp = enpointRankings.get(key);
    totalRequests++;
    enpointRankings.set(key, { points: result ? endp.points++ : endp.points--, ...endp });
}

/*
    Ranking Algo: 
    1. Collect stats choosing random rpc from minRequestsToRank requiets.
        Give them +1 point for succesful response or -1 point for error.
        On this step we will return just shuffled array of rpcs.
    2. When there's some stats collected, just filter those who
        have negative rating and shuffle them for something 
        like load-balancing.
*/
const getEndpoints = (networkName) => {
    let ranked = [...enpointRankings.entries()]
        .filter(([ key, value ]) => {
            if (key.startsWith(networkName))
                if (totalRequests < minRequestsToRank || value.points > 0)
                    return true;
                else
                    return false;

            return false;
        })
        .map(([_, value]) => value);

    if (!ranked?.length || ranked.length === 0)
        console.warn(`No rpc presented for network ${networkName}`);
    
    return _.shuffle(ranked);
};

module.exports = {
    registerEndpoint,
    reportStats,
    getEndpoints
}