const db = require("./db");

const saveProcessedBlock = async (networkName, height, time) => {
    await db.ref(`${networkName}/block`)
        .transaction(() => ({
            network: networkName,
            height,
            time
        }));
}

const getLastProcessedBlock = async (networkName) => {
    let data = await db.ref(`${networkName}/block`)
        .get();

    return data.val();
}

module.exports = {
    saveProcessedBlock, 
    getLastProcessedBlock
}