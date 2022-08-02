const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { StargateClient } = require("@cosmjs/stargate");
const { WebsocketClient } = require('@cosmjs/tendermint-rpc');
const config = require("../config.json");
const log = require("./logger");
const msgHandlers = require("./messages");

const processNewTx = (network, newtx) => {
    let isFailedTx = newtx.code !== 0;
    if (isFailedTx)
        return;

    let decodedTx = decodeTxRaw(newtx.tx);
    for (const msg of decodedTx.body.messages) {
        let msgHandler = msgHandlers[msg.typeUrl];
        if (typeof msgHandler !== "function")
            return;

        msgHandler(network, msg, newtx.hash);
    }
}

const processNewHeight = async (network, height) => {
    console.log(`${network.name}: got new block ${height}`);
    let { rpc } = network.endpoints[0];
    let rpcClient = await StargateClient.connect(rpc);
    let txs = await rpcClient.searchTx({ height: parseInt(height) });
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
            log.warn("complete: reestablishing connection")
            wsClient.disconnect();
            processNetwork(network);
        },
        error: (err) => {
            log.error("error: reestablishing connection")
            log.error(JSON.stringify(err));
            wsClient.disconnect();
            processNetwork(network);
        },
        next: (newtx) => {
            let newHeight = newtx?.data?.value?.header?.height;
            try {
                processNewHeight(network, newHeight);
            }
            catch (err) {
                console.log(JSON.stringify(err));
            }
        }
    });
};

const main = async (network) => {
    log.info("Start with config");
    log.info(JSON.stringify(config));

    let networks = config.networks;
    if (network)
        networks = networks.filter(x => x.name === network);

    networks.forEach(processNetwork);
};

main(process.argv[2]);