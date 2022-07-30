const { Registry, decodeTxRaw, Coin } = require("@cosmjs/proto-signing");
const { defaultRegistryTypes, StargateClient } = require("@cosmjs/stargate");
const { notifyMsgSend } = require('./tgbot');
const { WebsocketClient } = require('@cosmjs/tendermint-rpc');
const { fromBaseUnit } = require("./helpers.js");
const config = require("../config.json");

const endpoint = config.networks[0].rpcEndpoints[0];
const registry = new Registry(defaultRegistryTypes);

const processNewTx = (newtx) => {
    console.log("recieved tx " + newtx.hash);
    let decodedTx = decodeTxRaw(newtx.tx);
    let network = config.networks[0];
    for (const msg of decodedTx.body.messages) {
        if (msg.typeUrl !== "/cosmos.bank.v1beta1.MsgSend") {
            return;
        }

        let decodedMsg = registry.decode(msg);
        let amountSent = fromBaseUnit(decodedMsg.amount?.find((x) => x.denom === "uatom")?.amount, 6);
        if (parseFloat(amountSent) < network.minNotifyAmount) {
            console.log("less than 1000 atom")
            return;
        }

        notifyMsgSend(
            decodedMsg.fromAddress?.toString(),
            decodedMsg.toAddress?.toString(),
            amountSent,
            newtx.hash);
    }   
}

const processNewHeight = async (height) => {
    console.log(`got new block ${height}`)
    let rpcClient = await StargateClient.connect(endpoint.rpc);
    let txs = await rpcClient.searchTx({ height: parseInt(height) });
    txs.forEach(processNewTx);
}

(async () => {
    const wsClient = new WebsocketClient(endpoint.ws, (err) => console.log(err));

    let stream = await wsClient.listen({
        jsonrpc: "2.0",
        method: "subscribe",
        id: 0,
        params: {
            query: "tm.event='NewBlockHeader'"
        }
    });

    stream.addListener({
        complete: () => console.log("complete"),
        error: (err) => console.log(err),
        next: (newtx) => {
            processNewHeight(newtx?.data?.value?.header?.height);
        }
    });
})();