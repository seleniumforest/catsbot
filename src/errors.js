class CantGetNewBlockErr extends Error {
    constructor(networkName, endpointSet, options) {
        let message = `Couldn't get new height for network ${networkName} with endpoints set ${JSON.stringify(endpointSet)}`;
        super(message, options);
    }
}

class NoEndpointsRecievedErr extends Error {
    constructor(registryName, rpcType, options) {
        let message = `No ${rpcType} endpoints for ${registryName}`;
        super(message, options);
    }
}

class CantGetCw20TokenInfoErr extends Error {
    constructor(networkName, contract, options) {
        let message = `Failed to fetch cw20 token info on ${networkName} contract ${contract}`;
        super(message, options);
    }
}

class CantGetTxsInBlockErr extends Error {
    constructor(networkName, height, endpointSet, options) {
        let message = `Couldn't get txs at ${height} for network ${networkName} with endpoints set ${JSON.stringify(endpointSet)}`;
        super(message, options);
    }
}

module.exports = {
    CantGetNewBlockErr,
    NoEndpointsRecievedErr,
    CantGetCw20TokenInfoErr,
    CantGetTxsInBlockErr
}