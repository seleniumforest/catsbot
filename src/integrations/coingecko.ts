import { empty } from "@prisma/client/runtime/library";
import { getCoingeckoIds } from "../config";
import { prisma } from "../db";
import { TimeSpan } from "timespan-ts";

const baseUrl = "https://api.coingecko.com/api/v3";
const attempts = 3;
const validityPeriod = TimeSpan.fromMinutes(30).totalMilliseconds;

export async function pricesReady() {
    setInterval(updatePrices, 1000 * 60 * 5);
    await updatePrices();
}

const updatePrices = async () => {
    console.log("updating prices...");
    const allTrigerIds = await getCoingeckoIds();

    for (let _ of new Array(attempts)) {
        const url = `${baseUrl}/simple/price?ids=${allTrigerIds.join(",")}&vs_currencies=usd`;

        try {
            let resp = await fetch(url);
            if (resp.status != 200)
                return;

            let json = await resp.json() as any;
            console.log(json);
            for (const key of Object.keys(json)) {
                await prisma.price.upsert({
                    where: {
                        coingeckoId: key
                    },
                    create: {
                        coingeckoId: key,
                        priceUsd: json[key]?.["usd"],
                        savedDate: new Date()
                    },
                    update: {
                        priceUsd: json[key]?.["usd"],
                        savedDate: new Date()
                    }
                })
            }

            return;
        } catch (err) {
            console.log(`updatePrices error ${err}`);
            await new Promise(res => setTimeout(res, 60000));
        }
    }
}

export async function priceDump() {
    return await prisma.price.findMany();
}

export async function getCoingeckoIdPrice(coingeckoId: string) {
    let result = await prisma.price.findUnique({
        where: {
            coingeckoId,
            savedDate: {
                gt: new Date(Date.now() - validityPeriod)
            }
        }
    });

    return result?.priceUsd;
}

export async function getPriceByIdentifier(identifier?: string) {
    if (!identifier)
        return;

    let notifyDenom = await prisma.token.findFirst({
        where: { identifier }
    });

    if (!notifyDenom || !notifyDenom.coingeckoId)
        return;

    return await getCoingeckoIdPrice(notifyDenom.coingeckoId);
}

export async function getTickerPrice(ticker: string) {
    let notifyDenom = await prisma.token.findFirst({
        where: {
            ticker,
            AND: [
                {
                    coingeckoId: {
                        not: null
                    }
                },
                {
                    coingeckoId: {
                        not: ""
                    }
                }
            ]
        }
    });

    if (!notifyDenom || !notifyDenom.coingeckoId)
        return;

    return await getCoingeckoIdPrice(notifyDenom.coingeckoId);
}