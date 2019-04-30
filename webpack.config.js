const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');


let config = {
    entry: {
        app: path.join(__dirname, 'client', 'index.js')
    },
    output: {
        path: path.join(__dirname, 'dist', 'data', 'public'),
        publicPath: '/',
        filename: 'assets/js/[name]_[chunkhash].js',
        chunkFilename: "assets/js/chunk_[name]_[id]_[chunkhash].js"
    },
    module: {
        rules: [{
                test: path.join(__dirname, 'client'),
                use: ['babel-loader'],
                exclude: /node_modules/
            },
            {
                test: /\.html$/,
                loader: 'html-loader'
            },
            {
                test: /\.woff2$/,
                loader: 'woff-loader'
            },
            {
                test: /\.scss$/,
                loaders: ['style-loader', 'css-loader', 'sass-loader']
            },
            {
                test: /\.css$/,
                loaders: ['style-loader', 'css-loader']
            },
            {
                test: /\.(pdf|jpg|png|gif|svg|ico|woff|woff2|eot|ttf)$/,
                loader: "url-loader"
            },
            {
                test: /[a-z]+\.worker\.js$/,
                loader: "worker-loader",
                options: { name: 'assets/js/[name]_[hash].js' }
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
        }),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'client', 'index.html'),
            inject: true
        }),
        new CopyWebpackPlugin([
            { from: 'manifest.json', to: "assets/" },
            { from: 'worker/*.js', to: "assets/" },
            { from: 'assets/logo/*' },
            { from: 'assets/icons/*' },
            { from: 'assets/fonts/*' }
        ], { context: path.join(__dirname, 'client') }),
        //new BundleAnalyzerPlugin()
    ]
};


if (process.env.NODE_ENV === 'production') {
    config.plugins.push(new UglifyJSPlugin({
        sourceMap: false
    }));
    config.plugins.push(new CompressionPlugin({
        asset: "[path].gz[query]",
        algorithm: "gzip",
        test: /\.js$|\.json$|\.html$/,
        threshold: 0,
        minRatio: 0.8
    }));
} else {
    config.devtool = '#inline-source-map';
}

module.exports = config;
