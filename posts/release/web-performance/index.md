---
date: "2022-02-23"
title: "前端性能指标与优化方法"
tags: ["fe"]
abstract: "本文简述前端性能指标与常用的优化方法"
requirements: []
references:
  [
    ["web.dev", "https://web.dev/"],
    ["User-centric performance metrics", "https://web.dev/user-centric-performance-metrics/#in-the-lab"],
  ]
---

## 前言

本文将简要地介绍前端性能指标与常用的优化方法，更多细节请读者自行根据关键字 Google。

## 指标

Google 提倡以 **用户体验** 为中心，提出了以下性能衡量指标：

- First contentful paint (FCP): 页面加载 到 页面有任意内容出现 的时间；
- Largest contentful paint (LCP): 页面加载 到 页面中最大的文本块或图片元素出现 的时间；
- First input delay (FID): 用户触发输入控件交互 到 控件响应交互 的时间；
- Time to Interactive (TTI): 页面加载 到 可交互 的时间 （并不是出现输入控件就可以交互，尤其是在 SSR 的场景下）；
- Total blocking time (TBT): FCP 到 TTI 主线程被阻塞 的时间；
- Cumulative layout shift (CLS): 页面从开始加载到隐藏过程中，发生的所有意外的布局偏移分数；

Chrome 浏览器自带的 `Lighthouse` 工具可以自动分析上述绝大部分指标。

## 优化方法

以下仅列举优化方法并简要说明要点，更多细节可在 [web.dev](web.dev) 上找到。

### 服务器

- 传输压缩：如 gzip；
- CDN：使用 CDN 优化延迟与传输效率；
- HTTP/2：使用 HTTP/2 传输小文件；
- 协商缓存：根据传入的 HTTP 头中的 `If-None-Match` 做协商缓存；

### 资产 (文件资源)

- 文件压缩：对 JavaScript、CSS 等文件进行压缩，包括去除不影响编译的字符（如空格、空行）、Tree Shaking 等，如使用 `Terser`；
- 更合适的文件编码：如图片选择 `.webp`；

### 客户端

#### 连接

- 尽早建立连接：使用 `<link rel="preconnect" href="..." />` 尽早建立连接；
- DNS 预连接：使用 `<link rel="dns-prefetch" href="..." />` 尽早解析 href 域名对应的 IP 地址；

#### 加载

- JavaScript 按需加载：构建时将 JavaScript 分为多个 chunk，当相关模块需要时才异步加载；
- 非阻塞加载非关键资源：如 loadCSS 项目，`<script defer src="..."></script>` 延迟加载 JavaScript；
- 预加载关键资源：使用 `<link rel="preload" as="..." href="..." />`；
- 强缓存：通过 `Cache-Control`/`Expires` 控制浏览器端强缓存；
- 使用 Service Worker 离线加载资源；
- 使用 SSR/Prerender：使用服务端渲染/预渲染降低 FCP，但会提高 TTI；

#### JavaScript 优化

- 使用 Web Worker 计算大运算量任务；
- 使用 WASM 优化；
- 分割长任务：避免因 JavaScript 执行时间过长造成的主线程明显阻塞，如 React 框架下对 Fiber 执行任务的调度算法；

## 工程优化手段

工程上一般使用工具或框架实践上述优化方法，如：

- 使用 SSR：使用 Next.js, Gatsby 等框架；
- JavaScript 按需加载：在 Webpack 中可通过 `import()` 实现，JavaScript 分割与动态加载由 Webpack 完成；
- DNS 预连接：使用 `@vue/preload-webpack-plugin` Webpack 插件；
- ...
