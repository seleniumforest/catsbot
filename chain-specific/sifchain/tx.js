//extracted from compiled protobuf sources https://github.com/Sifchain/sifchain-ui (core/)
const { Reader } = require("protobufjs");

const Asset = {
    decode(input, length) {
        const reader = input instanceof Reader ? input : new Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = { symbol: "" };
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.symbol = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    }
}

module.exports = {
    msgSwap: {
        decode: (input, length) => {
            const reader = input instanceof Reader ? input : new Reader(input);
            let end = length === undefined ? reader.len : reader.pos + length;
            const message = {
                signer: "",
                sentAsset: undefined,
                receivedAsset: undefined,
                sentAmount: "",
                minReceivingAmount: "",
            };
            while (reader.pos < end) {
                const tag = reader.uint32();
                switch (tag >>> 3) {
                    case 1:
                        message.signer = reader.string();
                        break;
                    case 2:
                        message.sentAsset = Asset.decode(reader, reader.uint32());
                        break;
                    case 3:
                        message.receivedAsset = Asset.decode(reader, reader.uint32());
                        break;
                    case 4:
                        message.sentAmount = reader.string();
                        break;
                    case 5:
                        message.minReceivingAmount = reader.string();
                        break;
                    default:
                        reader.skipType(tag & 7);
                        break;
                }
            }
            return message;
        }
    }
}