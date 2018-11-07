const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

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
    //必须加这一行，否则会报 Module not found: Error: Can't resolve XXX， 因为默认import只会处理js扩展名的文件
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
            loader: 'awesome-typescript-loader',
            options: {
              useBabel: true,
              babelCore: '@babel/core',
              babelOptions: {
                babelrc: true
              }
            }
          },
          'source-map-loader'
        ]
      },
      {
        test: /\.jsx?$/,
        use: [
          {
            loader: 'babel-loader'
          },
          'source-map-loader'
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
    new UglifyJSPlugin({
      sourceMap: true,
      parallel: true,
      uglifyOptions: {
        compress: true
      }
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ] : []),
  devtool: 'source-map'
};
