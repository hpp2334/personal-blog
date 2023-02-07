---
date: "2021-11-27"
title: "常用通信协议 - DNS"
tags: ["fe"]
abstract: ""
requirements: []
series: "common-communications-protocol"
references:
  [
    ["DNS 原理入门", "https://www.ruanyifeng.com/blog/2016/06/dns.html"],
    ["What is DNS? | How DNS works", "https://www.cloudflare.com/learning/dns/what-is-dns/"],
    [
      "DNS: Types of DNS Records, DNS Servers and DNS Query Types",
      "https://ns1.com/resources/dns-types-records-servers-and-queries",
    ],
    ["云解析 DNS", "https://help.aliyun.com/document_detail/102237.html"],
  ]
---

## DNS 的作用

DNS 用于根据域名查询 IP。

## 域名层级

形如：

```
host.sld.tld.
```

- `.` (最后一个点): 根域名
- `tld` (top-level domain)：顶级域名
- `sld` (second-level domain)：二级域名
- `host`：主机名，由用户配置

PS：域名可以不止有三级

## DNS 服务器分层

- 本地域名服务器（DNS Resolver）：接受 DNS 客户端的请求解析（一般是递归请求），通过 DNS 服务器解析请求，并跟踪这一过程（e.g. 8.8.8.8）
- 根 DNS 服务器（Root Nameserver）：可获取顶级域名服务器的地址，全球共有 13 台
- 顶级域名服务器（Tld Nameserver）：可获取二级域名所在的权威域名服务器的地址
- 权威域名服务器（Authoritative Nameserver）：负责管理区域的 IP 对应关系

## 常见的 DNS 记录类型

DNS 记录用于告知 DNS 查询服务自己已知的域名与 IP 之间的对应关系，常见类型有：

- `A` (Address)：域名对应的 ipv4 地址
- `AAAA`: 域名对应的 ipv6 地址
- `NS` (Name Server)：记录下一级域名信息的服务器域名
- `MX` (Mail Exchange): 电子邮件服务器地址
- `CNAME` (Canonical Name)：域名跳转

## DNS 缓存

按请求顺序，如下：

- 浏览器缓存
- 操作系统级别缓存

## DNS 查询类别

- 递归查询（Recursive Query）：DNS 客户端提供路径，DNS Resolver 必须提供对应的 IP 地址或报错；
- 迭代查询（Iterative Query）：DNS 客户端提供路径，DNS Resolver 尽量提供对应的 IP 地址，若无法提供，则提供最近的 DNS 服务器地址（如 根 DNS 服务器 等）；DNS 客户端需要重复上述过程直到找到需要的路径的 IP 地址；
- Non-Recursive Query：DNS 客户端提供路径，DNS Resolver 命中缓存；

## DNS 查询流程

以下以浏览器查询 `blog.hpp2334.icu` 对应 IP 地址为例，展示一个 **可能** 的流程：

首先，查找 DNS 缓存，若命中则不往下查询。

1. 浏览器告知 DNS Resolver 需要查询 `blog.hpp2334.icu`；
2. DNS Resolver 若命中缓存，走 Non-Recursive Query，直接返回结果；否则，走递归查询；
3. DNS Resolver 执行迭代查询，查询 `.` 对应的 DNS 记录，得到 根 DNS 服务器 的域名与地址；
4. DNS Resolver 向 根 DNS 服务器（如 `k.root-servers.net`） 查询 `icu.` 对应的 DNS 记录，得到 顶级域名服务器 的域名与地址；
5. DNS Resolver 向 顶级域名服务器（如 `c.nic.icu`）查询 `hpp2334.icu.` 对应的 DNS 记录，得到 权威域名服务器 的域名与地址；
6. DNS Resolver 向 权威域名服务器（如 `ns1.vercel-dns.com`） 查询 `blog.hpp2334.icu.` 对应 IP 地址；
7. DNS Resolver 向浏览器提供获得的 IP 地址；

