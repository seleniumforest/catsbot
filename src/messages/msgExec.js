const { getDefaultRegistry } = require("../helpers");

const handleMsgExec = async (network, msg, tx) => {
    const msgHandlers = require("./");
    let decodedMsgExec = getDefaultRegistry().decode(msg);

    let handlers = decodedMsgExec.msgs
        .filter(msg => typeof msgHandlers[msg.typeUrl] === "function")
        .map((msg, i) => {
            let msgLog = tx?.log?.find(x => i === 0 ? !x.msg_index : x.msg_index === i);
            let handler = msgHandlers[msg.typeUrl];

            return handler(network, msg, tx, msgLog)
                .catch((err) => {
                    console.error(`Error handling txid ${newtx.hash} in ${network.name} msg ${err?.message}`)
                });
        });


    await Promise.allSettled(handlers);
}

module.exports = handleMsgExec