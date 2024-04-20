---
date: "2021-12-01"
title: "设计模式 - 工厂模式 (Factory)"
tags: ["design-pattern"]
abstract: ""
requirements: []
hidden_on_home: true
series: "design-pattern"
---

<Reference
entries={[
["《Head First 设计模式》"],
["工厂方法模式", "https://refactoringguru.cn/design-patterns/factory-method"],
["抽象工厂模式", "https://refactoringguru.cn/design-patterns/abstract-factory"]
]}
/>

## 概述

**工厂模式** 属于创建型模式，用于分离对象的创建与对象的使用，分为以下三种：

- 简单工厂模式（严格来讲，其不是设计模式，而是一种编程习惯）
- 工厂方法模式
- 抽象工厂模式

## 各工厂模式

### 简单工厂模式

这一模式下不直接调用 `new`，而是函数创建类实例。因为对象创建过程可能非常复杂，除了 `new` 以外还有其他逻辑，因此可以抽离对象创建逻辑。

以下例子为使用简单工厂模式创建 ajax 请求器或 websocket 请求器。

```js
abstract class Requester {
  request() {}
}

class AjaxRequester extends Requester {
  request() {
    // -- snip --
  }
}

class WebsocketRequester extends Requester {
  request() {
    // -- snip --
  }
}

const createRequester = (type: 'ws' | 'ajax') => {
  if (type === 'ws') {
    return new WebsocketRequester();
  } else {
    return new AjaxRequester();
  }
}
```

### 工厂方法模式

简单工厂模式不易于扩展，当子类增加时，需要修改简单工厂函数内部，违反 **开闭原则**。工厂方法模式将工厂函数作为调用方的类方法，子类继承时重写这一方法，从而提升可扩展性。

延续简单工厂方法中的例子，假设服务需要创建请求器，ajax 服务调用 ajax 请求器，websocket 服务调用 websocket 请求器，则代码可以如下：

```ts
// -- snip Requester, AjaxRequester, WebsocketRequester --

abstract class Service {
  requester: Requester;

  constructor() {
    this.requester = this.createRequester();
  }

  abstract createRequester(): Requester;
}

class AjaxService extends Service {
  createRequester() {
    return new AjaxRequester();
  }
}

class WebsocketService extends Service {
  createRequester() {
    return new WebsocketRequester();
  }
}
```

### 抽象工厂模式

工厂方法模式中对象创建与请求方类强耦合，实际上可以将对象创建作为单独的类因此达到解耦的目的。调用方在创建对象时，只需要获得工厂类实例即可创建，无需感知对象是如何被创建的。

改造简单工厂方法如下：

```ts
// -- snip Requester, AjaxRequester, WebsocketRequester --

abstract class RequesterFactory {
  abstract create(): Requester;
}

class AjaxRequesterFactory extends RequesterFactory {
  create() {
    return new AjaxRequester();
  }
}

class WebsocketRuquesterFactory extends RequesterFactory {
  create() {
    return new WebsocketRequester();
  }
}

abstract class Service {
  requester: Requester;

  constructor(requsterFactory: RequesterFactory) {
    this.requester = requsterFactory.create();
  }
}

// -- snip AjaxService, WebsocketService --

const ajaxService = new AjaxService(new AjaxRequesterFactory());
const websocketService = new WebsocketService(new WebsocketRuquesterFactory());
```

## 优缺点

优点：

- 分离对象的创建与使用；
- 单一职责原则；
- 开闭原则；

缺点：

- 代码复杂度增加；

## 实际应用

### 工厂方法模式 - React 类组件

React 类组件通过 `render` 方法生成 JSX。

```tsx
class App extends React.Component {
  render() {
    // -- snip --
  }
}
```

### 抽象工厂模式 - Webpack 源码中的 ModuleFactory

webpack 源码中的 `ModuleFactory` 为抽象类，被 `NormalModuleFactory`, `ContextModuleFactory` 等依赖，其 `create` 方法创建了 `Module`。
