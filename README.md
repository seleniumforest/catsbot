# catsbot for Cosmos Cats

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

        - msgSwapExactAmountIn
        - msgDelegate    
        - msgExecuteContract      
        - msgSend     
        - msgUndelegate

 
2. Run ``` pm2 start ecosystem.config.js ``` to run script on all networks
  - If you want to start solo network, please add arg with name specified in config 
  
      ``` pm2 start ecosystem.config.js --network=cosmos ```
      
  - If your script was offline for a long time, you can skip checking missed blocks  
  
      ``` pm2 start ecosystem.config.js --network=cosmos --clean=true ```
      
## Monitoring

  - Show stats 
  
      ``` pm2 list ```
      
  - Show logs stored in ~/.pm2/logs/
  
      ``` pm2 logs ```

## Roadmap

- [x] Osmosis whale swaps
- [x] Custom amounts for each message on each denom
- [ ] Show Prices in USD
- [ ] Add Secret network
- [ ] Add IBC-txs
