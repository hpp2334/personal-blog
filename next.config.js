const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: false,
        __VUE_PROD_DEVTOOLS__: false,
      })
    );
    return config;
  },
  i18n: {
    locales: ['en', 'cn'],
    defaultLocale: 'cn',
    localeDetection: false,
  },
};

module.exports = nextConfig
