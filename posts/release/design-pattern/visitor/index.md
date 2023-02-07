---
date: "2022-03-05"
title: "设计模式 - 访问者模式 (Visitor)"
tags: ["design-pattern"]
abstract: "设计模式之访问者模式"
requirements: []
hidden_on_home: true
series: "design-pattern"
---

<Reference
entries={[
["访问者模式", "https://refactoringguru.cn/design-patterns/visitor"],
["访问者", "https://www.liaoxuefeng.com/wiki/1252599548343744/1281319659110433"]
]}
/>

## 概述

**访问者模式** 属于行为模式，可以将算法与作用对象分离开（通常是一组不同类型的对象），在不改变对象的情况下定义作用于对象的新操作。

## 结构

![visitor struct](./struct.png)

- Visitor (访问者接口): 声明了一系列访问具体对象的接口；
- Concrete Visitor (具体访问者)；

## 例子: 为文件与目录计算 Hash

假设我们希望为文件和目录提供计算 hash 的能力，但同时又不希望修改原有类，此时可以使用访问者模式。

```ts
declare const md5: (x: string) => string;

declare class File {
  public absolutePath: string;
}

declare class Directory {
  public absolutePath: string;

  public getFiles(): File[];
}

// Visitor interface
interface HashVisitor {
  getFileHash(file: File): string;
  getDirectoryHash(directory: Directory): string;
}

// Concrete visitor
export class SimpleHashVistor implements HashVisitor {
  getFileHash(file: File): string {
    return md5(file.absolutePath);
  }

  getDirectoryHash(directory: Directory): string {
    return md5(JSON.stringify([directory.absolutePath, ...directory.getFiles().map((file) => this.getFileHash(file))]));
  }
}
```

## 优缺点

优点:

- 开闭原则: 可以引入新行为，同时不需要修改原有类；
- 单一职责原则: 可将同一行为针对不同对象的不同实现集中到一个类中；

缺点:

- 在作用对象的类发生新增或删除时，需要更新所有的访问者；
- 无法直接访问私有变量与方法；

## 应用

### Rust 中的 Trait

访问者模式能见到的实际应用并不多，Rust 中的 Trait 算是鲜有的从语言层面支持访问者模式的例子（这里抛开了“将针对不同对象的同一行为集中到一个类中”这一特点，仅从“将算法与对象分离开”这点考虑）。

Trait 可以为类型附加行为，同时由于 Trait 只有使用方引入才生效（孤儿规则），因此没有修改原对象。

上述 Hash 的例子在 Rust 中可以表述为:

```rust
mod exist {
  pub struct File {
    pub absolutePath: String
  }
  pub struct Directory {
    pub absolutePath: String
  }

  impl Directory {
    pub fn getFiles(&self) -> Vec<File> {
      unimplemented!()
    }
  }

  pub fn md5(str: String) -> String {
    unimplemented!()
  }
  pub fn jsonStringify(x: Vec<String>) -> String {
    unimplemented!()
  }
}

mod lib {
  use super::exist::*;

  trait Hash {
    fn getHash(&self) -> String;
  }

  // 为 File 附加 Hash 行为
  impl Hash for File {
    fn getHash(&self) -> String {
      md5(self.absolutePath.clone())
    }
  }

  // 为 Directory 附加 Hash 行为
  impl Hash for Directory {
    fn getHash(&self) -> String {
      let mut v = vec![];
      v.push(self.absolutePath.clone());
      let mut fileHashes = self
        .getFiles()
        .iter()
        .map(|f| { f.getHash() })
        .collect::<Vec<String>>();
      v.append(&mut fileHashes);

      md5(jsonStringify(v))
    }
  }
}

fn main() {}
```
