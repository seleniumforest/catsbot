const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { co } = require("co");
const config = require("../config.json");
const { saveProcessedTx, getLastProcessedTxs, dbReady, createEmptyBlock } = require("./db");
const msgHandlers = require("./messages");
const { getTxsInBlock, getNewHeight, getChainData } = require("./requests");
const { registerEndpoint } = require("./endpoints");
const args = require('yargs').argv;

const processNewTx = async (network, newtx, height) => {
    let isFailedTx = newtx.code !== 0;
    if (isFailedTx)
        return;

    let decodedTx = decodeTxRaw(newtx.tx);
    let msgs = decodedTx.body.messages
        .filter(msg => typeof msgHandlers[msg.typeUrl] === "function");

    for (const msg of msgs) {
        await msgHandlers[msg.typeUrl](network, msg, newtx);
        await saveProcessedTx(network, height, newtx.hash);
    }
}

const processNewHeight = async (network, newHeight) => {
    await createEmptyBlock(network, newHeight);
    let txs = await getTxsInBlock(network.name, newHeight);
    console.log(`${network.name}: recieved new block ${newHeight} with ${txs.length} txs`);

    for (const tx of txs)
        await processNewTx(network, tx, newHeight);
}

const processNetwork = (network) => {
    let cleanMode = args.clean === "true";

    co(function* () {
        while (true) {
            let lastProcessedData = yield getLastProcessedTxs(network);
            let newHeight = yield getNewHeight(network);

            //if there's no db, init first block record
            if (!lastProcessedData || cleanMode) {
                cleanMode = false;
                yield processNewHeight(network, newHeight);
                continue;
            }

            let fromBlockHeight = parseInt(lastProcessedData.height);
            //prevent spamming to node 
            if (fromBlockHeight === newHeight)
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
        let chainData = yield getChainData(network);

        if (!chainData?.endpoints?.length || chainData.endpoints.length === 0)
            console.warn("No endpoints");

        chainData.endpoints.forEach(end => registerEndpoint(network.name, end.address));
        
        processNetwork({
            ...network,
            ...chainData
        })
    }
}).catch(err => console.log(err));