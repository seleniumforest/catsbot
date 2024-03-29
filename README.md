# Whale Cat for Cosmos Cats

Cosmos cats community https://t.me/cosmoscats

Deployed version https://t.me/cosmos_whalecat

## Run bot

1. Rename config.example.json to config.json and 
    - specify env to "prod"
    - your telegram bot token 
    - @channel to send notifications
    - set env to "test" if you don't want to send notifications to telegram. Useful on switching environments.

1.1 - Config: you can assign custom amount for each denom by adding, also you can add any network presented in chain-registry. It will populated into db ONLY if notifydenom table is empty

```
"msgAmounts": {
    "msgSwapExactAmountInOut": 1000000000000000
}
```   

1.2 Alternatively, you can go to ```your_ip:5555```, find notifydenom table and edit triggers to notify.

**network** is network name, as mentioned in https://github.com/cosmos/chain-registry

**identifier** is a denom in that network or contract address

**amount** is a number of tokens multiplied by 10^decimals

**msg** is a trigger name (see below). If it's null, it means that amount relates to all other msg types.

Example: that means you assign 5 osmo for all actions, but you want to see delegates > 1 osmo and undelegates > 2 osmo

    osmosis | uosmo | 1000000 | msgDelegate

    osmosis | uosmo | 2000000 | msgUndelegate

    osmosis | uosmo | 5000000 | null
        
Supported msg types

        - msgSwapExactAmountInOut (osmosis in/out swaps)
        - msgDelegate    
        - msgExecuteContract (cw-20 send)
        - msgSend     
        - msgUndelegate
        - msgBeginRedelegate
        - msgJoinPool (osmosis add to pool)
        - msgExitPool (osmosis remove from pool)
        - msgCreatePosition (osmosis add to ranged pool)
        - msgWithdrawPosition (osmosis remove from ranged pool)
 
2. To run bot and studio
    
    ```sh 
    sudo apt install sqlite3
    yarn install 
    tsc
    npx prisma migrate dev
    pm2 start ecosystem.config.js
    ``` 

    - Or you can run it with `ts-node src/index`. To run studio use `npx prisma studio`
