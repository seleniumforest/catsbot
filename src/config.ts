import { TimeSpan } from "timespan-ts";
import cfg from "../config.json";
import { prisma } from "./db";
import * as fs from 'fs';
import * as _ from "lodash";

export async function configReady() {
    const denomsCount = await prisma.notifyDenom.count();
    if (denomsCount === 0)
        await populateConfigIntoDb();

    setInterval(dumpConfig, TimeSpan.fromDays(1).totalMilliseconds);
    await dumpConfig();
    return true;
}

async function dumpConfig() {
    let denoms = await prisma.notifyDenom.findMany();
    fs.writeFileSync("./configDump.json", JSON.stringify(denoms, null, 4));
}

export function getConfig() {
    return cfg;
}

export async function getNetworks() {
    let networks = await prisma.notifyDenom.findMany({
        select: { network: true },
        distinct: ["network"]
    });

    return networks.filter(x => x.network).map(x => x.network);
}

export async function getCoingeckoIds() {
    let denoms = await prisma.notifyDenom.findMany({});
    let tokens = await prisma.token.findMany({});

    let result = denoms
        .map(x => tokens.find(t => t.identifier === x.identifier)?.coingeckoId)
        .filter(x => x);

    return [...new Set(result)];
}

export async function getNotifyDenomsWithMeta() {
    let denoms = await prisma.notifyDenom.findMany({});
    let tokens = await prisma.token.findMany({});

    return denoms.map(x => ({
        ...x,
        ...tokens.find(t => t.identifier === x.identifier)
    }))
}

async function populateConfigIntoDb() {
    let config = cfg as unknown as any;
    for (const network of config.networks) {
        for (const denomData of network.notifyDenoms) {
            if (!denomData.msgAmounts) {
                await prisma.notifyDenom.create({
                    data: {
                        network: network.name,
                        amount: denomData.amount.toString(),
                        identifier: denomData.identifier,
                    }
                })
                continue;
            }

            for (const msg of Object.entries(denomData.msgAmounts)) {
                if (!msg[0] || !msg[1]) {
                    throw new Error(`incorrect msg config in ${network.name}.msgAmounts section`);
                }

                await prisma.notifyDenom.create({
                    data: {
                        network: network.name,
                        amount: msg[1].toString(),
                        identifier: denomData.identifier,
                        msg: msg[0]
                    }
                })
            }

            await prisma.notifyDenom.create({
                data: {
                    network: network.name,
                    amount: denomData.amount.toString(),
                    identifier: denomData.identifier,
                }
            })
        }
    }
}

export async function getNotifyDenomConfig(network: string, denom: string, msgTrigger: MsgTypes) {
    let config = await prisma.notifyDenom.findMany({
        where: {
            network,
            identifier: denom
        }
    });

    let msgConfig = config.find(x => x.msg === msgTrigger) || config.find(x => x.msg === null);
    if (!msgConfig)
        return;

    let tokenInfo = await prisma.token.findUnique({
        where: {
            identifier: msgConfig.identifier
        }
    })
    if (!tokenInfo)
        return;

    return {
        identifier: tokenInfo.identifier,
        thresholdAmount: msgConfig.amount,
        ticker: tokenInfo.ticker,
        decimals: tokenInfo.decimals
    }
}

export type MsgTypes =
    "msgSwapExactAmountIn" |
    "msgDelegate" |
    "msgExecuteContract" |
    "msgSend" |
    "msgUndelegate" |
    "msgBeginRedelegate" |
    "msgSifchainSwap";