const { default: axios } = require('axios');

const saveProcessedTx = async (network, height, txHash) => {
    await axios.post("http://localhost:3000/saveProcessedTx", {
        network: network.name, height, txHash
    });
}

const createEmptyBlock = async (network, height) => {
    await axios.post("http://localhost:3000/createEmptyBlock", {
        network: network.name, height
    });
}

const getLastProcessedTxs = async (network) => {
    let response = await axios.post("http://localhost:3000/getLastProcessedTxs", {
        network: network.name
    });
    
    return response.data.txs;
}

module.exports = {
    saveProcessedTx,
    getLastProcessedTxs,
    createEmptyBlock
}