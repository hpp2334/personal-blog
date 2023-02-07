---
date: "2021-01-22"
title: "前端状态管理"
tags: ['fe']
abstract: ''
requirements: [
]
---

## 参考

### 前端状态管理工具

[思考:我需要怎样的前端状态管理工具?](https://segmentfault.com/a/1190000007103433)  
[前端状态管理的历史回溯与思考](https://www.heyudesign.cn/documents/summary/statemanager)  

### 响应式编程

[5 分钟理解什么是“响应式编程（Reactive Programming）”](https://www.jianshu.com/p/035db36c5918)  
[响应式编程（Reactive Programming）介绍](https://zhuanlan.zhihu.com/p/27678951)  

## 一个前端状态管理工具/方案的要求

### 基本要求

笔者认为状态管理实际上只需要满足 3 点要求：

- get: 需要用到状态的地方有手段获取值；  
- set: 需要用到状态的地方有手段设置值；  
- notify：需要用到状态的地方有手段感知值被改变了；  

## 流行的状态管理工具

### Redux

