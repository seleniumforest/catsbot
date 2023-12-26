import { DecodedTxRaw } from "@cosmjs/proto-signing";
import { IndexedTx } from "@cosmjs/stargate";
import { Chain } from "cosmos-indexer";
import { handleMsgSend } from "./msgSend";
import { handleMsgBeginRedelegate } from "./msgBeginRedelegate";
import { handleMsgDelegate } from "./msgDelegate";
import { handleMsgExec } from "./msgExec";
import { handleMsgExecuteContract } from "./msgExecuteContract";
import { handleMsgUndelegate } from "./msgUndelegate";
import { handleMsgSwapExactAmountInOut } from "./msgSwapExactAmount";

export const msgHandlerMap = new Map<MsgTypeUrl, (ctx: HandlerContext) => Promise<void>>([
    ["/cosmos.bank.v1beta1.MsgSend", handleMsgSend],
    ["/cosmos.staking.v1beta1.MsgBeginRedelegate", handleMsgBeginRedelegate],
    ["/cosmos.staking.v1beta1.MsgDelegate", handleMsgDelegate],
    ["/cosmos.authz.v1beta1.MsgExec", handleMsgExec],
    ["/cosmwasm.wasm.v1.MsgExecuteContract", handleMsgExecuteContract],
    ["/cosmos.staking.v1beta1.MsgUndelegate", handleMsgUndelegate],
    ["/osmosis.gamm.v1beta1.MsgSwapExactAmountIn", handleMsgSwapExactAmountInOut],
    ["/osmosis.gamm.v1beta1.MsgSwapExactAmountOut", handleMsgSwapExactAmountInOut],
    ["/osmosis.poolmanager.v1beta1.MsgSwapExactAmountIn", handleMsgSwapExactAmountInOut],
    ["/osmosis.poolmanager.v1beta1.MsgSwapExactAmountOut", handleMsgSwapExactAmountInOut]
]);

export type MsgTypeUrl =
    "/cosmos.bank.v1beta1.MsgSend" |
    "/cosmos.staking.v1beta1.MsgBeginRedelegate" |
    "/cosmos.staking.v1beta1.MsgDelegate" |
    "/cosmos.authz.v1beta1.MsgExec" |
    "/cosmwasm.wasm.v1.MsgExecuteContract" |
    "/cosmos.staking.v1beta1.MsgUndelegate" |
    "/osmosis.gamm.v1beta1.MsgSwapExactAmountIn" |
    "/osmosis.gamm.v1beta1.MsgSwapExactAmountOut" |
    "/osmosis.poolmanager.v1beta1.MsgSwapExactAmountIn" |
    "/osmosis.poolmanager.v1beta1.MsgSwapExactAmountOut";

export type HandlerContext = {
    chain: Chain,
    tx: IndexedTx,
    decodedTx: DecodedTxRaw,
    decodedMsg: any,
    msgType: MsgTypeUrl
}