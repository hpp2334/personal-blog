const path = require('path');
const { RemoveIf } = require('./remove-if');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, './input.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'output.js',
  },
  devtool: false,
  plugins: [
    new RemoveIf({
      condition: 'IN_DEV',
    })
  ]
}
