const express = require('express');
const { send } = require('./bot');
const { saveProcessedTx, getLastProcessedTxs, createEmptyBlock } = require('./db');

const app = express();
app.use(express.json());

app.post('/saveProcessedTx', function (request, response) {
    let { network, height, txHash } = request.body;
    saveProcessedTx(network, height, txHash)
        .then(x => {
            response.send({ status: true })
        })
});

app.post('/getLastProcessedTxs', function (request, response) {
    let { network } = request.body;
    getLastProcessedTxs(network)
        .then(x => {
            response.send({ status: true, data: x })
        })
});

app.post('/createEmptyBlock', function (request, response) {
    let { network, height } = request.body;
    createEmptyBlock(network, height)
        .then(x => {
            response.send({ status: true })
        })
});

app.post('/send', function (request, response) {
    let message = request?.body?.message;
    console.log(message);
    if (!message)
        return;

    send(message)
        .then(x => {
            response.send({ status: true, messageId: x?.message_id });
        }).catch(x => {
            response.send({ status: false, reason: JSON.stringify(x) });
        })
});

app.listen(3000);