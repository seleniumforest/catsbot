# Whale Cat for Cosmos Cats

Cosmos cats community https://t.me/cosmoscats

Deployed version https://t.me/cosmos_whalecat

## Run script

0. Run ``` yarn install ```

1. Rename config.example.json to config.json and specify env to prod, your telegram bot token and channel to send notifications
    
    - Set env to any other value if you don't want to send notifications to telegram. Useful on switching environments.

```

{
    "env": "prod",
    "token": "1231231212:Qwertyuiopasdfghjkl;xcvbnm1234567890",
    "channel": "@username",
    ...
}

```


1.1 - You can assign custom amount for each denom by adding 

```
"msgAmounts": {
    "msgSwapExactAmountIn": 1000000000000000
}
```
        
        
Supported msg types

        - msgSwapExactAmountIn (osmosis swaps)
        - msgDelegate    
        - msgExecuteContract      
        - msgSend     
        - msgUndelegate
        - msgBeginRedelegate
 
2. Run ``` pm2 start ecosystem.config.js ``` to run bot. Or you can run it with `ts-node src/index`
      
## Monitoring

    Monitoring page loads on 3000 port

  - Show stats 
  
      ``` pm2 list ```
      
  - Show logs stored in ~/.pm2/logs/
  
      ``` pm2 logs ```
