import { NetworkManager } from "cosmos-indexer";
import { shortAddress } from "../helpers";
import { prisma } from "../db";
import { TimeSpan } from "timespan-ts";

export const getValidatorMoniker = async (network: string, validatorAddress: string) => {
    let targetProfile = await prisma.validator.findUnique({
        where: {
            address: validatorAddress,
            network,
            savedDate: {
                gt: new Date(Date.now() - TimeSpan.fromDays(30).totalMilliseconds)
            }
        }
    })
    if (targetProfile)
        return targetProfile.moniker;

    let fetchedProfile = await fetchValidatorInfo(network, validatorAddress);
    if (!fetchedProfile)
        return shortAddress(validatorAddress);

    console.log(`Saving validator info ${JSON.stringify(fetchedProfile)}`);
    await prisma.validator.upsert({
        where: {
            network,
            address: fetchedProfile.address
        },
        update: {
            moniker: fetchedProfile.moniker
        },
        create: {
            address: fetchedProfile.address,
            moniker: fetchedProfile.moniker,
            network,
            savedDate: new Date()
        }
    })

    return fetchedProfile.moniker || shortAddress(validatorAddress);
}


export const fetchValidatorInfo = async (network: string, valoperAddress: string) => {
    let chainInfo = await NetworkManager.getChainInfo(network);
    let endpoints = chainInfo.apis?.rest;
    if (!endpoints)
        return;

    for (let { address } of shuffleArray(endpoints)) {
        //for some reason queryclient withextensions setupstakingextensions isn't working
        try {
            let url = `${address}/cosmos/staking/v1beta1/validators/${valoperAddress}`;
            let response = await (await fetch(url)).json() as any;
            let moniker = response?.validator?.description?.moniker;
            if (!moniker)
                return;

            return {
                moniker,
                network: network,
                address: valoperAddress
            }

        } catch (err) { console.warn(`Failed to fetch moniker for ${valoperAddress} err ${err}`) }
    }
}

function shuffleArray(array: any[]) {
    return array
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}