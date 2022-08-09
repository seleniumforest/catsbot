const { AceBase } = require('acebase');
const db = new AceBase('catsdb', { logLevel: "warn", storage: { path: "./" } });

const saveProcessedTx = async (network, height, txHash) => {
    await db.ref(`${network.name}/block`)
        .transaction(snapshot => {
            return {
                height: height,
                txs: (height !== snapshot.val()?.height) ||
                    (!snapshot.val()?.txs) ? [] : [...snapshot.val().txs, txHash]
            }
        });
}

const createEmptyBlock = async (network, height) => {
    await db.ref(`${network.name}/block`)
        .transaction(() => ({
            height: height,
            txs: []
        }));
}

const getLastProcessedTxs = async (networkName) => {
    let data = await db.ref(`${networkName}/block`)
        .get();

    return data.val() ?? null;
}


const dbReady = async () => await db.ready();

module.exports = {
    saveProcessedTx,
    getLastProcessedTxs,
    createEmptyBlock,
    dbReady
}