import Big, { BigSource } from "big.js";
import { Registry } from "@cosmjs/proto-signing";
import { wasmTypes } from "@cosmjs/cosmwasm-stargate";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { osmosisProtoRegistry } from "osmojs";
import { prisma } from "./db";
import { CoinWithMetadata } from "./types";

export const fromBaseUnit = (amount: BigSource, decimals = 6) => {
    return Big(amount.toString().replace(",", ".")).div(Math.pow(10, decimals));
}

export const shortAddress = (addr: string, start = 9, end = 4) =>
    `${addr.slice(0, start)}...${addr.slice(addr.length - end, addr.length)}`;

export const registry = new Registry([
    ...wasmTypes,
    ...defaultRegistryTypes,
    ...osmosisProtoRegistry
]);

//splits 83927482ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2
//to meta
export const parseStringCoin = async (swappedCoin: string, returnDefault = false): Promise<CoinWithMetadata | undefined> => {
    let separatorIndex = Array.from(swappedCoin).findIndex(x => !Number.isInteger(parseInt(x)));

    let amount = swappedCoin.substring(0, separatorIndex);
    let denom = swappedCoin.substring(separatorIndex, swappedCoin.length);
    let infoResult = await prisma.token.findUnique({
        where: {
            network: "osmosis",
            identifier: denom
        }
    });

    if (!infoResult) {
        if (returnDefault) {
            return {
                amount,
                identifier: denom,
                decimals: 0,
                coingeckoId: "",
                id: 0,
                network: "",
                ticker: denom
            }
        }
        return;
    }

    return {
        amount,
        ...infoResult
    }
}