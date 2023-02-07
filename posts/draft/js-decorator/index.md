---
date: "2021-01-22"
title: "JavaScript 中的迭代器 (Iterator) 与生成器 (Generator)"
tags: ['js']
abstract: ''
requirements: []
---

### 使用 `decorator`

> [TypeScript - Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html#decorator-composition)  
> [都2020年了，你还不会JavaScript 装饰器？ ](https://juejin.cn/post/6844904100144889864)  
> [深入理解 TypeScript - Reflect Metadata](https://jkchao.github.io/typescript-book-chinese/tips/metadata.html#%E5%9F%BA%E7%A1%80)  
> [Metadata](https://www.npmjs.com/package/reflect-metadata)  

JavaScript 中提供了装饰器语法 `@decorator` 用于方便的实现装饰模式，其分为两类：  

- 类装饰器：装饰整个类；  
- 类属性装饰器：装饰类上的方法、变量、getter 等属性；  

#### 类装饰器

类封装器直接作用于整个类。  

以下例子实现了一个用于 `Object.seal` 到整个类上的装饰器 `sealed`。  

```ts
@sealed
class Greeter {
  greeting: string;
  constructor(message: string) {
    this.greeting = message;
  }
  greet() {
    return "Hello, " + this.greeting;
  }
}

function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}
```

#### 类属性装饰器

类封装器作用于类上的成员。若类装饰器与类属性装饰器同时存在，编译期会先作用类属性装饰器，再作用类装饰器。（关于顺序问题，可以在 TypeScript Playground 写一段同时作用两类装饰器的代码，再观察 JavaScript 输出。）  

以下例子实现了调用方法时打印消息的 `Log` 类属性装饰器。

```ts
export function Log() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const f = descriptor.value as Function;
    console.log(`Call method "${f.name}"`);
  };
}

class A {
  constructor() {
    this.logTwo();
  }

  @Log()
  logTwo() {
    console.log("Two");
  }
}
new A().logTwo()
// Call method "logTwo"
// Two
```

#### Metadata

`metadata API` 是一个 ES7 的提案，主要用来在编程时添加和读取元数据，常用的 API 有：  

- 定义元数据：`Reflect.defineMetadata(metadataKey, metadataValue, target[, propertyKey])`；  
- 获取元数据：`Reflect.getMetadata(metadataKey, target[, propertyKey]);`；  

目前这个 API 还不是标准的一部分，使用时要安装库 `reflect-metadata`。  

一般与 TypeScript 一起使用此 API，在 `tsconfig.json` 中指定：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

使得 TypeScript 支持装饰器语法（`"experimentalDecorators": true` 的作用），并在编译期插入以下 `metadataKey` （`"emitDecoratorMetadata": true` 的作用，[具体代码](https://www.typescriptlang.org/tsconfig#emitDecoratorMetadata)）：  

- `design:type`：属性类型  
- `design:paramtypes`：参数类型  
- `design:returntype`：返回值类型  

以下是使用 API 的例子。  

```ts
function classDecorator(): ClassDecorator {
  return target => {
    // 在类上定义元数据，key 为 `classMetaData`，value 为 `a`
    Reflect.defineMetadata('classMetaData', 'a', target);
  };
}

function methodDecorator(): MethodDecorator {
  return (target, key, descriptor) => {
    // 在类的原型属性 'someMethod' 上定义元数据，key 为 `methodMetaData`，value 为 `b`
    Reflect.defineMetadata('methodMetaData', 'b', target, key);
  };
}

@classDecorator()
class SomeClass {
  @methodDecorator()
  someMethod() {}
}

Reflect.getMetadata('classMetaData', SomeClass); // 'a'
Reflect.getMetadata('methodMetaData', new SomeClass(), 'someMethod'); // 'b'
```