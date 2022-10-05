const { default: axios } = require("axios");
const config = require("../../config.json");
const baseUrl = "https://api.coingecko.com/api/v3";
const attempts = 5;

const priceData = {
    prices: new Map(),
    lastUpdated: null
}

const updatePrices = async () => {
    const allTrigerTickers = config.networks
        .flatMap(x => x.notifyDenoms)
        .map(x => x.coingeckoId)
        .filter(x => x)
        .join(",");

    for (let _ of new Array(attempts)) {
        const url = `${baseUrl}/simple/price?ids=${allTrigerTickers}&vs_currencies=usd`;

        try {
            let { data } = await axios.get(url);
            priceData.lastUpdated = Date.now();
            Object.keys(data)
                .forEach(key => priceData.prices.set(key, data[key]?.["usd"]));

            console.log(priceData);
            break;
        } catch (err) { console.log(err) }
    }
}

setInterval(updatePrices, 1000 * 60 / 2);
updatePrices();

module.exports = priceData;