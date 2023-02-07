---
date: "2021-08-25"
title: "常用通信协议 - HTTP 1.0/1.1"
tags: ['fe']
abstract: ''
requirements: []
series: 'common-communications-protocol'
---



## 报文格式

### 请求报文

### 响应报文

```
状态行：HTTP协议版本（如 "HTTP/1.1"） + 状态码（如 "200"） + 状态码原因短语（如 200 对应 "OK"）
...报文首部字段
空行（CR + LF）
报文主体
```

## 状态码

- 1xx: 响应信息。服务器已收到请求，需要请求者继续执行操作  
  - 100：Continue，客户端继续请求  
  - 101：Switching Protocols，服务端根据客户端的请求切换协议  
  - 102：处理将被继续执行  
- 2xx: 成功  
  - 200：OK, 服务端成功请求  
  - 201：Created, 资源已创建，服务器已确认  
  - 202：Accepted，服务器已接受请求尚未处理  
  - 204：No Content  
  - 205: Reset Content, 重置内容  
- 3xx：重定向  
  - 301：Move permanently，永久移动  
  - 302：found，临时重定向  
  - 303: See Other（HTTP/1.1，重定向，常用于 POST 重定向到 GET，如上传文件后重定向到“上传成功”页面）  
  - 304：Not modified，客户端缓存  
  - 307：Temporary Redirect，暂时移动（HTTP/1.1，不允许将 POST 重定向到 GET）  
- 4xx：客户端错误  
  - 400：Bad request，不良请求  
  - 401：Unauthorized，未经授权  
  - 403：Forbidden，资源不可访问  
  - 404：Not Found  
  - 405：Method Not Allowed  
  - 407：Proxy Authentication Required，客户端需要附上 `Proxy-Authorization` 头在代理服务器上做身份认证  
- 5xx：服务器错误  
  - 500：internal sever error，内部服务器错误  
  - 501：Not Implemented，未实现，服务器不识别请求方法或不支持请求  
  - 502：Bad Gateway，网关错误  
  - 503：Service Unavailable，服务不可用  
  - 504：Gateway Timeout，网关超时  

## 值得注意的一些头部

### Connection: keep-alive

HTTP/1.0 中默认为 非持久连接，客户端与服务端之间传输数据后断开 TCP 连接 HTTP/1.1 中默认为 持久连接（Persistent Connection），客户端与服务端传输数据保持 TCP 连接

- 非持久连接：`Connection: close`  
- 持久连接：`Connection: keep-alive`  

需要注意，非持久连接中，可以通过是否关闭连接来判断内容是否传输完毕。 但是在持久连接中，TCP连接不关闭，无法作为判定标准。可以使用下述方法判别：  

- `content-length`：
- `transfer-encoding: chunked`