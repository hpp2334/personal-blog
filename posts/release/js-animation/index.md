import { JsAnimiationLibraryDemo } from "./js-animation-library-demo"

## 前言

本文阐述了前端动画主流实现方式之一的 JavaScript 动画实现的要点，并通过学习 anime.js，编写一个较小的 JavaScript 动画库以加深对其的理解。

## 工作原理

不比于编写 CSS 动画使用声明式 API，JavaScript 实现动画使用过程式编程，并且动画过程完全由开发者自己控制，需要了解动画基本原理。

### 高频率播放帧

动画是由一帧帧画面高频率顺序播放组成的，理论上当播放频率 >= 24 pfs 时人可以感觉到动画是流畅的。若能高频率的调用函数，且在函数中改变元素属性，此时每次调用结束后的画面则可以视为一帧，整体可视为播放动画。

[`requestAnimationFrame(callback)`](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame) API 属于 nextTick 函数的一种，一般能达到 1s 调用 60 次，常被用于 JavaScript 动画中（当然，顾名思义，即是播放动画帧的意思），浏览器会在重绘前调用 `callback` 以达到播放动画帧的效果。

### 可被动画的部分

不同于 CSS 动画只有一部分 CSS 属性可被动画，JavaScript 动画是直接操控函数的，可以认为所有函数可操作的都是可被动画的。因此，可以被动画的部分包括但不限于：

- CSS 属性: 如 `color`, `translateX`；
- DOM 属性: 如元素值从 0.0 变化到 100.0；
- 新增 DOM 元素: 如每隔 1s 加入一个三角形；
- ...

## 声明式动画库

尽管 JavaScript 动画非常强大，但过程式编程使得其使用起来较为麻烦。对于一般的场景，开发者更倾向于使用声明式 API 创建动画效果。

### 声明式 API

可以参考 CSS 的 `animation` 属性与 anime.js 库给出声明式 API 支持的一般属性：

- 被动画元素
- 属性及其最终值
- timing function
- 时长
- 延时
- 播放次数
- 播放方向（正常播放 / 倒放）
- 是否循环播放
- ...

如以下使用 anime.js 库的例子：

```ts
anime({
  // 被动画元素（selector 表述）
  targets: ".duration-demo .el",
  // 被动画属性是 translateX，最后变化到 250px
  translateX: 250,
  // 动画时长是 3000 ms
  duration: 3000,
  // 不循环播放
  loop: false,
  // timing function 为一个贝塞尔曲线
  easing: "cubicBezier(.5, .05, .1, .3)",
});
```

### timing function

这里有必要解释一下 timing function。

在使用声明式 API 时，通常只会指定起始值与终止值，而不会手动控制从起始值到终止值的变化，如编写 CSS `@animation` 时指定了到 X% 进度时开发者所希望的各个属性的值。值在动画变化由指定 timing function 实现，这在 CSS 动画中对应于 `animation-timing-function` 属性。timing function 是随时间变化的函数，其描述了动画值在动画过程中值的变化过程。

常见的 timing function 有：

- linear: 线性，动画值做匀速变化；
- cubicBezier: 贝塞尔曲线；
- spring：做类似弹簧的变化；

您可以在 [easings.net](https://easings.net/cn) 上找到更多的 timing function 及其函数表达。

## 声明式动画库 Demo

此处是笔者提供的一个较小的声明式动画库 Demo（看 anime.js 源码后精简化的一版），其做了诸多的限制：

- 只支持 CSS 属性 `color`, `background-color`, `translateX`, `translateY`，DOM 属性 `value`；
- 只考虑设置终点值、时长、延时；

您可以从中了解一个简单的声明式动画库是如何实现的。

<JsAnimiationLibraryDemo />
