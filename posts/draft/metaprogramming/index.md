---
date: "2021-11-01"
title: "元编程"
tags: []
abstract: '元编程'
requirements: []
---


> [元编程](https://qiankunli.github.io/2020/02/17/meta_programming.html)  
> [元编程](https://zh.wikipedia.org/wiki/%E5%85%83%E7%BC%96%E7%A8%8B)  
> [反射式编程](https://zh.wikipedia.org/wiki/%E5%8F%8D%E5%B0%84%E5%BC%8F%E7%BC%96%E7%A8%8B)  
> [\[译\]深入理解 ES6 中的反射](https://juejin.cn/post/6844903511826645006)  

## 元编程

通俗的理解，元编程 (Metaprogramming) 指 “用代码产生代码” 的能力。

## 元编程的实现方式

### 基于宏 (Macro)

最典型的例子是 C/C++ 中的 `define`，如：  

```cpp
#define PI 3.14

void fn () {
  int circle = PI;
}
```

在编译期，被 `define` 的部分会以文本替换的方式直接展开编译。  

（另外一提，还有基于语法树的宏，如 Rust 的宏系统）  

### 基于范型

某些语言 （如 Rust） 的范型系统有静态分发的部分，则在编译期会按照传入的实际类型生成多份代码。  

### 基于反射

反射 (Reflection) 指程序在运行时可以访问、检测、修改它本身的状态或行为的一种能力。反射是元编程的实现方式之一，例子有：  

- `eval` 函数可以将字符串当作代码执行；  
- JavaScript 中的 `Object.keys`, `Obect.getOwnPropertyDescriptor` 等获取了对象的结构信息；  



