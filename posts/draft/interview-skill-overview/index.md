---
date: "2021-01-22"
title: "面试常见知识点收集"
tags: ['fe']
abstract: ''
requirements: [
]
---

## 前言

本文专门收集不专门出文章写的常见面试知识点。这些知识点网上已经有非常多的资料，没有必要再专门出文章写，因此本文会以解释面试考题出现的原因（若笔者了解）、要点并贴详细资料文章链接的方式呈现。  

## Vue 相关

### Proxy vs Object.defineProperty

Vue 使用 双向绑定 实现数据监听，Vue2 使用 `Object.defineProperty` 实现，Vue3 使用 `Proxy` 实现，这两个 API 的对比问题就此而来。  

简单来说：

- `Object.defineProperty`：面向属性，需要遍历对象的每一个属性，只能监听对象已有属性，性能较差；  
- `Proxy`：面向对象，可以检测新增属性，对不存在的属性的访问等，性能较好；  

更多见：  

- [面试官: 实现双向绑定Proxy比defineproperty优劣如何? ](https://juejin.cn/post/6844903601416978439)  

## Node 相关

### Express 与 Koa 的不同  

更多见：

| --  | Koa | Express |
| --  | -- | -- |
| 中间件 | 洋葱圈模型，基于 Promise | 线性模型，基于回调 |  


## 其他

### 移动端 1px 细线问题  

C 端要求精细，设计稿需要近乎 100% 还原，随着高清屏 (Retina 屏) 的出现，开发过程中经常出现高清屏 1px 线比设计稿中的更粗的问题，此面试题就此而来。  

出现 1px 细线的原因：设置 `<meta name="viewport" width="device-width" ...>` 时，`device-width` 实际上是 visual viewport 的宽度而不是设备实际宽度，在高清屏下一般比设备宽度小，因此实际绘制到屏幕时会被缩放，看到的 1px 线会更粗。  

常见解决方案：

| 方案核心 | 缺点 |  
| -- | -- |  
| media query + 小数 px | 兼容性问题，低版本 IOS 等不支持 |  
| border-image | 修改圆角、颜色等麻烦 |  
| transform + ::before/::after | 代码量大，占据伪元素，存在不支持伪元素的元素（如 `input` 等） |  
| 通过读取 `window.devicePixelRatio` 设置 viewport 使 layout viewport 与 ideal viewport 相同 | 不适用于安卓 |  

更多见：

- [移动前端开发之viewport的深入理解](https://www.cnblogs.com/2050/p/3877280.html)  
- [移动端1px细线解决方案总结](https://www.cnblogs.com/lunarorbitx/p/5287309.html)  
- [CSS3 border-image 彻底明白](https://segmentfault.com/a/1190000010969367)  
