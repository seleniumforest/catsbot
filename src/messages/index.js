const handleMsgDelegate = require("./msgDelegate");
const handleMsgExecuteContract = require("./msgExecuteContract");
const handleMsgSend = require("./msgSend");
const handleMsgUndelegate = require("./msgUndelegate");

module.exports = {
    "/cosmos.bank.v1beta1.MsgSend": handleMsgSend,
    "/cosmos.staking.v1beta1.MsgDelegate": handleMsgDelegate,
    "/cosmos.staking.v1beta1.MsgUndelegate": handleMsgUndelegate,
    "/cosmwasm.wasm.v1.MsgExecuteContract": handleMsgExecuteContract
};