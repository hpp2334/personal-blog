---
date: "2021-12-12"
title: "设计模式 - 依赖注入 (Dependency Injection)"
tags: ["design-pattern"]
abstract: ""
requirements: []
hidden_on_home: true
series: "design-pattern"
---

<Reference
entries={[
["深入理解 IoC（控制反转）、DI（依赖注入）", "https://segmentfault.com/a/1190000015173300"],
["浅析控制反转", "https://zhuanlan.zhihu.com/p/60995312"],
]}
/>

## 控制反转 (Inversion of Control, IoC)

控制反转是 OOP 中的一种设计原则，可以降低耦合度。在此设计原则下，代码通过容器实现对象组件的装配与管理。所谓 “控制反转” 即程序对组件对象控制权转移给外部容器。IoC 的主要实现有两种：

- 依赖查找（Dependency Lookup）
- 依赖注入（Dependency Injection, DI）

## 依赖注入 (Dependency Injection, DI)

依赖注入是一种设计模式，目的是将服务传递给客户端，而非客户端创建或寻找服务。

目前，前端使用了 DI 的流行库或框架包括：

- 前端框架：Angular
- Node 框架：NestJS
- 通用库：InversifyJS, tsyringe

主流实现会使用 装饰器 与 `reflect-metadata`。

### IoC 容器

将服务传递给客户端的一种方式是借用第三方容器，客户端自身从容器获取服务，此容器为 IoC 容器。

以下是一个简单的 IoC 容器实现。

```js
export class Container implements ContainerType {
  private _mp: Map<string, Item>;

  constructor() {
    this._mp = new Map();
  }

  register(name: string, definition: ClassType, dependencies?: any[]): void {
    this._mp.set(name, {
      dependencies,
      definition
    });
  }
  get(name: string): {} {
    const item = this._get(name);
    if (item === null || typeof item !== 'object') {
      throw Error(`"${name}" Not instance!`);
    }
    return item;
  }

  private _get(name: string): any {
    const item = this._mp.get(name);
    if (!item) {
      throw Error(`No item named "${item}".`);
    }
    if (this._isClass(item.definition)) {
      return this._createInstance(item);
    } else {
      return item.definition;
    }
  }
  private _getResolvedDependencies(target: Item): any[] {
    let deps = [];
    if (target.dependencies) {
      deps = target.dependencies.map((dep) => this._get(dep));
    }
    return deps;
  }
  private _createInstance(target: Item): {} {
    return new target.definition(...this._getResolvedDependencies(target));
  }
  private _isClass(definition: any): definition is ClassType {
    return Object.prototype.toString.call(definition) === "[object Function]";
  }
}
```

### Demo - 模块转换器

本部分包含一个简易的使用了 DI 的例子，例子中不包含装饰器。

假设有一个模块转换器，该转换器读取文件路径，进行文件读入与转换。假设依赖路径解析器和文件系统，则分别实现解析器 `Resolver`，文件系统 `FileSystem`，转换器 `Converter`。

```ts
/* Resolver 路径解析器 */
abstract class Resolver {
  abstract resolve(req: string): string;
}

class FileResolver extends Resolver {
  resolve(req: string) {
    return req;
  }
}

/* FileSystem 文件系统 */
abstract class FileSystem {
  abstract read(path: string): Promise<string>;
}
class DiskFileSystem extends FileSystem {
  async read(path: string) {
    const content = await fs.readFile(path, { encoding: "utf-8" });
    return content;
  }
}
class MockFileSystem extends FileSystem {
  async read(path: string) {
    return `const a = 1; let b = 2;`;
  }
}

/* Converter 转换器 */
abstract class Converter {
  private resolver: Resolver;
  private fs: FileSystem;

  constructor(fs: FileSystem, resolver: Resolver) {
    this.resolver = resolver;
    this.fs = fs;
  }
  async process(req: string) {
    const path = this.resolver.resolve(req);
    const content = await this.fs.read(path);
    const result = this.convert(content);
    console.log(result);
  }
  abstract convert(content: string): string;
}
class ToVarConverter extends Converter {
  convert(content: string) {
    return content.replace(/const|let/g, "var");
  }
}
class ToLetConverter extends Converter {
  convert(content: string) {
    return content.replace(/const|var/g, "let");
  }
}
```

此时使用转换器，通过 IoC 容器注册与获取。

```ts
export async function main() {
  const container = new Container();

  container.register("fs", MockFileSystem);
  container.register("resolver", FileResolver);
  container.register("to-var-converter", ToVarConverter, ["fs", "resolver"]);
  container.register("to-let-converter", ToLetConverter, ["fs", "resolver"]);

  const toVarConverter = container.get("to-var-converter") as Converter;
  const toLetConverter = container.get("to-let-converter") as Converter;

  console.log("To Var Converter");
  await toVarConverter.process("a.js");
  console.log("To Let Converter");
  await toLetConverter.process("a.js");
}
```

若要更改文件系统与解析器，只需要改容器注册处。

### Demo - 基于 InversifyJS 的模块转换器

利用 InversifyJS 改造上述模块转换器，需要在基类打上 `@injectable()`，需要注入的属性打上 `@inject(id)`。

```ts
/* 定义 container keys  */
const TYPES = {
  fileSystem: Symbol.for("fileSystem"),
  resolver: Symbol.for("resolver"),
  toVarConverter: Symbol.for("to-var-converter"),
  toLetConverter: Symbol.for("to-let-converter"),
};

/* Resolver 路径解析器 */
@injectable()
export abstract class Resolver {
  abstract resolve(req: string): string;
}

export class FileResolver extends Resolver {
  resolve(req: string) {
    return req;
  }
}

/* FileSystem 文件系统 */
// ...

@injectable()
abstract class Converter {
  @inject(TYPES.resolver) private resolver!: Resolver;
  @inject(TYPES.fileSystem) private fs!: FileSystem;

  async process(req: string) {
    const path = this.resolver.resolve(req);
    const content = await this.fs.read(path);
    const result = this.convert(content);
    console.log(result);
  }
  abstract convert(content: string): string;
}

export async function main() {
  const container = new Container();
  container.bind<FileSystem>(TYPES.fileSystem).to(MockFileSystem);
  container.bind<Resolver>(TYPES.resolver).to(FileResolver);
  container.bind<Converter>(TYPES.toLetConverter).to(ToLetConverter);
  container.bind<Converter>(TYPES.toVarConverter).to(ToVarConverter);

  const toVarConverter = container.get<Converter>(TYPES.toVarConverter);
  const toLetConverter = container.get<Converter>(TYPES.toLetConverter);

  console.log("To Var Converter");
  await toVarConverter.process("a.js");
  console.log("To Let Converter");
  await toLetConverter.process("a.js");
}
```

## 优势

- 利于单元测试。从 Demo 可以看出，如果要改变某个依赖的实例，改变/增加容器注册逻辑即可。
- 可以替换具体实现。
