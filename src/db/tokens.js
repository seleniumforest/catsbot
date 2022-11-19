const { assets: sifchainAssets } = require("../../chain-specific/sifchain/assets.json");
const { assets: osmosisAssets } = require("../../chain-specific/osmosis/assets.json");
const db = require("./db");

const saveToken = async (networkName, token) => {
    if (!token?.denom && !token?.contract) 
        console.warn(`Trying to save invalid token. Network: ${networkName}, token: ${JSON.stringify(token)}`);

    let existingToken = await getTokenByDenom(networkName, token?.denom || token.contract);
    if (!!existingToken)
        return;

    console.log(`Populating token into db for network ${networkName} ${JSON.stringify(token)}`);
    await db.ref(`${networkName}/tokens/${trimDenom(token?.denom) || token.contract}`)
        .transaction(() => ({
            network: networkName,
            ...token
        }));
}

//by denom or contract
const getTokenByDenom = async (networkName, denom) => {
    let data = await db.ref(`${networkName}/tokens/${trimDenom(denom)}`)
        .get();

    return data.val();
}

//symbol "/" is part of the path for acebase, so we need to trim this 
const trimDenom = (denom) => {
    if (denom?.startsWith("ibc/"))
        return denom.substring(4, denom.length);
    
    return denom;
}

const getSifchainTokens = async () => {
    let data = await db.ref(`sifchain/tokens`)
        .get();

    return Object.entries(data.val()).map(([_, val]) => val);
}

const loadSifchainTokensFromFile = async () => {
    for (let asset of sifchainAssets) {
        await saveToken(
            "sifchain",
            {
                denom: asset.denom,
                decimals: asset.decimal,
                ticker: asset.dp_denom,
                coingeckoId: asset.coinGeckoId || ""
            });
    }
}

const loadOsmosisTokensFromFile = async () => {
    for (let asset of osmosisAssets) {
        await saveToken(
            "osmosis",
            {
                denom: asset.base,
                decimals: asset.denom_units.find(x => x.exponent > 0)?.exponent || 6,
                ticker: asset.symbol,
                coingeckoId: asset.coingecko_id || ""
            });
    }
}

const populateTokensIntoDb = async () => {
    await loadSifchainTokensFromFile();
    await loadOsmosisTokensFromFile();
}

module.exports = {
    saveToken,
    getTokenByDenom,
    populateTokensIntoDb,
    getSifchainTokens
}