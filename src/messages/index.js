const handleMsgBeginRedelegate = require("./msgBeginRedelegate");
const handleMsgDelegate = require("./msgDelegate");
const handleMsgExecuteContract = require("./msgExecuteContract");
const handleMsgSend = require("./msgSend");
const handleMsgSifchainSwap = require("./msgSifchainSwap");
const handleMsgSwapExactAmountIn = require("./msgSwapExactAmountIn");
const handleMsgUndelegate = require("./msgUndelegate");

module.exports = {
    "/cosmos.bank.v1beta1.MsgSend": handleMsgSend,
    "/cosmos.staking.v1beta1.MsgDelegate": handleMsgDelegate,
    "/cosmos.staking.v1beta1.MsgUndelegate": handleMsgUndelegate,
    "/cosmos.staking.v1beta1.MsgBeginRedelegate": handleMsgBeginRedelegate,
    "/cosmwasm.wasm.v1.MsgExecuteContract": handleMsgExecuteContract,
    "/osmosis.gamm.v1beta1.MsgSwapExactAmountIn": handleMsgSwapExactAmountIn,
    "/sifnode.clp.v1.MsgSwap": handleMsgSifchainSwap
};