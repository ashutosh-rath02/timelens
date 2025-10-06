const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  target: "electron-renderer",
  mode: process.env.NODE_ENV || "development",
  entry: "./src/renderer/index.js",
  output: {
    filename: "renderer.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "./",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html",
      filename: "index.html",
    }),
  ],
  resolve: {
    extensions: [".js", ".jsx"],
    fallback: {
      path: false,
      fs: false,
    },
  },
  devServer: {
    static: path.join(__dirname, "dist"),
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
  experiments: {
    topLevelAwait: true,
  },
  optimization: {
    splitChunks: false,
  },
  externals: {
    "better-sqlite3": "commonjs better-sqlite3",
    "fluent-ffmpeg": "commonjs fluent-ffmpeg",
  },
};
