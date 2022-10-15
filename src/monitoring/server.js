const express = require('express');
const config = require("../../config.json");
const { getLastProcessedTxs } = require('../db');
const path = require('path')
const readLastLines = require('read-last-lines');
const priceData = require('../integrations/coingecko');

const app = express();
app.use(express.json());

app.use('/', express.static(path.join(__dirname, 'public')))

app.get('/status', function (_, response) {
    Promise.all(config.networks.map(x => getLastProcessedTxs(x.name)))
        .then((data) => {
            response.send(data)
        });
});

app.get('/logs', function (_, response) {
    Promise.all([
        readLastLines.read('catsbot-out.log', 50),
        readLastLines.read('catsbot-err.log', 50)
    ]).then(([outlog, errlog]) => {
        response.send({ errlog, outlog });
    });
});

app.get('/prices', function (_, response) {
    response.send({ ...priceData, prices: Array.from(priceData.prices.entries()) });
});

module.exports = app;