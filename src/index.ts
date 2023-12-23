import { BlocksWatcher, Chain, IndexedBlock } from "cosmos-indexer";
import { decodeTxRaw } from "@cosmjs/proto-signing";
import { msgHandlerMap } from "./messages";
import monitoring from "./monitoring/monitoring.";
import { dbReady, prisma } from "./db";
import { registry } from "./helpers";
import { getConfig } from "./config";
import { tokenListsReady } from "./integrations/tokens";
import { pricesReady } from "./integrations/coingecko";
import { TimeSpan } from "timespan-ts";

async function processBlock(chain: Chain, block: IndexedBlock) {
    let promises = block.txs.map(async tx => {
        if (tx.code != 0)
            return;

        let decodedTx = decodeTxRaw(tx.tx);
        for (const msg of decodedTx.body.messages) {
            let decodedMsg = registry.decode(msg);
            let handler = msgHandlerMap.get(msg.typeUrl);
            if (!handler)
                continue;

            try {
                await handler({ chain, tx, decodedTx, decodedMsg });
            } catch (e) {
                console.warn(`Error handling block ${block.header.height} on network ${chain.chain_name} with err ${e}`)
            }
        }

        await prisma.block.upsert({
            where: {
                network: chain.chain_name,
                AND: {
                    height: {
                        lt: block.header.height
                    }
                }
            },
            update: {
                height: block.header.height,
                network: chain.chain_name,
                time: block.header.time
            },
            create: {
                height: block.header.height,
                network: chain.chain_name,
                time: block.header.time
            }
        });
    });

    await Promise.allSettled(promises);
}

(async () => {
    console.log("starting monitoring server...")
    monitoring.listen(3000);

    await Promise.all([
        dbReady(),
        tokenListsReady(),
        pricesReady()
    ]);

    let watcher = BlocksWatcher.create();
    for (const network of getConfig().networks) {
        let lastSavedBlock = await prisma.block.findUnique({
            where: {
                network: network.name,
                time: {
                    gt: new Date(Date.now() - TimeSpan.fromMinutes(5).totalMilliseconds)
                }
            }
        })
        console.log(network.name, lastSavedBlock?.height);
        watcher.useNetwork({
            name: network.name,
            dataToFetch: "INDEXED_TXS",
            lag: 5,
            fromBlock: lastSavedBlock?.height,
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
