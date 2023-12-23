import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { fromBech32 } from "@cosmjs/encoding";
import { NetworkManager } from "cosmos-indexer";
import { shortAddress } from "../helpers";

const icnsResolverContract = "osmo1xk0s8xgktn9x5vwcgtjdxqzadg88fgn33p8u9cnpdxwemvxscvast52cdd";

export const shortAddressWithIcns = async (addr: string, start = 9, end = 4) => {
    let short = shortAddress(addr, start, end);
    let icnsResult = await resolveAddressToIcns(addr);
    if (!icnsResult)
        return short;

    let prefix = fromBech32(addr).prefix;
    let name = icnsResult.names.find((x: string) => x.split(".")[1] === prefix);

    return name || icnsResult.primaryName || short || addr;
};

const resolveAddressToIcns = async (address: string) => {
    let chainInfo = await NetworkManager.getChainInfo("osmosis");
    let rpcs = chainInfo.apis?.rpc;
    if (!rpcs)
        return;

    for (const rpc of rpcs) {
        try {
            let client = await CosmWasmClient.connect(rpc.address);
            let info = await client.queryContractSmart(icnsResolverContract, { "icns_names": { address } });

            return {
                names: info.names,
                primaryName: info.primaryName
            };
        }
        catch (err) {
            console.log("failed to fetch icns info " + JSON.stringify(err));
        }
    }
}