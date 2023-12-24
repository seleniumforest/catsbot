module.exports = {
    apps: [{
        name: "catsbot",
        script: "./build/src/index.js",
        error_file: "catsbot-err.log",
        out_file: "catsbot-out.log"
    }, {
        name: "db",
        script: "npm",
        args: "run db",
        error_file: "catsbot-dberr.log",
        out_file: "catsbot-db.log"
    }]
}
