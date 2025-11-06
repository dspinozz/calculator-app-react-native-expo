const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Add Node.js polyfills for sql.js and crypto dependencies
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "path": require.resolve("path-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "vm": require.resolve("vm-browserify"),
    "fs": false,
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
    "worker_threads": path.resolve(__dirname, 'webpack-worker-threads-stub.js'),
  };
  
  // Replace expo-sqlite with stub for web (web uses sql.js)
  const stubPath = path.resolve(__dirname, 'webpack-expo-sqlite-stub.js');
  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new webpack.NormalModuleReplacementPlugin(
      /^expo-sqlite$/,
      stubPath
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^drizzle-orm\/expo-sqlite$/,
      path.resolve(__dirname, 'webpack-drizzle-expo-stub.js')
    ),
  ];
  
  // Handle WASM files for sql.js - use asset/resource to preserve binary format
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'asset/resource',
    generator: {
      filename: 'static/wasm/[name][ext]',
    },
  });
  
  // Handle image assets
  config.module.rules.push({
    test: /\.(png|jpe?g|gif|svg)$/i,
    type: 'asset/resource',
  });
  
  // Ignore sql.js worker files that try to use worker_threads
  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /worker\.sql-(wasm|asm)\.js$/,
    })
  );
  
  return config;
};
