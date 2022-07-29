const { Registry, decodeTxRaw, Coin } = require("@cosmjs/proto-signing");
const { defaultRegistryTypes, MsgSendEncodeObject } = require("@cosmjs/stargate");
const { notifyMsgSend } = require('./tgbot');
const { TxEvent, WebsocketClient } = require('@cosmjs/tendermint-rpc');
const { fromBaseUnit } = require("./helpers.js");
const config = require("../config.json");

const server = "wss://rpc-cosmoshub-ia.notional.ventures/";
const registry = new Registry(defaultRegistryTypes);

const processTx = (newtx) => {
    let tx = newtx.data.value;
    let txhash = newtx.events["tx.hash"][0];
    console.log("recieved tx " + txhash);
    let decodedTx = decodeTxRaw(Buffer.from(tx.TxResult.tx, "base64"));
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
            txhash);
    }
}

(async () => {
    const client = new WebsocketClient(server, (err) => console.log(err));

    let stream = await client.listen({
        jsonrpc: "2.0",
        method: "subscribe",
        id: 0,
        params: {
            query: "tm.event='Tx'"
        }
    });

    stream.addListener({
        complete: () => console.log("complete"),
        error: (err) => console.log(err),
        next: processTx 
    });
})();