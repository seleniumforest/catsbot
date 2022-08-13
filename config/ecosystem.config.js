module.exports = {
  apps: [{
    name: "server",
    script: "./src/server/server.js",
    env_prod: {
      NODE_ENV: "prod"
    },
    env_dev: {
      NODE_ENV: "dev" 
    }
  },
  {
    name: "cosmos",
    script: "./src/index.js",
    args: "--recovery=true --network=cosmos"
  },
  {
    name: "osmosis",
    script: "./src/index.js",
    args: "--recovery=true --network=osmosis"
  },
  {
    name: "juno",
    script: "./src/index.js",
    args: "--recovery=true --network=juno"
  },
  {
    name: "evmos",
    script: "./src/index.js",
    args: "--recovery=true --network=evmos"
  }]
}
