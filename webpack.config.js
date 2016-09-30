var production = process.env.NODE_ENV == 'prod';

var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var extractCss = new ExtractTextPlugin('dist.css');
module.exports = {
  devtool: production ? false : 'eval',
  entry: './src/main.jsx',
  output: {
    path: __dirname + '/dist',
    filename: 'dist.js'
  },
  resolve: {
    extensions: ['', '.js', '.jsx', '.less', '.css', '.json'],
    modulesDirectories: ['node_modules'],

    alias: {
      'src': path.join(__dirname, 'src'),
      'lib': path.join(__dirname, 'lib'),
      'res': path.join(__dirname, 'res')
    }
  },
  module: {
    loaders: [
      {
        test: /\.jsx$/,
        loader: 'babel-loader',
        query: {
          presets: [ 'es2015' ],
          plugins: [ 'mjsx' ]
        }
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.less$/,
        loader: extractCss.extract('style-loader', 'css-loader?minimize!less-loader')
      },
      {
        test: /\.css$/,
        loader: extractCss.extract('style-loader', 'css-loader?minimize')
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loaders: [
          'base64-prefix-loader?dataPrefix',
          'image-webpack-loader?bypassOnDebug&optimizationLevel=7&interlaced=false'
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      cache: false,
      template: production ? 'res/html/index.ejs' : 'res/html/index.html',
      filename: __dirname + '/dist/torque-helper.html',
      minify: {
        collapseBooleanAttributes: true,
        collapseInlineTagWhitespace: true,
        collapseWhitespace: true,
        removeComments: true,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true,
      }
    }),
    production && new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false }
    }),
    extractCss
  ].filter(x => x)
};