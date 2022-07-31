const big = require("big.js");

const fromBaseUnit = (amount, decimals = 6) => {
    if (!amount)
        return null;

    let demicrofied = big(amount.toString().replace(",", "."))
        .div(Math.pow(10, decimals))
        .toFixed();

    return demicrofied;
}

const toBaseUnit = (amount, decimals = 6) => {
    if (!amount)
        return null;

    let microfied = big(amount.toString().replace(",", "."))
        .mul(Math.pow(10, decimals))
        .toFixed();

    return microfied;
}

module.exports = {
    fromBaseUnit,
    toBaseUnit
}