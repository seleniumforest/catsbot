import osmosisAssets from "../chain-specific/osmosis/osmosis-1.assetlist.json";
import type { Token } from '@prisma/client'
import { prisma } from '../db';
import { TimeSpan } from "timespan-ts";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { getConfig } from "../config";
import { NetworkManager } from "cosmos-indexer";

export type TokenInfo = Omit<Token, "id">;

export const tokenListsReady = async () => {
    console.log("syncing token lists...");
    setInterval(loadOsmosisTokensFromGithubToDb, TimeSpan.fromDays(1).totalMilliseconds);
    return await loadOsmosisTokensFromGithubToDb() || await loadOsmosisTokensFromLocalFileToDb();
}

export const saveTokenToDb = async (network: string, token: TokenInfo) => {
    await prisma.token.upsert({
        where: {
            identifier: token.identifier
        },
        update: {},
        create: {
            ...token,
            network
        }
    })
}

export const loadOsmosisTokensFromLocalFileToDb = async () => {
    try {
        for (let asset of osmosisAssets.assets) {
            await prisma.token.upsert({
                where: {
                    identifier: asset.base
                },
                update: {},
                create: mapAsset(asset)
            })
        };
        return true;
    } catch (err: any) {
        console.log(`Cannot sync tokens with local file ${err}`);
    }

    return false;
}

export const loadOsmosisTokensFromGithubToDb = async () => {
    //try fetch from github
    try {
        console.log("searchInfoByDenom: trying to fetch from github");
        let url = "https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json";
        let response = await fetch(url);
        let githubTokensData = await response.json() as any;

        for (let asset of githubTokensData.assets)
            await saveTokenToDb("osmosis", mapAsset(asset));

        return true;
    } catch (err: any) {
        console.log(`Cannot sync tokens with Github ${err}`);
    }

    return false;
}

const mapAsset = (asset: any): TokenInfo => {
    return {
        identifier: asset.base,
        decimals: asset.denom_units.find((x: any) => x.exponent > 0)?.exponent || asset.denom_units.at(-1)?.exponent!,
        ticker: asset.symbol,
        coingeckoId: asset.coingecko_id || "",
        network: "osmosis"
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
    let coingeckoId = getConfig().networks
        .find(x => x.name === network)?.notifyDenoms
        .find(x => x.contract === contract)?.coingeckoId || "";

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