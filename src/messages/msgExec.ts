import { MsgExec } from "osmojs/dist/codegen/cosmos/authz/v1beta1/tx";
import { HandlerContext, msgHandlerMap } from ".";
import { registry } from "../helpers";

export const handleMsgExec = async (ctx: HandlerContext) => {
    let decodedMsgExec = ctx.decodedMsg as MsgExec

    for (const innerMsg of decodedMsgExec.msgs) {
        let decodedMsg = registry.decode(innerMsg);
        let handler = msgHandlerMap.get(innerMsg.typeUrl);
        if (!handler)
            return;

        await handler({ ...ctx, decodedMsg })
    }
};