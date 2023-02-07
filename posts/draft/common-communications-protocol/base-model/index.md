---
date: "2021-08-25"
title: "常用通信协议 - 模型"
tags: ['fe']
abstract: ''
requirements: []
series: 'common-communications-protocol'
---

<Reference
  entries={[
    ["WIKI - OSI 模型", "https://zh.wikipedia.org/wiki/OSI%E6%A8%A1%E5%9E%8B"]
  ]}
/>

## OSI 模型

OSI模型 为 7 层模型：

- 应用层（Application Layer）：HTTP (HTTP/2, SPDY), DNS  
- 表示层（presentation layer）\[deprecated\]  
- 会话层（session layer）\[deprecated\]  
- 传输层（transport layer）：TCP, UDP, TSL/SSL  
- 网络层（network layer）：IP (v4 / v6), ICMP  
- 数据链路层（data link layer）  
- 物理层（physical layer）  