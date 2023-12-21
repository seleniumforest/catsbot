import { BlocksWatcher, Chain, IndexedBlock } from "cosmos-indexer";
import { decodeTxRaw } from "@cosmjs/proto-signing";
import { msgHandlerMap } from "./messages";
import monitoring from "./monitoring/monitoring.";
import { dbReady } from "./db";
import { registry } from "./helpers";
import { getConfig } from "./config";

async function processBlock(chain: Chain, block: IndexedBlock) {
    let promises = block.txs.map(async tx => {
        if (tx.code != 0)
            return;

        let decodedTx = decodeTxRaw(tx.tx);
        for (const msg of decodedTx.body.messages) {
            let decodedMsg = registry.decode(msg);
            let handler = msgHandlerMap.get(msg.typeUrl);
            if (!handler)
                return;

            await handler({ chain, tx, decodedTx, decodedMsg });
        }
    });

    await Promise.allSettled(promises);
}

(async () => {
    await dbReady();
    monitoring.listen(3000);
    let watcher = BlocksWatcher.create();

    for (const network of getConfig().networks) {
        watcher.useNetwork({
            name: network.name,
            dataToFetch: "INDEXED_TXS",
            lag: 10,
            onBlockRecievedCallback: async (ctx, indexedBlock) => {
                let block = indexedBlock as IndexedBlock;
                console.log(`Processing ${ctx.chain.chain_name} at ${block.header.height}`);
                try {
                    await processBlock(ctx.chain, block as IndexedBlock);
                } catch (e) {
                    console.log(JSON.stringify(e, null, 4));
                }
            }
        })
    }
    watcher.useChainRegistryRpcs();
    await watcher.run();
})().catch(err => console.log(err));