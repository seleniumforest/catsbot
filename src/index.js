const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { co } = require("co");
const config = require("../config.json");
const { getLastProcessedTxs, dbReady, createEmptyBlock } = require("./db");
const msgHandlers = require("./messages");
const { getTxsInBlock, getNewHeight } = require("./requests");
const { registerNetwork } = require("./endpoints");
const { dateToUnix } = require("./helpers");
const args = require('yargs').argv;

const processNewTx = async (network, newtx) => {
    let isFailedTx = newtx.code !== 0;
    if (isFailedTx)
        return;

    let decodedTx = decodeTxRaw(newtx.tx);
    let handlers = decodedTx.body.messages
        .filter(msg => typeof msgHandlers[msg.typeUrl] === "function")
        .map((msg, i) => {
            let msgLog = newtx?.log?.find(x => i === 0 ? !x.msg_index : x.msg_index === i);
            let handler = msgHandlers[msg.typeUrl];

            return handler(network, msg, newtx, msgLog)
                .catch((err) => {
                    console.error(`Error handling txid ${newtx.hash} in ${network.name} msg ${err?.message}`)
                });
        });

    await Promise.all(handlers);
}

const processNewHeight = async (network, newHeight, time) => {
    await createEmptyBlock(network.name, newHeight, time);
    let txs = await getTxsInBlock(network.name, newHeight);
    console.log(`${network.name}: recieved new block ${newHeight} with ${txs.length} txs`);

    await Promise.all(txs.map(tx => processNewTx(network, tx, newHeight)));
}

const processNetwork = (network) => {
    let cleanMode = args.clean === "true";
    co(function* () {
        while (true) {
            let lastProcessedData = yield getLastProcessedTxs(network.name);
            let newHeightData = yield getNewHeight(network.name, lastProcessedData?.height);
            if (!newHeightData)
                continue;

            let newHeight = newHeightData?.newHeight;
            let newHeightTime = newHeightData?.time;

            //if there's no db, init first block record
            if (!lastProcessedData || cleanMode) {
                cleanMode = false;
                yield processNewHeight(network, newHeight, newHeightTime);
                continue;
            }
            //if last block was more than 5 min ago, skip missed blocks 
            let isBlockOutdated =
                Math.abs(dateToUnix(lastProcessedData.time) - dateToUnix(newHeightTime)) > 300;
            if (isBlockOutdated) {
                console.warn(`${network.name} BLOCK ${lastProcessedData?.height} IS OUTDATED`)
                yield processNewHeight(network, newHeight, newHeightTime);
                continue;
            }

            let latestProcessedHeight = parseInt(lastProcessedData.height);

            yield new Promise(res => setTimeout(res, 500));
            for (let height = latestProcessedHeight + 1; height <= newHeight; height++) {
                yield processNewHeight(network, height, newHeightTime);
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