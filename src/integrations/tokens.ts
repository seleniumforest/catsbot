import type { Token } from '@prisma/client'
import { prisma } from '../db';
import { TimeSpan } from "timespan-ts";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { getConfig } from "../config";
import { NetworkManager } from "cosmos-indexer";
import { assets } from "chain-registry";
import osmoAssets from "../chain-specific/osmosis/osmosis-1.assetlist.json";

import type { Asset, AssetList } from "@chain-registry/types"

export type TokenInfo = Omit<Token, "id">;

export const tokenListsReady = async () => {
    console.log("syncing token lists...");
    setInterval(loadOsmosisTokensToDb, TimeSpan.fromDays(1).totalMilliseconds);
    await loadTokensFromLocalRegistryToDb();
    await loadOsmosisTokensToDb();
}

export const saveTokenToDb = async (network: string, token: TokenInfo) => {
    await prisma.token.upsert({
        where: {
            identifier: token.identifier
        },
        update: {
            coingeckoId: token.coingeckoId,
            ticker: token.ticker,
            decimals: token.decimals,
            identifier: token.identifier,
            network: token.network
        },
        create: {
            ...token,
            network
        }
    })
}

export const loadTokensFromLocalRegistryToDb = async () => {
    for (let asset of assets) {
        for (let a of asset.assets) {
            await prisma.token.upsert({
                where: {
                    identifier: a.base
                },
                update: {},
                create: mapAsset(a, asset.chain_name)
            })
        }
    };
    return true;
}

export const loadOsmosisTokensToDb = async () => {
    try {
        let url = "https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json";
        let response = await fetch(url);
        let json = await response.json() as AssetList;
        for (let asset of json.assets)
            await saveTokenToDb("osmosis", mapAsset(asset, "osmosis"));
    } catch (err: any) {
        console.warn(`Cannot sync tokens with Github ${err}`);
        for (let asset of osmoAssets.assets)
            await saveTokenToDb("osmosis", mapAsset(asset as Asset, "osmosis"));
    }
}

const mapAsset = (asset: Asset, network: string): TokenInfo => {
    let config = getConfig() as any;
    let coingeckoId = config.networks
        .flatMap((x: any) => x.notifyDenoms)
        .find((x: any) => x.identifier === asset.base)?.coingeckoId;

    return {
        identifier: asset.base,
        decimals: asset.denom_units.find((x: any) => x.exponent > 0)?.exponent || asset.denom_units.at(-1)?.exponent!,
        ticker: asset.symbol,
        coingeckoId: asset.coingecko_id || coingeckoId || "",
        network: network
    }
}

export const getCw20TokenInfo = async (network: string, contract: string) => {
    let savedToken = await prisma.token.findUnique({
        where: { identifier: contract }
    });
    if (savedToken)
        return savedToken;

    console.log(`Fetching token on ${network} ${contract}`);
    let chainInfo = await NetworkManager.getChainInfo(network);
    let endpoints = chainInfo.apis?.rpc;
    if (!endpoints)
        return;

    let result: TokenInfo | null = null;
    let coingeckoId = (getConfig() as any).networks
        .find((x: any) => x.name === network)?.notifyDenoms
        .find((x: any) => x.identifier === contract)?.coingeckoId || "";

    for (const { address } of endpoints) {
        try {
            let client = await CosmWasmClient.connect(address);
            let info = await client.queryContractSmart(contract, { "token_info": {} });
            result = {
                identifier: contract,
                decimals: info.decimals,
                ticker: info.symbol,
                coingeckoId,
                network
            };
            break;
        }
        catch (err) {
            console.log("failed to fetch cw20 token info " + JSON.stringify(err));
        }
    }

    if (!result)
        return;

    try {
        await saveTokenToDb(network, result);
    } catch (e) {
        console.log("failed saving token to Db" + JSON.stringify(e));
    }

    return result;
}