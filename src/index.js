const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { StargateClient } = require("@cosmjs/stargate");
const { WebsocketClient } = require('@cosmjs/tendermint-rpc');
const config = require("../config.json");
const log = require("./logger");
const msgHandlers = require("./messages");

const processNewTx = (network, newtx) => {
    let decodedTx = decodeTxRaw(newtx.tx);
    for (const msg of decodedTx.body.messages) {
        let msgHandler = msgHandlers[msg.typeUrl];
        if (typeof msgHandler === "function") 
            msgHandler(network, msg, newtx.hash);
    }
}

const processNewHeight = async (network, height) => {
    console.log(`${network.name}: got new block ${height}`);
    let { rpc } = network.endpoints[0];
    let txs = [];

    try {
        let rpcClient = await StargateClient.connect(rpc);
        txs = await rpcClient.searchTx({ height: parseInt(height) });
    }
    catch (err) {
        log.error(JSON.stringify(err));
    }

    txs.forEach((tx) => processNewTx(network, tx));
}

const processNetwork = async (network) => {
    const { ws } = network.endpoints[0];
    const wsClient = new WebsocketClient(ws, (err) => console.log(err));

    let stream = await wsClient.listen({
        jsonrpc: "2.0",
        method: "subscribe",
        id: 0,
        params: {
            query: "tm.event='NewBlockHeader'"
        }
    });

    stream.addListener({
        complete: () => {
            log.warn("complete");
            wsClient.disconnect();
        },
        error: (err) => {
            log.error(JSON.stringify(err));
            wsClient.disconnect();
        },
        next: (newtx) => {
            let newHeight = newtx?.data?.value?.header?.height;
            processNewHeight(network, newHeight);
        }
    });
};

(async () => {
    log.info("Start with config");
    log.info(JSON.stringify(config));
    config.networks.forEach(processNetwork);
})();