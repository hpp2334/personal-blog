---
date: "2021-03-28"
title: "前端动画"
tags: ['fe']
abstract: ''
requirements: []
---

> [深入理解前端动画](https://juejin.cn/post/6998503180128993288)  
> [CSS 对比 JavaScript 动画](https://developers.google.com/web/fundamentals/design-and-ux/animations/css-vs-javascript?hl=zh-cn)  

## 概述

前端动画目前常见的实现方式有：

- GIF 动图
- CSS `transition`, `@keyframes` + `animation` 等属性  
- JavaScript 动画
  - 控制 CSS `transform` 等属性
  - 通过 SVG / canvas
- Web Animations API (`element.animate` 等) (WD 中)  
- WebGL
- 基于流行库 animate\.css, TweenJS 等 (本质上依赖基础 API)  


## CSS 动画 vs JS 动画

简单来说：

- CSS 动画用于实现简单的 "一次性" 转换；  
- JS 动画用于实现相对复杂的动画；  


