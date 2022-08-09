const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { StargateClient } = require("@cosmjs/stargate");
const { WebsocketClient } = require('@cosmjs/tendermint-rpc');
const config = require("../config.json");
const { saveProcessedTx, getLastProcessedTxs, dbReady, createEmptyBlock } = require("./db");
const log = require("./logger");
const msgHandlers = require("./messages");
const args = require('yargs').argv;

const processNewTx = async (network, newtx, height, recoveryMode = false) => {
    let isFailedTx = newtx.code !== 0;
    if (isFailedTx)
        return;

    let decodedTx = decodeTxRaw(newtx.tx);
    let msgs = decodedTx.body.messages
        .filter(msg => typeof msgHandlers[msg.typeUrl] === "function");

    for (const msg of msgs) {
        await msgHandlers[msg.typeUrl](network, msg, newtx.hash);
        if (!recoveryMode)
            await saveProcessedTx(network, height, newtx.hash);
    }
}

const processNewHeight = async (network, height, skipTxs = [], recoveryMode = false) => {
    console.log(`${network.name}: ${recoveryMode ? "recovering" : "recieved new"} block ${height}`);
    let { rpc } = network.endpoints[0];
    let rpcClient = await StargateClient.connect(rpc);
    let txs = await rpcClient.searchTx({ height: parseInt(height) });
    //todo use limitter instead, decrease number of requests to node
    if (recoveryMode)
        await new Promise(res => setTimeout(res, 1000));
    await createEmptyBlock(network, height);
    for (const tx of txs) {
        if (skipTxs.find(x => x === tx.hash))
            continue;

        await processNewTx(network, tx, height, recoveryMode);
    }

}

const processRecoveryBlocks = async (network, lastHeight) => {
    console.log("Recovery started");
    if (!lastHeight)
        return;

    let lastProcessedData = await getLastProcessedTxs(network.name);
    if (!lastProcessedData)
        return;

    let lastProcessedBlock = parseInt(lastProcessedData.height);
    let lastBlockHeight = parseInt(lastHeight);

    for (let block = lastProcessedBlock; block <= lastBlockHeight; block++) {
        let skipTxs = block === parseInt(lastProcessedData.height) ? lastProcessedData.txs : [];
        await processNewHeight(network, block.toString(), skipTxs, true);
    }
};

const processNetwork = async (network, recoveryMode) => {
    const { ws } = network.endpoints[0];
    const wsClient = new WebsocketClient(ws, (err) => console.log("ws client error " + JSON.stringify(err)));

    let stream = wsClient.listen({
        jsonrpc: "2.0",
        method: "subscribe",
        id: 0,
        params: {
            query: "tm.event='NewBlockHeader'"
        }
    });

    let recoveryStarted = false;
    stream.addListener({
        complete: () => {
            log.warn("complete: reestablishing connection")
            wsClient.disconnect();
            process.exit(1);
        },
        error: (err) => {
            log.error("reestablishing connection, error: " + JSON.stringify(err))
            wsClient.disconnect();
            process.exit(1);
        },
        next: (newtx) => {
            let newHeight = newtx?.data?.value?.header?.height;

            try {
                if (recoveryMode && !recoveryStarted) {
                    processRecoveryBlocks(network, parseInt(newHeight) - 1);
                    recoveryStarted = true;
                }
                processNewHeight(network, newHeight);
            }
            catch (err) {
                console.log(JSON.stringify(err));
            }
        }
    });
};

const main = async (network, recoveryMode) => {
    try {
        log.info(`Start ${recoveryMode ? "in recovery mode " : ""}with config`);
        log.info(JSON.stringify(config));
        await dbReady();

        let networks = config.networks;

        if (network)
            networks = networks.filter(x => x.name === network);

        networks.forEach((network) => processNetwork(network, recoveryMode));
    }
    catch (err) {
        log.error(JSON.stringify(err));
    }
};

main(args.network, args.recovery === "true");