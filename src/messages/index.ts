import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { IndexedTx } from "@cosmjs/stargate";
import { Chain } from "cosmos-indexer";
import { handleMsgSend } from "./msgSend";
import { handleMsgBeginRedelegate } from "./msgBeginRedelegate";
import { handleMsgDelegate } from "./msgDelegate";
import { handleMsgExec } from "./msgExec";
import { handleMsgExecuteContract } from "./msgExecuteContract";
import { handleMsgUndelegate } from "./msgUndelegate";
import { handleMsgSwapExactAmountIn } from "./msgSwapExactAmountIn";

export const msgHandlerMap = new Map<string, (ctx: HandlerContext) => Promise<void>>([
    ["/cosmos.bank.v1beta1.MsgSend", handleMsgSend],
    ["/cosmos.staking.v1beta1.MsgBeginRedelegate", handleMsgBeginRedelegate],
    ["/cosmos.staking.v1beta1.MsgDelegate", handleMsgDelegate],
    ["/cosmos.authz.v1beta1.MsgExec", handleMsgExec],
    ["/cosmwasm.wasm.v1.MsgExecuteContract", handleMsgExecuteContract],
    ["/cosmos.staking.v1beta1.MsgUndelegate", handleMsgUndelegate],
    ["/osmosis.gamm.v1beta1.MsgSwapExactAmountIn", handleMsgSwapExactAmountIn],
    ["/osmosis.poolmanager.v1beta1.MsgSwapExactAmountIn", handleMsgSwapExactAmountIn]
]);

export type HandlerContext = {
    chain: Chain,
    tx: IndexedTx,
    decodedTx: DecodedTxRaw,
    decodedMsg: any
}