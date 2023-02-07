---
date: "2021-11-30"
title: "设计模式 - 适配器模式 (Adapter / Wrapper)"
tags: ["design-pattern"]
abstract: ""
requirements: []
hidden_on_home: true
series: "design-pattern"
---

<Reference
entries={[
["适配器模式", "https://refactoringguru.cn/design-patterns/adapter"],
["精读《设计模式 - Adapter 适配器模式》", "https://zhuanlan.zhihu.com/p/280733597"]
]}
/>

## 概述

**适配器模式** 属于结构型设计模式，用于转换对象接口，以使其与其他对象一起工作（即抹平接口差异）。

## 例子：实现 ORM 库 （Typecript 编码）

假设已有 ORM 库且已支持 MySQL，它的类型为：

```ts
interface ORMClient {
  queryAll<T>(tableName: string): Promise<T[]>;
  drop(tableName: string): Promise<void>;
}
```

现在要加入对 SQLite 的支持，已有第三方库的类型为：

```ts
interface SQLiteDriver {
  execute(cmd: string): Promise<any>;
}
```

那么为了统一接口，可以为第三方库增加一个适配器类，其内部通过调用 SQLite 第三方库从而实现 ORM 库的接口。

```ts
// SQLiteDriver 的适配器类，实现 ORMClient 接口
class SQLiteAdapter implements ORMClient {
  constructor(private sqliteDriver: SQLiteDriver) {}

  async queryAll(tableName: string) {
    return this.sqliteDriver.execute(`SELECT * FROM ${tableName}`);
  }

  async drop(tableName: string) {
    return this.sqliteDriver.execute(`DROP TABLE ${tableName}`);
  }
}
```

## 结构

- **Adapter**：适配器；
- **Adaptee**：被适配的内容，如上例中的 `SQLiteDriver`；
- **Target**：适配为的内容，如上例中的 `ORMClient`；

## 优缺点

优点：

- 单一职责原则：分离逻辑转换代码；
- 开闭原则；

缺点：

- 代码整体复杂度增加；

## 常见应用

- 第三方库适配：出于统一 API 等目的而对第三方库增加适配器类；
- API deprecated：当存在新的 API 时，常常会使旧 API 调用新 API，此时旧 API 为新 API 的适配器；
- 统一多个类接口：如上述 ORM 的例子；
