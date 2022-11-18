const { getSifchainRegistry, fromBaseUnit } = require("../helpers");
const Big = require('big.js');
const { default: axios } = require("axios");
const { notifySifchainSwap } = require("../integrations/telegram");
const { assets: localAssets } = require("../../chain-specific/sifchain/assets.json");
const NodeCache = require("node-cache");
const msgTrigger = "msgSifchainSwap";

const handleMsgSifchainSwap = async (network, msg, tx, msgLog) => {
    let { sentAsset, receivedAsset, sentAmount, signer } = getSifchainRegistry().decode(msg);
    let recievedAmount = msgLog.events
        .find(x => x.type === "swap_successful")?.attributes
        .find(x => x.key === "swap_amount")?.value;
    let allAssets = await fetchSifchainAssets();

    let sentAssetMatch = network.notifyDenoms.find(x => x.denom === sentAsset.symbol);
    let receivedAssetMatch = network.notifyDenoms.find(x => x.denom === receivedAsset.symbol);

    let sentAssetInfo = allAssets.find(x => x.denom === sentAsset.symbol);
    let receivedAssetInfo = allAssets.find(x => x.denom === receivedAsset.symbol);

    let sentAssetTreshold = sentAssetMatch?.msgAmounts?.[msgTrigger] || sentAssetMatch?.amount;
    let recievedAssetTreshold = receivedAssetMatch?.msgAmounts?.[msgTrigger] || receivedAssetMatch?.amount;

    if (sentAssetMatch && new Big(sentAmount).gte(new Big(sentAssetTreshold)) ||
        receivedAssetMatch && new Big(recievedAmount).gte(new Big(recievedAssetTreshold)))
        notifySifchainSwap(
            signer,
            fromBaseUnit(sentAmount, sentAssetInfo?.decimal),
            sentAssetInfo?.dp_denom || sentAsset.symbol.toUpperCase(),
            fromBaseUnit(recievedAmount, receivedAssetInfo?.decimal),
            receivedAssetInfo?.dp_denom || receivedAsset.symbol.toUpperCase(),
            tx.hash,
            network
        );
}


//todo move asset dictionaries into db
const assetsCache = new NodeCache({
    stdTTL: 60 * 3600 * 24
})

 const fetchSifchainAssets = async () => {
    let key = "assets";
    if (assetsCache.has(key))
        return assetsCache.get(key)

    // mintscan throws a lot of errors and bans by ip
    // try {
    //     let { data: { assets: mintscanAssets } } =
    //         await axios.get("https://api.mintscan.io/v2/assets/sifchain", {
    //             headers: {
    //                 "Origin": "https://www.mintscan.io",
    //                 "Referer": "https://www.mintscan.io/"
    //             }
    //         });

    //     let fetchedAssets = mintscanAssets?.length > 0 ? mintscanAssets : localAssets;
    //     assetsCache.set(key, fetchedAssets)
    //     return fetchedAssets;
    // }
    // catch (err) { console.log(`Error fetching sifchain assets ${err?.message}`) }

    return localAssets;
}

module.exports = handleMsgSifchainSwap;