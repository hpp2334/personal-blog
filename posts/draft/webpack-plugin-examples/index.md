---
date: "2021-01-22"
title: "若干个 Webpack 插件例子"
tags: ['fe', 'webpack']
abstract: '本文通过编写一些'
requirements: [
  '使用过 webpack'
]
---

## 环境

- webpack: 5.16.0

## 例子

### 删除某些 if 分支

在某些情况下，在打包时希望删除某些 if 分支，如 `if(DEV)`，以达到性能优化与减小打包体积的目的。  

### 简易的 HTML Plugin

可以实现一个简易的 [HtmlWebpackPlugin](https://webpack.js.org/plugins/html-webpack-plugin/) 将生成的 script 插入到模板 html 中。  

