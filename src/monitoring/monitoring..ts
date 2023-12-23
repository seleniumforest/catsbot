import express from 'express';
import { prisma } from '../db';
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
        let data = await Promise.all(config.networks.map(x => prisma.block.findUnique({ where: { network: x.name } })))
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

app.get('/prices', async function (_, response) {
    try {
        let data = await priceDump();
        response.send(data.map(x => ({
            token: x.coingeckoId,
            price: x.priceUsd,
            lastUpdated: x.savedDate
        })));
    } catch { }
});

export = app;
