const { getSifchainRegistry, fromBase64, fromBaseUnit } = require("../helpers");
const Big = require('big.js');
const { default: axios } = require("axios");
const { notifySifchainSwap } = require("../tgbot");
const { assets } = require("../../chain-specific/sifchain/assets.json");
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

const assetsCache = new NodeCache({
    stdTTL: 60 * 3600 * 24
})

let fetchSifchainAssets = async () => {
    let key = "assets";
    if (assetsCache.has(key))
        return assetsCache.get(key)

    try {
        let response = await axios.get("https://api.mintscan.io/v2/assets/sifchain");
        assetsCache.set(key, response.data.assets)
        return response.data.assets;
    }
    catch (err) { }

    return assets;
}

module.exports = handleMsgSifchainSwap;