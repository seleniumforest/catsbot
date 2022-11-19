const db = require("./db.js");
const { saveProcessedBlock, getLastProcessedBlock } = require("./blocks");
const { populateTokensIntoDb, saveToken, getTokenByDenom } = require("./tokens.js");
const { saveValidator, getValidatorByAddress } = require("./validators.js");

const dbReady = async () => {
    await db.ready();
    await populateTokensIntoDb();
}

module.exports = {
    dbReady,
    saveProcessedBlock,
    getLastProcessedBlock,
    saveValidator,
    getValidatorByAddress,
    saveToken,
    getTokenByDenom,
}