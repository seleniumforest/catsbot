module.exports = {
    apps: [{
        name: "catsbot",
        script: "./build/src/index.js",
        args: "--clean=false",
        error_file: "catsbot-err.log",
        out_file: "catsbot-out.log"
    }]
}
