const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');



let config = {
    entry: {
        polyfill: 'babel-polyfill',
        app: path.join(__dirname, 'client', 'index.js')
    },
    output: {
        path: path.join(__dirname, 'dist', 'data', 'public'),
        publicPath: '/',
        filename: 'assets/js/[name].js',
        chunkFilename: "assets/js/chunk.[name].[id].js"
    },
    module: {
        rules: [
            {
                test: path.join(__dirname, 'client'),
                use: ['babel-loader'],
                exclude: /node_modules/
            },
            {
                test: /\.html$/,
                loader: 'html-loader'
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
            inject:true
        }),
        new CopyWebpackPlugin([
            { from: 'client/manifest.json', to: 'assets/', context: "" },
            { from: 'client/worker/*.js', to: 'assets/worker/', context: "" },
            { from: 'client/assets/logo/*', to: 'assets/logo', context: "" }
        ])
        //new BundleAnalyzerPlugin()
    ]
};


if(process.env.NODE_ENV === 'production'){
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
)

}else{
    config.devtool = '#inline-source-map';
}

module.exports = config;
