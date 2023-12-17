import Big, { BigSource } from "big.js";
import { Token, getTokenByDenomFromDb, getValidatorByAddressFromDb, saveTokenToDb, saveValidatorToDb } from "./db";
import axios from "axios";
import { NetworkManager } from "cosmos-indexer";
import { Registry } from "@cosmjs/proto-signing";
import { CosmWasmClient, wasmTypes } from "@cosmjs/cosmwasm-stargate";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { osmosisProtoRegistry } from "osmojs";
import { getConfig } from "./config";

export const fromBaseUnit = (amount: BigSource, decimals = 6) => {
    return Big(amount.toString().replace(",", ".")).div(Math.pow(10, decimals));
}

export const shortAddress = (addr: string, start = 9, end = 4) =>
    `${addr.slice(0, start)}...${addr.slice(addr.length - end, addr.length)}`;

//symbol "/" is part of the path for acebase, so we need to trim this 
export const removeBackslash = (denom: string) => {
    return denom.replaceAll("/", "");
}

export const getValidatorMoniker = async (network: string, validatorAddress: string) => {
    let targetProfile = await getValidatorByAddressFromDb(network, validatorAddress);
    if (targetProfile)
        return targetProfile.moniker;

    let fetchedProfile = await fetchValidatorInfo(network, validatorAddress);
    if (!fetchedProfile)
        return shortAddress(validatorAddress);

    await saveValidatorToDb(network, fetchedProfile);
    targetProfile = fetchedProfile;

    return targetProfile?.moniker || shortAddress(validatorAddress);
}


export const fetchValidatorInfo = async (network: string, valoperAddress: string) => {
    let chainInfo = await NetworkManager.getChainInfo(network);
    let endpoints = chainInfo.apis?.rest;
    if (!endpoints)
        return;

    for (let { address } of endpoints) {
        try {
            let url = `${address}/cosmos/staking/v1beta1/validators/${valoperAddress}`;
            let response = await axios.get(url);
            let moniker = response?.data?.validator?.description?.moniker;

            if (moniker)
                return {
                    moniker,
                    network: network,
                    address: valoperAddress
                }

        } catch (err) { console.warn(`Failed to fetch moniker for ${valoperAddress}`) }
    }
}

export const getCw20TokenInfo = async (network: string, contract: string) => {
    let savedToken = await getTokenByDenomFromDb(network, contract);
    if (savedToken)
        return savedToken;

    console.log(`Fetching token on ${network} ${contract}`);
    let chainInfo = await NetworkManager.getChainInfo(network);
    let endpoints = chainInfo.apis?.rpc;
    if (!endpoints)
        return;

    let result: Token | null = null;
    let coingeckoId = getConfig().networks
        .find(x => x.name === network)?.notifyDenoms
        .find(x => x.contract === contract)?.coingeckoId || "";

    for (const { address } of endpoints) {
        try {
            let client = await CosmWasmClient.connect(address);
            let info = await client.queryContractSmart(contract, { "token_info": {} });
            result = {
                id: contract,
                decimals: info.decimals,
                ticker: info.symbol,
                coingeckoId
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


export const registry = new Registry([
    ...wasmTypes,
    ...defaultRegistryTypes,
    ...osmosisProtoRegistry
]);