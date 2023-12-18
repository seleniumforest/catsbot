import { BlocksWatcher, Chain, IndexedBlock } from "cosmos-indexer";
import { decodeTxRaw } from "@cosmjs/proto-signing";
import { msgHandlerMap } from "./messages";
import monitoring from "./monitoring/monitoring.";
import { dbReady, getLastProcessedBlockFromDb, saveProcessedBlockToDb } from "./db";
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
    await saveProcessedBlockToDb({
        network: chain.chain_name,
        height: block.header.height,
        time: new Date(block.header.time).getTime()
    });
}

(async () => {
    await dbReady();
    monitoring.listen(3000);
    let watcher = BlocksWatcher.create();

    for (const network of getConfig().networks) {
        let savedBlock = await getLastProcessedBlockFromDb(network.name);
        let isBlockOutdated = savedBlock && (Date.now() - savedBlock.time > 1000 * 60 * 15);

        watcher.useNetwork({
            name: network.name,
            dataToFetch: "INDEXED_TXS",
            fromBlock: isBlockOutdated ? undefined : savedBlock ? savedBlock.height : undefined
        })
    }
    watcher.useChainRegistryRpcs()
        .onBlockRecieved(async (ctx, block) => {
            console.log(`Processing ${ctx.chain.chain_name} at ${block.header.height}`);
            try {
                await processBlock(ctx.chain, block as IndexedBlock);
            } catch (e) {
                console.log(JSON.stringify(e, null, 4));
            }
        })

    await watcher.run();
})().catch(err => console.log(err));