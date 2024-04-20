---
date: "2021-11-30"
title: "设计模式 - 装饰模式 (Decorator)"
tags: ["design-pattern"]
abstract: ""
requirements: []
hidden_on_home: true
series: "design-pattern"
---

<Reference
entries={[
["《Head First 设计模式》"],
["装饰模式", "https://refactoringguru.cn/design-patterns/decorator"]
]}
/>

## 概述

**装饰模式** 属于结构型模式，允许在被委托者行为的之前或之后加上自己的行为，以达到所需要的功能。这一设计模式一般用于在不修改原有代码的情况下，在运行时新增额外行为。

优点：

- 无需创建新子类即可扩展对象行为；
- 可在运行时添加或删除对象功能；
- 可通过多个装饰封装对象来组合行为，避免继承带来的子类爆炸问题；
- 单一职责原则；

缺点：

- 若被装饰的行为不受栈顺序影响，则会比较困难；

## 传统装饰模式例子

假设实现一个文件系统 (`FileSystem`, `FS`)，需要实现自由组合 从内存读取行为 与 调用 API 时打印日志 行为。若采用纯粹的继承实现，则需要实现 3 个子类，诸如 `MemFS`, `LogFS`, `MemAndLogFS`，如果需要更多行为，则会带来子类爆炸问题。

使用装饰模式则可以很好的实现这一需求，可实现两个装饰器：

- `MemFSDecorator`： 从内存中读取文件；
- `LogFSDecorator`： 调用 API 时打印日志；

```ts
class FS {
  public read(): any {}
  public write(data: any): void {}
}

class FSDecorator implements FS {
  protected fs: FS;

  constructor(fs: FS) {
    this.fs = fs;
  }

  read() {
    return this.fs.read();
  }

  write(data: any) {
    return this.fs.write(data);
  }
}

class MemFSDecorator extends FSDecorator {
  read() {
    console.log("read from memory");
    // -- snip --
  }

  write() {
    console.log("write to memory");
    // -- snip --
  }
}

class LogFSDecorator extends FSDecorator {
  read() {
    console.log(new Date(), "read");
    this.fs.read();
  }

  write(data: any) {
    console.log(new Date(), "write");
    this.fs.write(data);
  }
}

let fs = new FS();
fs = new MemFSDecorator(fs);
fs = new LogFSDecorator(fs);

fs.read();

fs.write(null);

/*
Log:

2021-10-06T15:48:45.892Z read
read from memory
2021-10-06T15:48:45.893Z write
write to memory
*/
```

## 前端中的装饰模式

### 基于对象

由于 JavaScript 非常灵活，因此可直接对对象进行装饰，不需要显式的创建类。另外，还可以对 方法、属性 等进行装饰，而不需要直接对一整个类进行装饰。

```ts
class FS {
  public read(): any {}
  public write(data: any): void {}
}

const decorateMemFS = (fs: FS) => {
  const oriRead = fs.read.bind(fs);
  fs.read = function () {
    console.log("read from memory");
    // -- snip --
  };

  const oriWrite = fs.write.bind(fs);
  fs.write = function (data) {
    console.log("write to memory");
    // -- snip --
  };
};

const decorateLogFS = (fs: FS) => {
  const oriRead = fs.read.bind(fs);
  fs.read = function () {
    console.log(new Date(), "read");
    oriRead();
  };

  const oriWrite = fs.write.bind(fs);
  fs.write = function (data) {
    console.log(new Date(), "write");
    oriWrite(data);
  };
};

let fs = new FS();
decorateMemFS(fs);
decorateLogFS(fs);

fs.read();
fs.write(null);
```

## 应用

### (TypeScript) 获取类型信息

JavaScript/TypeScript 可以使用装饰器以更优雅的应用装饰模式与元编程。

```ts
export function PropTypeLog(): PropertyDecorator {
  return function (target: Object, propKey: string | symbol) {
    const type = Reflect.getMetadata("design:type", target, propKey);
    const typeName = type ? type.name : type === undefined ? "Undefined" : "Null";
    console.log(`The type of "${String(propKey)}": ${typeName}`);
  };
}

class A {
  @PropTypeLog()
  varStr!: string;

  @PropTypeLog()
  varNumber!: number;

  @PropTypeLog()
  varBoolean!: boolean;

  @PropTypeLog()
  varUndefined: undefined;
}

// The type of "varStr": String
// The type of "varNumber": Number
// The type of "varBoolean": Boolean
// The type of "varUndefined": Undefined
```

### (TypeScript) Node 服务器定义路由

```ts
export const Route = (path: string, method: string = "GET") =>
  function (target: any, propKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata("router", { path, method }, descriptor.value);
  };

export const getRouter = (instance: Object) => {
  const prototype = Object.getPrototypeOf(instance);
  const isConstructor = (fn: any) => fn === prototype.constructor;
  const isFunction = (fn: any) => typeof fn === "function";
  const methodsName = Object.getOwnPropertyNames(prototype).filter(
    (item) =>
      !isConstructor(prototype[item]) && isFunction(prototype[item]) && Reflect.getMetadata("router", prototype[item])
  );
  return methodsName.map((name) => {
    const fn = prototype[name];
    const { path, method } = Reflect.getMetadata("router", fn);
    return {
      func: fn,
      path,
      method,
    };
  });
};

const demoReflectMetadataRoute = () => {
  class List {
    @Route("/get")
    get() {}

    @Route("/delete", "POST")
    delete() {}

    _core() {}
  }

  const router = getRouter(new List());
  console.log(router);
};

// [
//   {
//     func: function get() {},
//     path: "/get",
//     method: "GET",
//   },
//   {
//     func: function _delete() {},
//     path: "/delete",
//     method: "POST",
//   },
// ]
```
