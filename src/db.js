const { AceBase } = require('acebase');
const db = new AceBase('catsdb', { logLevel: "warn", storage: { path: "./" } });

const saveProcessedTx = async (network, height, txHash) => {
    await db.ref(`network/${network.name}`)
        .transaction(snapshot => {
            console.log("saving data for block " + height)
            return {
                network: network.name,
                height,
                isBlockFinalized: false,
                txs: (height !== snapshot.val()?.height) ||
                    (!snapshot.val()?.txs) ? [] : [...snapshot.val().txs, txHash]
            }
        });
}

const getLastProcessedTxs = async (networkName) => {
    let data = await db.ref(`network/${networkName}`)
        .get();

    return data.val() ?? null;
}

const dbReady = async () => await db.ready();

module.exports = {
    saveProcessedTx,
    getLastProcessedTxs,
    dbReady
}