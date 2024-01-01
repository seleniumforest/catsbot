import { Token } from "@prisma/client";

export type MsgTypes =
    "msgSwapExactAmountInOut" |
    "msgDelegate" |
    "msgExecuteContract" |
    "msgSend" |
    "msgUndelegate" |
    "msgBeginRedelegate" |
    "msgSifchainSwap" |
    "msgJoinPool" |
    "msgExitPool" |
    "msgCreatePosition" |
    "msgWithdrawPosition";


export type CoinWithMetadata = Token & { amount: string };

export type TokenSwapInfo = {
    tokenIn: CoinWithMetadata,
    tokenOut: CoinWithMetadata
}