module.exports = {
  apps : [{
    name   : "app1",
    script : "./src/index.js",
    args: "--clean=false",
    cron_restart: "0 * * * *"
  }]
}
