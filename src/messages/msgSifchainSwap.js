const { getSifchainRegistry, fromBaseUnit } = require("../helpers");
const Big = require('big.js');
const { notifySifchainSwap } = require("../integrations/telegram");
const { getSifchainTokens } = require("../db/tokens");
const msgTrigger = "msgSifchainSwap";

const handleMsgSifchainSwap = async (network, msg, tx, msgLog) => {
    let { sentAsset, receivedAsset, sentAmount, signer } = getSifchainRegistry().decode(msg);
    let recievedAmount = msgLog.events
        .find(x => x.type === "swap_successful")?.attributes
        .find(x => x.key === "swap_amount")?.value;
    let allAssets = await getSifchainTokens();

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

module.exports = handleMsgSifchainSwap;