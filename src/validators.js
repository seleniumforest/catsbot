const axios = require("axios");
const NodeCache = require("node-cache");
const log = require("./logger");

const validatorsCache = new NodeCache({
    stdTTL: 60 * 60 * 12 //12 hours in seconds
});

const getValidatorProfiles = async (network, fetchUrl) => {
    let cached = validatorsCache.get(network);
    if (cached) {
        console.log("found cached for " + network)
        return cached;
    }

    console.log("fetching for " + network)

    try {
        let profiles = await axios.get(fetchUrl, {
            headers: {
                "Origin": "https://www.mintscan.io",
                "Referer": "https://www.mintscan.io/"
            }
        });
        validatorsCache.set(network, profiles.data);
        return profiles.data;
    }
    catch (err) {
        log.error(JSON.stringify(err));
        return [];
    }
}

module.exports = {
    getValidatorProfiles
}