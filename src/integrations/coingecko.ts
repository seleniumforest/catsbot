import axios from "axios";
import { getConfig } from "../config";
import { uniq } from "lodash";

const config = getConfig();
const baseUrl = "https://api.coingecko.com/api/v3";
const attempts = 5;
const validityPeriod = 1000 * 60 * 30; //30 min
const priceData = new Map<string, { price: number, lastUpdated: number }>();

const updatePrices = async () => {
    const allTrigerTickers = uniq(config.networks
        .flatMap(x => x.notifyDenoms)
        .map(x => x.coingeckoId)
        .filter(x => x));

    for (let _ of new Array(attempts)) {
        const url = `${baseUrl}/simple/price?ids=${allTrigerTickers.join(",")}&vs_currencies=usd`;

        try {
            let { data } = await axios.get(url);
            Object.keys(data)
                .forEach(key => priceData.set(key, { price: data[key]?.["usd"], lastUpdated: Date.now() }))

            console.log(priceData);
            break;
        } catch (err) {
            console.log(err);
            await new Promise(res => setTimeout(res, 60000));
        }
    }
}

export function priceDump() {
    return [...priceData.entries()];
}

export function getCoingeckoIdPrice(coingeckoId: string) {
    let result = priceData.get(coingeckoId);
    if (!result)
        return;

    if (Date.now() - result.lastUpdated > validityPeriod)
        return;

    return result.price;
}

export function getTickerPrice(ticker: string) {
    let notifyDenom = config.networks
        .flatMap(x => x.notifyDenoms)
        .find(x => x.ticker === ticker);

    if (!notifyDenom || !notifyDenom.coingeckoId)
        return;

    return getCoingeckoIdPrice(notifyDenom.coingeckoId);
}

export function getDenomPrice(denom: string) {
    let notifyDenom = config.networks
        .flatMap(x => x.notifyDenoms)
        .find(x => x.denom === denom);

    if (!notifyDenom || !notifyDenom.coingeckoId)
        return;

    return getCoingeckoIdPrice(notifyDenom.coingeckoId);
}

setInterval(updatePrices, 1000 * 60 * 5);
updatePrices();