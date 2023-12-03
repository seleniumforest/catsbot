const { decodeTxRaw } = require("@cosmjs/proto-signing");
const config = require("../config.json");
const { getLastProcessedBlock, dbReady, saveProcessedBlock } = require("./db");
const msgHandlers = require("./messages");
const { getTxsInBlock, getNewHeight } = require("./requests");
const { registerNetwork } = require("./endpoints");
const { dateToUnix } = require("./helpers");
const monitoring = require("./monitoring/server");
const args = require('yargs').argv;

const oldBlockTimeout = 300;

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

    await Promise.allSettled(handlers);
}

const processNewHeight = async (network, newHeight, time) => {
    let txs = await getTxsInBlock(network.name, newHeight);
    console.log(`${network.name}: recieved new block ${newHeight} with ${txs.length} txs`);

    await Promise.allSettled(txs.map(tx => processNewTx(network, tx, newHeight)));
    await saveProcessedBlock(network.name, newHeight, time);
}

const processNetwork = async (net) => {
    let chainData = await registerNetwork(net);
    let networkCtx = { ...net, ...chainData };
    console.log(`Starting network ${net.name} with settings: ${JSON.stringify(networkCtx)}`);
    let cleanMode = args.clean === "true";
    //for debugging specific block
    //await processNewHeight(networkCtx, 12615690, new Date().toString());

    while (true) {
        let lastProcessedData = await getLastProcessedBlock(networkCtx.name);
        let newHeightData = await getNewHeight(networkCtx.name, lastProcessedData?.height);

        let newHeight = newHeightData?.newHeight;
        let newHeightTime = newHeightData?.time;

        //if there's no db, init first block record
        if (!lastProcessedData || cleanMode) {
            cleanMode = false;
            await processNewHeight(networkCtx, newHeight, newHeightTime);
            continue;
        }

        //if last block was more than 5 min ago, skip missed blocks 
        let isBlockOutdated = dateToUnix(newHeightTime) - dateToUnix(lastProcessedData.time) > oldBlockTimeout;
        if (isBlockOutdated) {
            console.warn(`${networkCtx.name} block ${lastProcessedData.height} is outdated, new height ${newHeight} ${newHeightTime}`)
            await processNewHeight(networkCtx, newHeight, newHeightTime);
            continue;
        }

        await new Promise(res => setTimeout(res, 1000));
        for (let height = parseInt(lastProcessedData.height) + 1; height <= newHeight; height++) {
            await processNewHeight(networkCtx, height, newHeightTime);
        }
    }
};

(async () => {
    await dbReady();
    monitoring.listen(3000);

    let networks = args.network ?
        config.networks.filter(x => x.name === args.network) :
        config.networks;

    //for icns
    if (!networks.find(x => x.name === "osmosis"))
        await registerNetwork({ name: "osmosis" });

    await Promise.allSettled(networks.map(async (net) => {
        while (true) {
            try {
                let result = await processNetwork(net);
                console.log(`task ended with result ${result}`);
            } catch (err) {
                console.log(err?.message);
                //todo handle all types of errors from errors.js using instanceof
                await new Promise(res => setTimeout(res, 60000));
            }
        }
    }));
})().catch(err => console.log(err));