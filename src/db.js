const { AceBase } = require('acebase');
const db = new AceBase('catsdb', { logLevel: "warn", storage: { path: "./" } });

const dbReady = async () => await db.ready();

const saveProcessedTx = async (networkName, height, txHash) => {
    await db.ref(`${networkName}/block`)
        .transaction(snapshot => {
            return {
                height: height,
                txs: (height !== snapshot.val()?.height) ||
                    (!snapshot.val()?.txs) ? [] : [...snapshot.val().txs, txHash]
            }
        });
}

const saveProcessedBlock = async (networkName, height, time) => {
    await db.ref(`${networkName}/block`)
        .transaction(() => ({
            network: networkName,
            height,
            time,
            txs: []
        }));
}

const getLastProcessedTxs = async (networkName) => {
    let data = await db.ref(`${networkName}/block`)
        .get();

    return data.val();
}

module.exports = {
    saveProcessedTx,
    getLastProcessedTxs,
    saveProcessedBlock,
    dbReady
}