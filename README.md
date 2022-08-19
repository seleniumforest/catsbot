# catsbot for Cosmos Cats https://t.me/cosmoscats

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

- [ ] Osmosis whale swaps
- [ ] Show Prices in USD
- [ ] Add Secret network
- [ ] Add IBC-txs