通过 [Dig GUI](https://www.diggui.com/) 这个网站展示上述流程。

```
> dig +trace blog.hpp2334.icu

; <<>> DiG diggui.com <<>> +trace blog.hpp2334.icu
; (1 server found)
;; global options: +cmd
.			71697	IN	NS	m.root-servers.net.
.			71697	IN	NS	b.root-servers.net.
.			71697	IN	NS	c.root-servers.net.
.			71697	IN	NS	d.root-servers.net.
.			71697	IN	NS	e.root-servers.net.
.			71697	IN	NS	f.root-servers.net.
.			71697	IN	NS	g.root-servers.net.
.			71697	IN	NS	h.root-servers.net.
.			71697	IN	NS	a.root-servers.net.
.			71697	IN	NS	i.root-servers.net.
.			71697	IN	NS	j.root-servers.net.
.			71697	IN	NS	k.root-servers.net.
.			71697	IN	NS	l.root-servers.net.
.			71697	IN	RRSIG	NS 8 0 518400 20210910050000 20210828040000 26838 . KJq0+crtdUpzXqL9tSL3OE/B0b8QHQCIra4ciU7Gbm3MtpWJlV3sd3p5 cTBpDF/hhqJY46g6e+Oa+bSYgB51gnXDWDTX4+sxe3IisF4flJPRfX3U /sqgJx6BQ4LACs4iczAKF1ZrhrLS5hMYvhI+S5hppcthk8oS7jy0FJ0J qm6nSxElMo2b0bJ5k6ik0DxV1ObC+id3iU74EmgyeMHfqkMQBU335EkD Nkpu6mRQ7igGx61Q2mjyXfaUBd0l2+tuk6iHNarG5+vfBbFemrCMkDAP sTJgM0mmK1VbFJrJN7uU5NnSmrZUYuBog6W266blrp7lumqf7YFMz3Wn xSepNA==
;; Received 525 bytes from 8.8.8.8#53(8.8.8.8) in 1 ms

icu.			172800	IN	NS	a.nic.icu.
icu.			172800	IN	NS	b.nic.icu.
icu.			172800	IN	NS	c.nic.icu.
icu.			172800	IN	NS	d.nic.icu.
icu.			86400	IN	DS	31762 8 1 DB42BC4B511C8F97E5A3C00666B76FB1F4C2E567
icu.			86400	IN	DS	31762 8 2 CCC397A837F6491166129E1D99ED03CCA6635166B2F5B58C65B5CF51 6AE92B8F
icu.			86400	IN	DS	62704 8 1 D834EE1ED0374E28C49BE9C12FE1B93AE0FE9CCB
icu.			86400	IN	DS	62704 8 2 8C0442A126BA382CA5B05AE5B44744CDC5AB2845C83918E147083434 F65790AA
icu.			86400	IN	RRSIG	DS 8 1 86400 20210910050000 20210828040000 26838 . iuRm6UsE2xBnHLl0IGjMp8RC7Zt55VjALA8Fik1+j+kspofvlLncDUVP f0ZxkXXUonb/sAPT/bHTZaqOhr3Yk7f05yu8JA5J2B3yuur7r9a5LUaU ZoK428XsMaxAb5Y/LazySDVPNXqD3Il5NIv7awRjY7GYbTam2Twc1F7q g3I8OoyvWuBAe85rZeOeRzfILlT7KEvJk93t6hwYBQRz1+AoAcTIwcTi +BdkIsF4tInbGVpkbCYVZzSkU/y2Eb1IgN0BYnOgMAIJAW4x0Ar2UCxy YpsOnxOFzkJid+5ge34Qg5wSGIA3fQXu+RG0tIffdaeZ3lI4uVpEEN2/ //Uh1w==
;; Received 744 bytes from 2001:7fd::1#53(k.root-servers.net) in 34 ms

hpp2334.icu.		3600	IN	NS	ns1.vercel-dns.com.
hpp2334.icu.		3600	IN	NS	ns2.vercel-dns.com.
le4m8tee0bkn8uvhc3hnh94r18ctoa5p.icu. 3600 IN NSEC3 1 1 1 - LEOV87D9G93EBI84EK60EV07QUMDSNP0  NS SOA RRSIG DNSKEY NSEC3PARAM
eh86fe3ardf1b08bookod6vh5t7tioo3.icu. 3600 IN NSEC3 1 1 1 - EK2M82919GHFODMQDA45DACOHUDBVDBG  NS DS RRSIG
le4m8tee0bkn8uvhc3hnh94r18ctoa5p.icu. 3600 IN RRSIG NSEC3 8 2 3600 20210911162104 20210812030040 59283 icu. cmfTjdjMbJdA5zHyf04s8ZfxXqazSB897/pBiBvGFiMSv2wtY0fh7PXW d4U3mwVwFHTer5fqdpMRvoF/bSpk5/ig2qp8rqYlZYlDh9ILNhcglRXk TajdFdBE/e1c+FNtxO4cSBccEckKn8ijqOYjx2K+owLepVbaa8+Iau58 SNo=
eh86fe3ardf1b08bookod6vh5t7tioo3.icu. 3600 IN RRSIG NSEC3 8 2 3600 20210910232806 20210812030040 59283 icu. MstfeBvVgo4beXvI72pYAGvZA9/dxMVVSv7Mv1K5Cta41t5m4RVGR2v3 uB8VVUaRMCICIUTmA8ukrTmax8YpURBOCCzxQsHaB895iMLnWw8Kf/ms yGbem9XFEmVIqzjkFvwGSit5u3kw1Oyho5fc6ZGZvKew4rhOHvFB44CK +OM=
;; Received 580 bytes from 212.18.248.108#53(c.nic.icu) in 28 ms

blog.hpp2334.icu.	60	IN	CNAME	cname.vercel-dns.com.
;; Received 79 bytes from 96.45.80.1#53(ns1.vercel-dns.com) in 6 ms
```
