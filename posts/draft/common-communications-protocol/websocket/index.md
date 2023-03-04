---
date: "2021-08-25"
title: "常用通信协议 - WebSocket"
tags: ['fe']
abstract: ''
requirements: []
series: 'common-communications-protocol'
---


<Reference
  entries={[
    ["WebSocket 教程", "https://www.ruanyifeng.com/blog/2017/05/websocket.html"],
    ["WebSocket 是什么原理？为什么可以实现持久连接？", "https://www.cnblogs.com/lfri/p/12591025.html"],
    ["WebSocket的实现原理", "https://fecommunity.github.io/front-end-interview/%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%BD%91%E7%BB%9C/6.Websocket.html],
  ]}
/>


### 特点

- 基于 TCP  
- 握手采用 HTTP  
- 可以发送文本与二进制数据  
- 没有同源限制  
- 协议为 `ws`，若加密则为 `wss`  
- 持久连接，允许服务端向客户端主动推动数据

## 握手

一个典型的 WebSocket 握手请求如下

Request:

```
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: http://example.com
Sec-WebSocket-Protocol: chat, superchat
Sec-WebSocket-Version: 13
```

Response:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat
```

其中

- `Connection: Upgrade` 表示客户端希望连接升级  
- `Upgrade: websocket` 表示升级到 WebSocket  
- `Sec-WebSocket-Key` 是随机字符串，其加上一个特殊字符串（`258EAFA5-E914-47DA-95CA-C5AB0DC85B11`）后得到字符串 `s`，服务端会将 `Base64(SHA1(s))` 作为 `Sec-WebSocket-Accept` 的值返回。这样做可以尽量避免普通的 HTTP 请求被当做 WebSocket 协议  
- `Sec-WebSocket-Version`：表示 WebSocket 版本  

## 数据传输

WebSocket 通信由 frames 组成，可以从任何一方发送，有以下类型

- `text frames`
- `binary data frames`
- `ping/pong frames`
- `connection close frames`
- ...


## 用法

### 建立 Websocket 连接

```ts
declare const url: string;
const ws = new WebSocket(url);
```

### ws.readyState

表明连接状态。

```ts
enum ReadState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

interface webSocket {
  readyState: ReadState
};
```

### API

```ts
interface webSocket {
  // 发送消息
  send: (data: string | Blob | ArrayBuffer) => void;
  // 监听消息 (setter)
  onmessage: (event: { data: string | Blob | ArrayBuffer }) => void;
  // 显示指定 onmessage 收到的数据的类型
  binaryType?: 'blob' | 'arraybuffer';
  // 还有多少字节二进制数据未发送
  bufferedAmount: number;
  // 监听错误 (setter)
  onerror: (event: any) => any;
  // 关闭连接
  // code = 1000，正常关闭
  // code = 1006，异常关闭，连接丢失 closing frame
  // ...
  close: (code: number, reason: string);
  // 监听关闭 (setter)
  onclose: (event: { code: number; reason: string; wasClean: boolean }) => void;

  addEventListener: (evName: string, handler: Function) => void;
}
```