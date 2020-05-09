const DebuggerPlugin = require("./plugins/debugger");
const path = require("path");

module.exports = {
    entry: { "./src/index": "./src/index.js", "./src/index2": "./src/index2.js" },
    // We'll eventually want sourcemaps to work with this, but tbh not just yet.
    devtool: false,
    output: {
        path: path.resolve(__dirname, "dist"),
        // filename: "[name].[contenthash].js",
        filename: "[name].js",
    },
    // Maybe set this to "none" so that we start with no explicit optimization
    mode: "development",
    plugins: [new DebuggerPlugin({ emitHookComments: false, logHookArgs: false })],
    optimization: {
        // This implements scope hoisting. It generally improves speed, but it
        // makes it hard to reuse modules between bundles since they may be
        // "exported" under different variable names. We'll get there, but maybe
        // let's not start here.
        concatenateModules: false,
        // Maybe this'll make it easier to identify and detect modules. Plus, if
        // we're trying to deduplicate modules between builds, then we should try
        // to deduplicate ther untime too. It may also make it easier to add module
        // identifiers while still being able to minify the resulting bundle idk who
        // knows.
        runtimeChunk: { name: "runtime" },
    },
};
