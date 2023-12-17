import express from 'express';
import { getLastProcessedBlockFromDb } from '../db';
import path from 'path';
import readLastLines from 'read-last-lines';
import { getConfig } from '../config';
import { priceDump } from '../integrations/coingecko';

const config = getConfig();
const app = express();
app.use(express.json());

app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/status', async function (_, response) {
    try {
        let data = await Promise.all(config.networks.map(x => getLastProcessedBlockFromDb(x.name)))
        response.send(data);
    } catch { }
});

app.get('/logs', async function (_, response) {
    try {
        let [outlog, errlog] = await Promise.all([
            readLastLines.read('catsbot-out.log', 50),
            readLastLines.read('catsbot-err.log', 50),
        ]);

        response.send({ errlog, outlog })
    } catch { }
});

app.get('/prices', function (_, response) {
    try {
        response.send(priceDump().map(x => ({
            token: x[0],
            price: x[1].price,
            lastUpdated: new Date(x[1].lastUpdated)
        })));
    } catch { }
});

export = app;
