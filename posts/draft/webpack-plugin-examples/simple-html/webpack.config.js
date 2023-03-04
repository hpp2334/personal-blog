const path = require('path');
const { SimpleHTML } = require('./simple-html');

module.exports = {
  mode: 'development',
  entry: {
    index: path.resolve(__dirname, './inputs/index.js'),
    util: path.resolve(__dirname, './inputs/util.js'),
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
  },
  devtool: false,
  plugins: [
    new SimpleHTML(),
  ]
}
