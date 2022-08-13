const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { WebsocketClient } = require('@cosmjs/tendermint-rpc');
const msgHandlers = require("./messages");
const { saveProcessedTx, getLastProcessedTxs, createEmptyBlock, getTxsInBlock } = require("./requests");
const args = require('yargs').argv;
const { networks } = require("../config/networks.json");

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
    let txs = await getTxsInBlock(network, height);

    //todo use limitter instead, prevents spamming with requests to node
    if (recoveryMode)
        await new Promise(res => setTimeout(res, 1000));

    await createEmptyBlock(network, height);
    for (const tx of txs.filter(x => !skipTxs.includes(x.hash)))
        await processNewTx(network, tx, height, recoveryMode);
}

const processRecoveryBlocks = async (network, lastHeight) => {
    console.log(`${network.name}: Recovery started`);
    if (!lastHeight)
        return;

    let lastProcessedData = await getLastProcessedTxs(network);
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
    console.log(`Start processing ${network.name}`);
    const [{ ws: wsEndpoint }] = network.endpoints;
    const wsClient = new WebsocketClient(
        wsEndpoint,
        (err) => console.log("ws client error " + JSON.stringify(err)));

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
            console.log("complete: reestablishing connection");
        },
        error: (err) => {
            console.log("reestablishing connection, error: " + JSON.stringify(err))
        },
        next: (newtx) => {
            try {
                let newHeight = newtx?.data?.value?.header?.height;
                if (recoveryMode && !recoveryStarted) {
                    processRecoveryBlocks(network, parseInt(newHeight) - 1);
                    recoveryStarted = true;
                }
                processNewHeight(network, newHeight);
            } catch (err) {
                console.log(JSON.stringify(err));
            }
        }
    });

    // https://github.com/cosmos/cosmjs/issues/1217
    let lastCheckedBlock = -1;
    setInterval(() => {
        getLastProcessedTxs(network).then(data => {
            let lastSavedBlock = data?.height;
            if (lastCheckedBlock === lastSavedBlock) {
                console.log("Subscription died, restarting");
                process.exit(1);
            };
            lastCheckedBlock = lastSavedBlock;
        });
    }, 60000);
};

((networkName, recoveryMode) => {
    console.log(`Start in ${recoveryMode ? "recovery" : "normal"} mode`);

    let selectedNetworks = networks;
    if (networkName)
        selectedNetworks = selectedNetworks.filter(net => net.name === networkName);

    selectedNetworks.forEach((network) => processNetwork(network, recoveryMode));
})(args.network, args.recovery === "true");