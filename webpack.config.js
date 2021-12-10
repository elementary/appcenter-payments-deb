const path = require('path')

module.exports = {
  target: 'webworker',
  devtool: 'cheap-module-source-map',

  entry: {
    bundle: path.join(__dirname, './src/worker.ts')
  },

  output: {
    filename: 'worker.js',
    path: path.join(__dirname, 'dist')
  },

  mode: process.env.NODE_ENV || 'development',

  watchOptions: {
    ignored: /node_modules|dist|\.js/g
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    plugins: []
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader'
      }
    ]
  }
}
