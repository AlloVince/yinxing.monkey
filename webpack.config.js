const webpack = require('webpack');
const path = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    clean: false,
  },
  resolve: {
    alias: {
      // Ensure jQuery globals are available in plugins
      jquery: 'jquery/src/jquery',
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  watchOptions: {
    ignored: /node_modules/,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'ts-loader' }],
      },
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      },
    ],
  },
  plugins: [
    ...(process.env.NODE_ENV === 'production'
      ? [
          new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
          }),
        ]
      : []),
  ],
  devtool: 'source-map',
  // Don't warn about large bundle size — this is a userscript, not a web app
  performance: {
    hints: false,
  },
};
