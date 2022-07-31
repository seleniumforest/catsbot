const { Registry, decodeTxRaw, Coin } = require("@cosmjs/proto-signing");
const { defaultRegistryTypes, StargateClient } = require("@cosmjs/stargate");
const { notifyMsgSend } = require('./tgbot');
const { WebsocketClient } = require('@cosmjs/tendermint-rpc');
const { fromBaseUnit, toBaseUnit } = require("./helpers.js");
const config = require("../config.json");

const registry = new Registry(defaultRegistryTypes);

const processNewTx = (network, newtx) => {
    let decodedTx = decodeTxRaw(newtx.tx);
    for (const msg of decodedTx.body.messages) {
        if (msg.typeUrl !== "/cosmos.bank.v1beta1.MsgSend") {
            return;
        }

        let decodedMsg = registry.decode(msg);
        let transfers = decodedMsg.amount.filter((x) => network.notifyDenoms.map(d => d.denom).includes(x.denom));
        transfers.forEach(tr => {
            let transfferedDenom = network.notifyDenoms.find(x => x.denom === tr.denom);
            let amountSent = fromBaseUnit(tr?.amount, 6);
            let minNotifyAmount = fromBaseUnit(transfferedDenom?.amount);
            if (!amountSent || !minNotifyAmount)
                return;

            if (parseFloat(amountSent) < minNotifyAmount) {
                console.log(`${network.name}: less than ${toBaseUnit(transfferedDenom.amount, 6)} ${transfferedDenom.denom}`)
                return;
            }

            notifyMsgSend(
                decodedMsg.fromAddress?.toString(),
                decodedMsg.toAddress?.toString(),
                transfferedDenom.ticker,
                amountSent,
                newtx.hash,
                network.name);
        })
    }
}

const processNewHeight = async (network, height) => {
    console.log(`${network.name}: got new block ${height}`);
    let { rpc } = network.endpoints[0];
    let rpcClient = await StargateClient.connect(rpc);
    let txs = await rpcClient.searchTx({ height: parseInt(height) });
    txs.forEach((tx) => processNewTx(network, tx));
}

const processNetwork = async (network) => {
    const { ws } = network.endpoints[0];
    const wsClient = new WebsocketClient(ws, (err) => console.log(err));

    let stream = await wsClient.listen({
        jsonrpc: "2.0",
        method: "subscribe",
        id: 0,
        params: {
            query: "tm.event='NewBlockHeader'"
        }
    });

    stream.addListener({
        complete: () => {
            console.log("complete");
            wsClient.disconnect();
        },
        error: (err) => {
            console.log(err);
            wsClient.disconnect();
        },
        next: (newtx) => {
            let newHeight = newtx?.data?.value?.header?.height;
            processNewHeight(network, newHeight);
        }
    });
};

(async () => {
    config.networks.forEach(processNetwork);
})();