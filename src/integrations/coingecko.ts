import { getConfig } from "../config";
import { uniq } from "lodash";
import { prisma } from "../db";
import { TimeSpan } from "timespan-ts";

const config = getConfig();
const baseUrl = "https://api.coingecko.com/api/v3";
const attempts = 3;
const validityPeriod = TimeSpan.fromMinutes(30).totalMilliseconds;

export async function pricesReady() {
    setInterval(updatePrices, 1000 * 60 * 5);
    await updatePrices();
}

const updatePrices = async () => {
    console.log("updating prices...");
    const allTrigerTickers = uniq(config.networks
        .flatMap(x => x.notifyDenoms)
        .map(x => x.coingeckoId)
        .filter(x => x));

    for (let _ of new Array(attempts)) {
        const url = `${baseUrl}/simple/price?ids=${allTrigerTickers.join(",")}&vs_currencies=usd`;

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

    return result;
}

export async function getTickerPrice(ticker: string) {
    let notifyDenom = config.networks
        .flatMap(x => x.notifyDenoms)
        .find(x => x.ticker === ticker);

    if (!notifyDenom || !notifyDenom.coingeckoId)
        return;

    return (await getCoingeckoIdPrice(notifyDenom.coingeckoId))?.priceUsd;
}