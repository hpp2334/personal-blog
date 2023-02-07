---
date: "2021-08-25"
title: "常用通信协议 - HTTP2"
tags: ['fe']
abstract: ''
requirements: []
series: 'common-communications-protocol'
---

<Reference
  entries={[
    ["HTTP2 详解", "https://juejin.cn/post/6844903667569541133"],
  ]}
/>

## 特性

### 二进制分帧

在原有的 HTTP 与 TCP 之间加入二进制分帧层。帧（frame）是传输最小单位，将报文分解为更小的单位。  

以下为帧类型：

- (0x1) `HEADERS`：报文头  
- (0x9) `CONTINUATION`：延续，继续传输报文头数据  
- (0x0) `DATA`：报文主体  
- (0x2) `PRIORITY`：优先级，用于控制请求优先级  
- (0x3) `RST_STREAM`：重置流，用于取消流（可用于取消请求）  
- (0x4) `SETTINGS`：设置，作用于整个连接，可以设置 Header 压缩表大小、服务端推功能开启、流量控制初始窗口大小、最大流数等  
- (0x7) `GOAWAY`：关闭连接
- (0x5) `PUSH_PROMISE`：服务端推  
- (0x8)`WINDOW_UPDATE`：窗口更新，用于流量控制  


### 多路复用

每个帧上有流标识符（Stream Identifier），同属于一个流的帧可以组成完整的数据。  

在 HTTP 1.1 中，需要建立多 TCP 连接以实现并行请求（因为不同请求无法区分），而在 HTTP 2 中只需要一个 TCP 连接即可。  

### 服务端推送

服务端可以主动向客户端推送静态资源。这里使用 node http2 模块编写一个 server demo 举例  

```ts
import http2 from 'http2';
import fs from 'fs';

const server = http2.createSecureServer({
  key: fs.readFileSync('./certs/server.key'),
  cert: fs.readFileSync('./certs/server.crt'),
});

server.on('stream', (stream, headers) => {
  const url = headers[':path'];
  // 访问 "/" 时，将 url = "/inject.js" 的文件推送给客户端
  if (url === '/') {
    stream.pushStream({ ':path': '/inject.js' }, (err, pushStream) => {
      if (err)  throw err
      pushStream.respondWithFile('./inject.js');
      pushStream.on('error', (err) => {
        console.error('push error:', err)
      })
    })
    stream.respondWithFile('./index.html')
  } else {
    stream.respond({
      ':status': 404,
    })
    stream.end()
  }
});

server.listen(8000);

console.log('https://localhost:8000');
```

### 头部压缩

采用 `HPACK` 算法对头部进行压缩，有静态索引表与动态索引表，发送时只发送变更的部分（在 HTTP 1.1 中，头部是完整发送且不采用索引的）  

- 静态索引表：是固定的（RFC 7541），有 61 个 kv 对（如 `:path`, `:method` 等）  
- 动态索引表：由 HTTP2 双方维护

### 重置流

在 HTTP 1.1，只能够通过 TCP RST 关闭连接，即只能断开 TCP 连接  
在 HTTP 2，有 RST_STREAM 类型帧，可以取消某个流，无需断开 TCP 连接  

### 请求优先级

控制优先级有以下方式：  

- 新建优先级：`HEADERS` 帧的 PRIORITY 信息  
- 更新优先级：`PRIORITY` 帧  

优先级具体可以控制的有：

- 依赖流：通过 `Stream Dependency` 控制当前流依赖了哪个流  
- 权重：通过 `Weight` 控制分配资源的权重  

### 流量控制

虽然 TCP 本身有流量控制，但由于 HTTP 2 的多路复用特性，HTTP 2 本身需要做流量控制，使得同一连接上的流不会互相干扰。  

`SETTINGS` 帧的 `SETTINGS_INITIAL_WINDOW_SIZE` 可以初始化或重设置流量控制窗口大小。通过 `WINDOW_UPDATE` 帧控制流量，可以作用于某个流，也可以作用于整个连接（Stream Identifier 为 0x0），只有 DATA 帧受影响。  


## 协商机制

### HTTP

**注意，主流浏览器使用 HTTP 2 必须使用 HTTPS**  

通过 `Upgrade` 字段进行请求升级，以下是一个例子。  

```
Connection: Upgrade, HTTP2-Settings
Upgrade: h2c
HTTP2-Settings: <base64url encoding of HTTP/2 SETTINGS payload>
```

### HTTPS

通过 TLS Handshake 时的 Client Hello 阶段通过 ALPN（Application Layer Protocol Negotiation） 扩展进行请求升级  

## 一些 HTTP 1.1 中在 HTTP 2 不需要使用的优化

- 域名分片（连接数限制问题）  
- CSS Sprite（请求数限制问题）  
- 资源合并  