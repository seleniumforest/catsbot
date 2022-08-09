const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { StargateClient } = require("@cosmjs/stargate");
const { WebsocketClient } = require('@cosmjs/tendermint-rpc');
const config = require("../config.json");
const { saveProcessedTx, getLastProcessedTxs, dbReady } = require("./db");
const log = require("./logger");
const msgHandlers = require("./messages");
const args = require('yargs').argv;

const processNewTx = async (network, newtx, height, msgIndex = 0, recoveryMode = false) => {
    let isFailedTx = newtx.code !== 0;
    if (isFailedTx)
        return;

    let decodedTx = decodeTxRaw(newtx.tx);
    let msgs = decodedTx.body.messages
        .filter(msg => typeof msgHandlers[msg.typeUrl] === "function")
        .slice(msgIndex);

    for (const msg of msgs) {
        await msgHandlers[msg.typeUrl](network, msg, newtx.hash);
        if (!recoveryMode)
            await saveProcessedTx(network, height, newtx.hash);
    }
}

const processNewHeight = async (network, height, txHashes = [], recoveryMode = false) => {
    console.log(`${network.name}: ${recoveryMode ? "recovering" : "recieved new"} block ${height}`);
    let { rpc } = network.endpoints[0];
    let rpcClient = await StargateClient.connect(rpc);
    let txs = await rpcClient.searchTx({ height: parseInt(height) });
    //todo use limitter instead, decrease number of requests to node
    await new Promise(res => setTimeout(res, 1000));
    for (const tx of txs) {
        let msgIndex = recoveryMode ? txHashes.filter(x => x === tx.hash).length : 0;
        if (msgIndex !== 0) console.log("msgIndex = " + msgIndex);
        await processNewTx(network, tx, height, msgIndex, recoveryMode);
    }

}

const processRecoveryBlocks = async (network, lastHeight) => {
    console.log("Recovery started");
    if (!lastHeight)
        return;

    let lastProcessedData = await getLastProcessedTxs(network.name);
    if (!lastProcessedData)
        return;

    console.log("lastProcessedData " + JSON.stringify(lastProcessedData));
    let lastProcessedBlock = parseInt(lastProcessedData.height);
    let lastBlockHeight = parseInt(lastHeight);

    for (let block = lastProcessedBlock; block <= lastBlockHeight; block++) {
        await processNewHeight(network, block.toString(), lastProcessedData.txs, true);
    }
};

const processNetwork = async (network, recoveryMode) => {
    console.log(await getLastProcessedTxs(network.name))
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
    log.info(`Start ${recoveryMode ? "in recovery mode " : ""}with config`);
    log.info(JSON.stringify(config));
    await dbReady();

    let networks = config.networks;

    if (network)
        networks = networks.filter(x => x.name === network);

    networks.forEach((network) => processNetwork(network, recoveryMode));
};

main(args.network, args.recovery === "true");