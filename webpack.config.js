const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');



let config = {
    entry: [
        'babel-polyfill',
        path.join(__dirname, 'src', 'client.js')
    ],
    output: {
        path: path.join(__dirname, 'server', 'public'),
        publicPath: '/',
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            {
                test: path.join(__dirname, 'src'),
                loader: ['babel-loader']
            },
            {
                test: /\.html$/,
                loader: 'html-loader'
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
        }),
        new webpack.optimize.OccurrenceOrderPlugin(),
        new HtmlWebpackPlugin({
            template: __dirname + '/src/index.html',
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
    config.entry.push('webpack/hot/only-dev-server');
}



module.exports = config;
