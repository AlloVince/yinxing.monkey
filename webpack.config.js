const webpack = require('webpack');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: `${__dirname}/lib`,
    filename: 'index.js'
  },
  resolve: {
    alias: {
      //解决jQuery在插件中找不到全局变量的问题
      jquery: 'jquery/src/jquery'
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  watchOptions: {
    ignored: /node_modules/
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' }
        ]
      }
    ]
  },
  plugins: [].concat(process.env.NODE_ENV === 'production' ? [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ] : []),
  devtool: 'source-map'
};
