import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const dbReady = async () => {
    console.log("checking db...");
    let [dbStatus] = await prisma.$queryRaw<any>`SELECT 1`;
    if (dbStatus[1] !== BigInt(1))
        throw new Error("db is not ready");

    return true;
}