module.exports = {
    apps: [{
        name: "catsbot",
        script: "./build/index.js",
        args: "--clean=false",
        error_file: "catsbot-err.log",
        out_file: "catsbot-out.log"
    }]
}
