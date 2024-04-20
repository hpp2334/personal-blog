---
date: "2021-12-01"
title: "设计模式 - 外观模式 (Facade)"
tags: ["design-pattern"]
abstract: ""
requirements: []
hidden_on_home: true
series: "design-pattern"
---

<Reference
entries={[
["外观模式", "https://refactoringguru.cn/design-patterns/facade"]
]}
/>

## 概述

**外观模式** 属于结构型模式，能为库、框架等提供一个简单的接口。

## 例子：多格式文档读取器 (TypeScript 实现)

假设有一个多格式文档读取器，其基于其他第三方库完成，其实现可以如下。

```ts
import PdfReader from "existed-pdf-reader-module";
import DocReader from "existed-doc-reader-module";

class Reader {
  async read(filepath: string, type: "pdf" | "doc") {
    switch (type) {
      case "pdf":
        return await PdfReader.get(filepath);
      case "doc":
        return await DocReader.readAsync(filepath);
    }
  }
}
```

## 优缺点

优点：

- 使代码独立与独立子系统；

缺点：

- 外观可能成为与子系统中所有类耦合的 上帝对象；
