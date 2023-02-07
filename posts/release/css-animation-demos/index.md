---
date: "2021-06-14"
title: "CSS Animation 学习笔记"
tags: ['fe', 'css']
abstract: '本文为笔者的 CSS transition, animation 与 JS animation 等的学习笔记，主要以复现其他人 demo 的形式。'
---

import { CodeCSSAnimationDemo } from './css-animation-demos-code'

## CSS animation

### Loader Ball

> https://codepen.io/Sixclones/pen/VBdeXL

<CodeCSSAnimationDemo
  render={{
    entryKey: './loaderball/main.native.js',
  }}
  source={{
    sourceKeyList: [
      './loaderball/main.html',
      './loaderball/main.css',
    ],
  }}
/>

### Loading 2

> https://codepen.io/RRoberts/pen/pEXWEp (row 2, col 3)  

<CodeCSSAnimationDemo
  render={{
    entryKey: './loader-rect-flip/main.native.js',
  }}
  source={{
    sourceKeyList: [
      './loader-rect-flip/main.html',
      './loader-rect-flip/main.css',
    ],
  }}
/>

### Toggle Switch

> https://codepen.io/sibi13/pen/eVzXev

<CodeCSSAnimationDemo
  render={{
    entryKey: './toggle-switch/main.native.js',
  }}
  source={{
    sourceKeyList: [
      './toggle-switch/main.html',
      './toggle-switch/main.css',
    ],
  }}
/>

### File Tabs

> https://codepen.io/aaroniker/pen/aPJbJz

此处需要注意：  

- `backface-visibility: hidden`：隐藏背面，这与平面法向量有关，可以认为初始时平面法向量是指向摄像机的；  

<CodeCSSAnimationDemo
  render={{
    entryKey: './file-tabs/main.native.js',
  }}
  source={{
    sourceKeyList: [
      './file-tabs/main.html',
      './file-tabs/main.css',
    ],
  }}
/>

### Type Writer

> https://codepen.io/aaroniker/pen/XWWPbep


<CodeCSSAnimationDemo
  render={{
    entryKey: './typewriter/main.native.js',
  }}
  source={{
    sourceKeyList: [
      './typewriter/main.html',
      './typewriter/main.scss',
    ],
  }}
/>
