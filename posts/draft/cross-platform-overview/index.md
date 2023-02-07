---
date: "2021-11-10"
title: "前端跨端技术概述"
tags: ['fe']
abstract: ''
requirements: []
---

> [跨端方案的三大困境](http://www.ayqy.net/blog/cross-platform-pains/)  
> [React Native简史](http://www.ayqy.net/blog/the-history-of-react-native/)  
> [【深入解析】跨端框架的核心技术到底是什么？](https://segmentfault.com/a/1190000038286548)  

## 为什么使用跨端技术？

### 最初的出发点

- 快速迭代: 相比于 native，web 开发迭代更快；  
- 快速反馈: 支持热更新；  
- 快速开发: 无需重新编译，有 live reload, hot reload；  

本质上是为了更快速地迭代业务（加速 **生产效率**）。  

### Write Once, Run Everywhere

写一套代码，同时可在 Android, IOS 等平台运行。  

## 跨端方案

### Webview

> [webview到底是什么？](https://juejin.cn/post/6950890297450561550)  

Webview 是用于显示 Web 内容的容器，由平台 (Android, IOS 等) 提供。因此此方案本质上是将网页插入到 native 中。  

此方案还有一些常见的问题与主流解决方案如下: 

- 与 native 通信: 一般使用 JSBridge
- 性能优化:
  - 缓存: 将 web 资源预先在 native 缓存，加载时 native 拦截网络请求并重定向到本地路径 (离线包方案)；  
  - 预热: 提前初始化 Webview；  
  - 替换: 使用 native 组件替换某些 web 组件 (如 `img`, `video`)  

### React Native

