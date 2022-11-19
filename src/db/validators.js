const db = require("./db");

const saveValidator = async (networkName, validatorInfo) => {
    let existingValidator = await getValidatorByAddress(networkName, validatorInfo.address);
    if (!!existingValidator && 
        validatorInfo.moniker === existingValidator.moniker && 
        validatorInfo.address === existingValidator.address)
        return;

    console.log(`Saving validator info ${JSON.stringify(validatorInfo)} into db for network ${networkName}`);
    await db.ref(`${networkName}/${validatorInfo.address}`)
        .transaction(() => ({
            network: networkName,
            ...validatorInfo
        }));
}

const getValidatorByAddress = async (networkName, address) => {
    let data = await db.ref(`${networkName}/${address}`)
        .get();

    return data.val();
}

module.exports = {
    saveValidator,
    getValidatorByAddress
}