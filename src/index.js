const { decodeTxRaw } = require("@cosmjs/proto-signing");
const { co } = require("co");
const config = require("../config.json");
const { saveProcessedTx, getLastProcessedTxs, dbReady, createEmptyBlock } = require("./db");
const msgHandlers = require("./messages");
const { getTxsInBlock, getNewHeight } = require("./requests");
const { registerNetwork } = require("./endpoints");
const { dateToUnix } = require("./helpers");
const args = require('yargs').argv;

const processNewTx = async (network, newtx, height) => {
    let isFailedTx = newtx.code !== 0;
    if (isFailedTx)
        return;

    let decodedTx = decodeTxRaw(newtx.tx);
    let msgJobs = [];
    for (let i = 0; i < decodedTx.body.messages.length; i++) {
        let msg = decodedTx.body.messages[i];
        let msgLog = newtx?.log?.find(x => i === 0 ? !x.msg_index : x.msg_index === i);
        if (typeof msgHandlers[msg.typeUrl] !== "function")
            continue;

        msgJobs.push(msgHandlers[msg.typeUrl](network, msg, newtx, msgLog));
    }

    await Promise.all(msgJobs);
}

const processNewHeight = async (network, newHeight, time) => {
    await createEmptyBlock(network.name, newHeight, time);
    let txs = await getTxsInBlock(network.name, newHeight);
    console.log(`${network.name}: recieved new block ${newHeight} with ${txs.length} txs`);

    let txJobs = [];
    for (const tx of txs)
         txJobs.push(processNewTx(network, tx, newHeight));

    await Promise.all(txJobs);
}

const processNetwork = (network) => {
    let cleanMode = args.clean === "true";

    co(function* () {
        while (true) {
            let lastProcessedData = yield getLastProcessedTxs(network.name);
            console.log("LAST PROCESSED BLOCK " + lastProcessedData?.height) 
            let { newHeight, time } = yield getNewHeight(network.name);
            
            //if there's no db, init first block record
            if (!lastProcessedData || cleanMode) {
                cleanMode = false;
                yield processNewHeight(network, newHeight, time);
                continue;
            }
            //if last block was more than 5 min ago, skip missed blocks 
            let isBlockOutdated = 
                Math.abs(dateToUnix(lastProcessedData.time) - dateToUnix(time)) > 300;
            if (isBlockOutdated) {
                console.log("BLOCK IS OUTDATED")
                yield processNewHeight(network, newHeight, time);
                continue;
            }

            let latestProcessedHeight = parseInt(lastProcessedData.height);

            yield new Promise(res => setTimeout(res, 500));
            for (let height = latestProcessedHeight + 1; height <= newHeight; height++) {
                yield processNewHeight(network, height, time);
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