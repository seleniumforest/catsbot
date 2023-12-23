import Big, { BigSource } from "big.js";
import { Registry } from "@cosmjs/proto-signing";
import { wasmTypes } from "@cosmjs/cosmwasm-stargate";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { osmosisProtoRegistry } from "osmojs";

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