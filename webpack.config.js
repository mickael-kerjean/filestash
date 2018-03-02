const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

let config = {
    entry: {
        polyfill: 'babel-polyfill',
        app: path.join(__dirname, 'client', 'index.js')
    },
    output: {
        path: path.join(__dirname, 'server', 'public'),
        publicPath: '/',
        filename: 'js/[name].js',
        chunkFilename: "js/chunk.[name].[id].js"
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
        })
    ]
};



if(process.env.NODE_ENV === 'production'){
    config.plugins.push(new webpack.optimize.UglifyJsPlugin());
}else{
    config.devtool = '#inline-source-map';
    config.devServer = {
        contentBase: path.join(__dirname, "server", "public"),
        disableHostCheck: true,
        hot: true,
        historyApiFallback: {
            index: 'index.html'
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000'
            }
        }
    };
}

module.exports = config;
