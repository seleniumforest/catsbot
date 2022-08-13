const { Telegraf } = require("telegraf");
const config = require("../config.json");
const { shortAddress } = require("./helpers");
const isProdEnv = config.env === "prod";
const bot = new Telegraf(config.token);
if (isProdEnv)
    bot.launch();

const express = require('express');
const app = express();

app.use(express.json());

app.post('/send', function (request, response) {
    let message = request.body?.message;
    if (!message)
        return;

    console.log(message);

    if (isProdEnv)
        bot.telegram.sendMessage(
            config.channel,
            message,
            {
                parse_mode: "HTML",
                disable_web_page_preview: true
            }).then(x => {
                response.send({ status: true, messageId: x?.message_id });
            }).catch(x => {
                response.send({ status: false, reason: JSON.stringify(x) });
            })
});

//------- DB part

const { AceBase } = require('acebase');
const db = new AceBase('catsdb', { logLevel: "warn", storage: { path: "./" } });

app.post('/saveProcessedTx', function (request, response) {
    let { network, height, txHash } = request.body;
    saveProcessedTx(network, height, txHash)
        .then(x => {
            response.send({ status: true })
        })
});

const saveProcessedTx = async (network, height, txHash) => {
    await db.ref(`${network}/block`)
        .transaction(snapshot => {
            return {
                height: height,
                txs: (height !== snapshot.val()?.height) ||
                    (!snapshot.val()?.txs) ? [] : [...snapshot.val().txs, txHash]
            }
        });
}

app.post('/createEmptyBlock', function (request, response) {
    let { network, height } = request.body;
    createEmptyBlock(network, height)
        .then(x => {
            response.send({ status: true })
        })
});

const createEmptyBlock = async (network, height) => {
    await db.ref(`${network}/block`)
        .transaction(() => ({
            height: height,
            txs: []
        }));
}

app.post('/getLastProcessedTxs', function (request, response) {
    let { network } = request.body;
    getLastProcessedTxs(network)
        .then(x => {
            response.send({ status: true, data: x })
        })
});

const getLastProcessedTxs = async (networkName) => {
    let data = await db.ref(`${networkName}/block`)
        .get();

    return data.val() ?? null;
}

app.listen(3000);