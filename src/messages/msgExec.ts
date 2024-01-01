import { MsgExec } from "osmojs/dist/codegen/cosmos/authz/v1beta1/tx";
import { HandlerContext, MsgTypeUrl, msgHandlerMap } from ".";
import { registry } from "../helpers";

export const handleMsgExec = async (ctx: HandlerContext) => {
    let decodedMsgExec = ctx.decodedMsg as MsgExec

    await Promise.allSettled(decodedMsgExec.msgs.map(async (innerMsg, index) => {
        let decodedMsg = registry.decode(innerMsg);
        let msgTypeUrl = innerMsg.typeUrl as MsgTypeUrl;
        let handler = msgHandlerMap.get(msgTypeUrl);
        if (!handler)
            return;

        await handler({ ...ctx, decodedMsg, msgType: msgTypeUrl, msgIndex: index, isAuthzTx: true });
    }));
};