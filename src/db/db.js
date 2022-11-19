const { AceBase } = require('acebase');

module.exports = new AceBase(
    'catsdb',
    {
        logLevel: "warn",
        storage: { path: "./" }
    });
