const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

/** Load .env file manually (avoid extra dependency). */
function loadEnv() {
  const env = {};
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key) env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const DEV_SERVER_URL = env.DEV_SERVER_URL || 'http://localhost:8080';

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'web',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    clean: false,
    publicPath: `${DEV_SERVER_URL}/`,
    chunkLoading: false,
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
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.DEV_SERVER_URL': JSON.stringify(DEV_SERVER_URL),
      'process.env.ENTRY_PARENT_ID': JSON.stringify(env.ENTRY_PARENT_ID || '1153737365202791679'),
      'process.env.VIDEO_TARGET_ID': JSON.stringify(env.VIDEO_TARGET_ID || '1214716263562079924'),
      'process.env.ISO_TARGET_ID': JSON.stringify(env.ISO_TARGET_ID || '1227621927028387453'),
      'process.env.METADATA_API_URL': JSON.stringify(env.METADATA_API_URL || 'https://yinxing.av2.us/v1/search'),
      'process.env.MOVIE_API_URL': JSON.stringify(env.MOVIE_API_URL || 'http://yinxing.com/v1/movies'),
    }),
  ],
  devtool: false,
  devServer:{
    headers:{
      "Access-Control-Allow-Origin":"*"
    }
  },
  // Don't warn about large bundle size — this is a userscript, not a web app
  performance: {
    hints: false,
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: false,
  },
};
