const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { co } = require("co");
const config = require("../config.json");
const { saveProcessedTx, getLastProcessedTxs, dbReady, createEmptyBlock } = require("./db");
const msgHandlers = require("./messages");
const { getTxsInBlock, getNewHeight } = require("./requests");
const { registerNetwork } = require("./endpoints");
const args = require('yargs').argv;

const processNewTx = async (network, newtx, height) => {
    let isFailedTx = newtx.code !== 0;
    if (isFailedTx)
        return;

    let decodedTx = decodeTxRaw(newtx.tx);
    for (let i = 0; i < decodedTx.body.messages.length; i++) {
        let msg = decodedTx.body.messages[i];
        let msgLog = newtx?.log?.find(x => i === 0 ? !x.msg_index : x.msg_index === i);
        if (typeof msgHandlers[msg.typeUrl] !== "function")
            continue;

        await msgHandlers[msg.typeUrl](network, msg, newtx, msgLog);
        await saveProcessedTx(network.name, height, newtx.hash);
    }
}

const processNewHeight = async (network, newHeight) => {
    await createEmptyBlock(network.name, newHeight);
    let txs = await getTxsInBlock(network.name, newHeight);
    console.log(`${network.name}: recieved new block ${newHeight} with ${txs.length} txs`);

    for (const tx of txs)
        await processNewTx(network, tx, newHeight);
}

const processNetwork = (network) => {
    let cleanMode = args.clean === "true";

    co(function* () {
        while (true) {
            let lastProcessedData = yield getLastProcessedTxs(network.name);
            let newHeight = yield getNewHeight(network.name);

            //if there's no db, init first block record
            if (!lastProcessedData || cleanMode) {
                cleanMode = false;
                yield processNewHeight(network, newHeight);
                continue;
            }

            let fromBlockHeight = parseInt(lastProcessedData.height);

            yield new Promise(res => setTimeout(res, 500));
            for (let height = fromBlockHeight + 1; height <= newHeight; height++) {
                yield processNewHeight(network, height);
            }
        }
    });
};


co(function* () {
    yield dbReady();
    let networks = args.network ?
        config.networks.filter(x => x.name === args.network) :
        config.networks;

    for (let network of networks) {
        let chainData = yield registerNetwork(network);

        processNetwork({
            ...network,
            ...chainData
        })
    }
}).catch(err => console.log(err));