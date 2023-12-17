import { AceBase } from "acebase";
import osmosisAssets from "./chain-specific/osmosis/osmosis-1.assetlist.json";
import { removeBackslash } from "./helpers";

const db = new AceBase(
    'catsdb',
    {
        logLevel: "warn",
        storage: { path: "./" }
    }
);

export const dbReady = async () => {
    await db.ready();
    await loadOsmosisTokensFromFile();
}

export const saveProcessedBlockToDb = async (networkName: string, height: number, time: any) => {
    await db.ref(`${networkName}/block`)
        .transaction(() => ({
            network: networkName,
            height,
            time
        }));
}

export const getLastProcessedBlockFromDb = async (networkName: string) => {
    let data = await db.ref(`${networkName}/block`)
        .get();

    return data.val();
}

export type Token = { id: string, decimals: number, ticker: string, coingeckoId: string };

export const saveTokenToDb = async (network: string, token: Token) => {
    let existingToken = await getTokenByDenomFromDb(network, token.id);
    if (existingToken != null)
        return;

    console.log(`Populating token into db for network ${network} ${JSON.stringify(token)}`);
    await db.ref(`${network}/tokens/${removeBackslash(token.id)}`)
        .transaction(() => ({
            network,
            ...token
        }));
}

//by denom or contract
export const getTokenByDenomFromDb = async (networkName: string, denom: string) => {
    try {
        let data = await db.ref<Token>(`${networkName}/tokens/${removeBackslash(denom)}`)
            .get();

        return data.val();
    } catch (e: any) {
        console.warn(`getTokenByDenomFromDb: cannot get denom ${denom} for ${networkName} error ${e}`)
    }
}

const loadOsmosisTokensFromFile = async () => {
    for (let asset of osmosisAssets.assets) {
        await saveTokenToDb(
            "osmosis",
            {
                id: asset.base,
                decimals: asset.denom_units.find(x => x.exponent > 0)?.exponent || asset.denom_units.at(-1)?.exponent!,
                ticker: asset.symbol,
                coingeckoId: asset.coingecko_id || ""
            });
    }
}

export const saveValidatorToDb = async (networkName: string, validatorInfo: { moniker: string, address: string }) => {
    let existingValidator = await getValidatorByAddressFromDb(networkName, validatorInfo.address);
    if (!!existingValidator &&
        validatorInfo.moniker === existingValidator.moniker &&
        validatorInfo.address === existingValidator.address)
        return;

    console.log(`Saving validator info ${JSON.stringify(validatorInfo)} into db for network ${networkName}`);
    await db.ref(`${networkName}/validators/${validatorInfo.address}`)
        .transaction(() => ({
            network: networkName,
            ...validatorInfo
        }));
}

export const getValidatorByAddressFromDb = async (networkName: string, address: string) => {
    let data = await db.ref<{ network: string, moniker: string, address: string }>(`${networkName}/validators/${address}`)
        .get();

    return data.val();
}
