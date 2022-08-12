const { default: axios } = require("axios");
const { shortAddress } = require("./helpers");

const notifyMsgSend = async (from, to, denom, amount, txhash, network) => {
    await notify(`💲 #transfer 💲\nAddress ${shortAddress(from)} ` +
        `sent ${amount} ${denom} to ${shortAddress(to)}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyMsgDelegate = async (from, to, denom, amount, txhash, network) => {
    await notify(`🐳 #delegation 🐳\nAddress ${shortAddress(from)} ` +
        `delegated ${amount} ${denom} to ${to}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyMsgUndelegate = async (delegator, validator, denom, amount, txhash, network) => {
    await notify(`🦐 #undelegation 🦐\nAddress ${shortAddress(delegator)} ` +
        `undelegated ${amount} ${denom} from ${validator}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>Tx link</a>`);
}

const notifyCw20Transfer = async (sender, reciever, denom, amount, txhash, network) => {
    await notify(`💲 #tokentransfer 💲\nAddress ${shortAddress(sender)} ` +
        `transferred ${amount} ${denom} tokens to ${shortAddress(reciever)}. \n` +
        `<a href='https://www.mintscan.io/${network}/txs/${txhash}'>TX link</a>`);
}

const notify = async (message) => {
    await axios.post("http://localhost:3000/send", {
        message
    });
}

module.exports = {
    notifyMsgSend,
    notifyMsgDelegate,
    notifyMsgUndelegate,
    notifyCw20Transfer
};