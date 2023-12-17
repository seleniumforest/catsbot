import config from "../config.json";

export function getConfig() {
    return config as unknown as Config;
}

export function getNotifyDenomConfig(network: string, denom: string, msgTrigger: MsgTypes) {
    let networkConfig = getConfig().networks.find(x => x.name === network);
    if (!networkConfig)
        return;

    let denomConfig = networkConfig.notifyDenoms.find(x => x.denom === denom || x.contract === denom);
    if (!denomConfig)
        return;

    let thresholdAmount = denomConfig?.msgAmounts?.[msgTrigger] || denomConfig.amount;

    return {
        thresholdAmount,
        ticker: denomConfig.ticker,
        decimals: denomConfig.decimals || 6
    }
}

export function getNotifyDenoms(network: string) {
    let conf = getConfig();
    return conf.networks.find(x => x.name === network)?.notifyDenoms;
}

export type Config = {
    env: string,
    token: string,
    channel: string,
    networks: Network[]
}

export type Network = {
    name: string
    notifyDenoms: NotifyDenom[]
}

export type NotifyDenom = {
    denom: string;
    ticker: string;
    coingeckoId: string;
    amount: string;
    decimals?: number;
    contract: string;
    msgAmounts?: Partial<Record<MsgTypes, string>>;
};

export type MsgTypes =
    "msgSwapExactAmountIn" |
    "msgDelegate" |
    "msgExecuteContract" |
    "msgSend" |
    "msgUndelegate" |
    "msgBeginRedelegate" |
    "msgSifchainSwap";