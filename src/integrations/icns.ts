import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { NetworkManager } from "cosmos-indexer";

const icnsResolverContract = "osmo1xk0s8xgktn9x5vwcgtjdxqzadg88fgn33p8u9cnpdxwemvxscvast52cdd";

export const resolveAddressToIcns = async (address: string) => {
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