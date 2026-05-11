const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const devCerts = require("office-addin-dev-certs");

module.exports = async (env, options) => {
  const dev = options.mode !== "production";
  const config = {
    devtool: "source-map",
    entry: {
      taskpane: "./src/taskpane/taskpane.js",
      commands: "./src/commands/commands.js"
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      clean: true
    },
    resolve: { extensions: [".js"] },
    module: {
      rules: [
        { test: /\.css$/, use: ["style-loader", "css-loader"] }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["taskpane"]
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["commands"]
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "assets", to: "assets", noErrorOnMissing: true }
        ]
      })
    ]
  };

  if (dev) {
    const httpsOptions = await devCerts.getHttpsServerOptions();
    config.devServer = {
      port: 3000,
      server: { type: "https", options: httpsOptions },
      headers: { "Access-Control-Allow-Origin": "*" },
      static: path.join(__dirname, "dist")
    };
  }

  return config;
};
