const path = require("path");
const nodeExternals = require("webpack-node-externals");
const { ESBuildMinifyPlugin } = require("esbuild-loader");

module.exports = (env) => {
  let environment = "src/environment.json";
  if (env.prod) {
    environment = "src/environment.prod.json";
  } else if (env.staging) {
    environment = "src/environment.staging.json";
  } else if (env.beta) {
    environment = "src/environment.beta.json";
  }
  return {
    entry: "src/app.ts",
    module: {
      rules: [
        {
          test: /\.ts?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    target: "node",
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: {
        src: path.resolve(__dirname, "src"),
        [path.resolve(__dirname, "src/environment.json")]: path.resolve(__dirname, environment),
      },
    },
    optimization: {
      // ...
      minimizer: [
        new ESBuildMinifyPlugin({
          keepNames: true,
        }),
        // ...
      ],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: [nodeExternals()],
    output: {
      filename: "app.js",
      path: __dirname,
    },
  };
};
