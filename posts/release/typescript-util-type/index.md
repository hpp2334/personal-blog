> Author: hpp2334  
> Thanks: Alex

## 环境

- TypeScript: 4.0.3

## 前言

本文为 **学习笔记向文**，希望通过手写一些 utility types 来加深对 TypeScript 类型的理解，此处 utility types 被人为地分为了七类:

- Logic: 处理逻辑，主要为与或非运算
- Class: class 语法相关 (是语法相关，即 ES6 Class 语法)
- Union
- Object
- List
- Iterator: 人为构造的迭代器相关
- Any: 其他

他们的实现大量参考（抄）了 TypeScript 内置 utility types 的实现 与库 ts-toolbelt 的实现。希望读者在阅读之前使用过 TypeScript 内置的 utility types，如 `Partial`, `Parameters` 等。

一些知识点为个人总结，无官方出处，会有错漏或疏忽的地方，望及时指出 QAQ

## 参考

- ts-toolbelt: [https://github.com/millsp/ts-toolbelt](https://github.com/millsp/ts-toolbelt)
- Utility Types: [https://www.typescriptlang.org/docs/handbook/utility-types.html](https://www.typescriptlang.org/docs/handbook/utility-types.html)

## 一些笔者容易疏忽的知识点

### 类型操作中的 `extends`

类型操作中的 `extends` 一般出现在:

- 泛型: 如 `<T extends string>(arg: T){ return arg }`
- Conditional Types: `T extends U ? X : Y`

对于形如 `T extends U`，表示 `T` 是 `U` 的子集，或者说，**`T` 可以赋值给 `U` (`U = T` 合法)**。以下是一些 `T extends U` 成立的情况:

- Object:
  - `{ a: number, b: number } extends { a: number }` (T 中 key 对应的每一项可以赋值给 U 中的对应项)
  - `{ a: number, b: number } extends { a: number, b?: number }`
  - `{ a: number, b: number } extends { a: number, b?: number | string }`
  - `{ a: number, b: boolean } extends { b: boolean, [k: string]: boolean | number }`
- Function:
  - `((a: number) => void) extends ((a: number, b: string) => void)` (U 中函数参数列表中的每一项能够一一赋值给 T 中的参数。为什么？这在 callback 中很常见，如 `[1, 2, 3].filter((x) => x < 3)`，此处 `filter` 的类型声明为 `filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[]`)
  - `(() => number) extends (() => number | string)` (T 的返回值可以赋值给 U)

### infer

#### 作用

conditional types 中允许在 `T extends U ? X : Y` 中的 `U` 中使用 `infer` 用于类型提取，被 `infer` 的类型只能在 true 分支 (即 `X`) 中使用，如:

```ts
type Tail<T extends any[]> = T extends [any, ...infer A] ? A : [];

// Tail<[12, string, 's', boolean]> === [string, 's', boolean]
```

上述 `Tail` 用于截取 tuple 第二项到最后一项，用 `infer` 可以提取他们的类型并在 true 分支使用这个类型。

#### 推导为 union/intersection

某些情况下，infer 会得到 union/intersection 以符合 extends 的要求:

```ts
type ReturnT<T> = T extends (...args: any[]) => infer R ? R : never;
type t = ReturnT<(() => string) | (() => number)>;
// type t = string | number
```

上述情况下，当 `ReturnT` 中的 `R` 被推导为 `string | number` 时走 true 分支 。

```ts
type Params<T extends any> = (T extends any ? T : never) extends (
  a: infer R
) => void
  ? R
  : never;
type t1 = Params<((a: { a: number }) => any) | ((a: { b: string }) => any)>;
// type t1 = {
//   a: number;
// } & {
//   b: string;
// }
```

上述情况下也是如此。注意其中的 `(T extends any ? T : never)`，是为了防止后续操作因 union 在 conditional types 下出现分配率 (distributive) 而编写的。

#### overload 下的 infer

当对一个重载函数的内部信息进行 infer 时，只能得到在最后一个重载形式下 infer 的信息。（原文档的表述是: 当从一个具有多重 call signatures 的类型 infer 时，只能得到从最后的 signature 进行 infer 的结果）

```ts
interface OverloadedFunctionType {
  (x: number): boolean;
  (x: number, y: string): symbol;
}

type t1 = OverloadedFunctionType extends (...args: infer X) => any ? X : never;
// type t = [x: number, y: string]
```

### union 中的 never

never 在 union 中会被自动忽略，除非 union 最后为空。

```ts
type t1 = string | never | number;
// type t1 = string | number
type t2 = never | never;
// type t2 = never
```

### `new (...args: A) => B`

`new (...args: A) => B` 用于表述某种类，其构造函数参数类型为 A，类的类型为 B。

```ts
class Rectangle {
  width!: number;
  height!: number;
  constructor(width: number, height: number) {}
  size() {
    return this.width * this.height;
  }
}
type Extends<T, U> = T extends U ? true : false;
type TypeRectangle = typeof Rectangle;

type t1 = Extends<
  TypeRectangle,
  new (width: number, height: number) => Rectangle
>; // true
type t2 = Extends<
  TypeRectangle,
  {
    new (width: number, height: number): Rectangle;
    prototype: {
      size(): number;
    };
  }
>; // true
```

### union 具有分配率的常见情况

- Distributive Conditional Types: `T extends U ? X : Y`，其中 T 是 **裸的泛型参数**
- 作为 Object 的 index
- 作为 Tuple 的 index

```ts
// Distributive Conditional Types
type T<A> = A extends number ? [A] : never;
type t1 = T<0 | 1 | "a" | 3>; // type t1 = [0] | [1] | [3]

// 作为 Object 的 index
type t2 = {
  a: "1";
  b: "2";
  c: "3";
}["a" | "c"]; // type t2 = "1" | "3"

// 作为 Tuple 的 index
type t3 = [string, number, boolean][0 | 2]; // type t3 = string | boolean
```

## 约定

- 每一类 utility types 被一个 namespace 包裹，如 Logic 分类下的被 `namespace NspLogic` 包裹。
- 有以下用于类型检查的函数
  - `checks(...args: true[])`
  - `check<T, U = true>()`: 要求 `T` 和 `U` 类型相同时
- 有类型 `List`，定义为 `type List<T = any> = ReadonlyArray<T>`

## Utility Types

### Logic

#### `And`， `Or`, `Not`

`And` 与 `Or` 都可以用嵌套 `extends` 的方式编写，使用 mapped types 则结构上更加清晰。

```ts
namespace NspLogic {
  type B2N<T extends boolean> = T extends true ? 1 : 0;

  export type And<T extends boolean, U extends boolean> = {
    1: {
      1: true;
      0: false;
    };
    0: {
      1: false;
      0: false;
    };
  }[B2N<T>][B2N<U>];
  export type Not<T extends boolean> = T extends true ? false : true;
  export type Or<T extends boolean, U extends boolean> = Not<
    And<Not<T>, Not<U>>
  >;
}
```

#### `Extends`

```ts
namespace NspLogic {
  export type Extends<T, U> = T extends U ? true : false;
}
```

`Extends` 常配合 `And`, `Or`, `Not` 使用。

### Any

#### `Equal`

Equal 的一个可行的实现为:

```ts
namespace NspAny {
  export type Equal<T1, T2> = (<A>() => A extends T1 ? 1 : 0) extends <
    A
  >() => A extends T2 ? 1 : 0
    ? true
    : false;

  checks(
    check<Equal<1, 0>, false>(),
    check<Equal<1, 1>, true>(),
    check<Equal<true, false>, false>(),
    check<Equal<string | number, string>, false>(),
    check<Equal<string | number, number | string>, true>(),
    check<Equal<string & number, number & string>, true>(),
    check<Equal<{ a: number }, { b: number }>, false>(),
    check<Equal<any, string>, false>()
  );
}
```

[https://github.com/Microsoft/TypeScript/issues/27024](https://github.com/Microsoft/TypeScript/issues/27024) 中 fatcerberus 关于此实现的原理描述为:

> AFAIK it relies on conditional types being deferred when T is not known. Assignability of deferred conditional types relies on an internal isTypeIdenticalTo check, which is only true for two conditional types if:
> Both conditional types have the same constraint
> The true and false branches of both conditions are the same type

当 conditional types 无法推断类型时，其推断行为会被延迟 (deferred)。两个被延迟推断的 conditional type 当条件部分相同且 true 与 false 分支类型分别相同时，其中一个可以赋值给另一个。因此，可以构造 deferred conditional types，通过控制约束部分根据 T 类型而不同，true/false 分支类型相同，将两个 conditional types 做一次 extends，来实现 Equal。

#### `Cast`

```ts
type Cast<T, U> = T extends U ? T : U;
```

`Cast` 常在其他 utility type 的实现中作为处理边缘情况的 type 使用。

### Class

#### `ConstructorParameters`, `InstanceType`

- `ConstructorParameters`: 获得类构造函数参数类型
- `InstanceType`: 获得类的实例类型

class 可以 extends `new (...args: any[]) => any`，利用此特性，在合理的位置 infer 可实现上述方法。

```ts
namespace NspClass {
  export type ConstructorParameters<T extends new (...args: any[]) => any> =
    T extends new (...args: infer R) => any ? R : never;
  export type InstanceType<T extends new (...args: any[]) => any> =
    T extends new (...args: any[]) => infer R ? R : never;

  class A {
    constructor(a: number, b: string) {}
  }
  checks(
    check<ConstructorParameters<typeof A>, [number, string]>(),
    check<InstanceType<typeof A>, A>()
  );
}
```

### Union

#### `Exclude`, `Extract`

- `Exclude<T, U>`: 从 `T` 中去除 `U` (差集)
- `Extract<T, U>`: 从 `T` 中挑出 `U` (交集)

上述两个方法，利用 distributive conditional types 和 never 在 union 中会被忽略的性质实现。基于他们，可以实现 `NonNullable` 等。

```ts
namespace NspUnion {
  export type Exclude<T, U> = T extends U ? never : T;
  export type Extract<T, U> = T extends U ? T : never;

  export type NonNullable<T> = Exclude<T, null | undefined>;
}
```

#### `ListOf`

`ListOf` 将 Union 转换为 List，一种可行的方式为:

1. 利用 infer 特性，将 union 转为 intersection
2. 利用 infer 对重载函数的特性，构造重载函数 `(a: T) => void`，取出 T，此时的 T 为原 union 的最后一项
3. 维护一个 list，不断利用 (2) 取出其中的最后一项 prepend 到 list 中

```ts
namespace NspUnion {
  // 将 union T 转为 union (a: T) => void，对参数 infer 即得到 intersection
  type IntersectionOf<T> = (T extends any ? (a: T) => void : never) extends (
    a: infer R
  ) => void
    ? R
    : never;
  // 参数 infer 即得到最后一个参数的类型
  type Last<T> = IntersectionOf<
    T extends any ? (a: T) => void : never
  > extends (a: infer R) => void
    ? R
    : never;
  // 递归构建 list，每次查找最后一个类型并 prepend 进 list
  type _ListOf<T, RES extends List = [], LastT = Last<T>> = {
    0: _ListOf<Exclude<T, LastT>, NspList.Prepend<RES, LastT>>;
    1: RES;
  }[[T] extends [never] ? 1 : 0];
  type ListOf<T> = _ListOf<T>;

  type t = ListOf<1 | 2 | 3 | { a: 1 } | { b: 2 }>;
  // type t = [1, 3, 2, {
  //     a: 1;
  // }, {
  //     b: 2;
  // }]
}
```

### List

#### Iterator

在处理 list 部分，有时需要遍历 list，可以实现 iterator (迭代器) 以满足该需求，其具备能力:

- 获取具体位置 (数字下标)
- 获取 prev, next 迭代器
- 根据 string/number 生成一个迭代器

可以用 tuple 来表示 iterator 的结构，构造 map 存储 iterator，如:

```ts
type MAP = {
  "0": ["0", 0, "__", "1"];
  "1": ["1", 1, "0", "2"];
  "2": ["2", 2, "1", "3"];
  "3": ["3", 3, "2", "4"];
  "4": ["4", 4, "3", "5"];
  "5": ["5", 5, "4", "6"];
  "6": ["6", 6, "5", "__"];

  [k: string]: Iterator;
};

type Iterator = [string, number, string, string];
/*
[
  current(string), // 当前数值 (string 类型)
  current(number), // 当前数值 (number 类型)
  prev_idx,        // prev iterator 在 map 中的下标 (不存在为 '__'，下同)
  next_idx         // next iterator 在 map 中的下标
]
*/
```

这样需要的数据直接从 tuple 或 map 中取后处理，便可实现 iterator 所需的能力。

```ts
namespace NspIterator {
  // 省略 Map 的实现部分
  // 省略 Iterator 的实现部分
  export type Prev<I extends Iterator> = MAP[I[2]];
  export type Next<I extends Iterator> = MAP[I[3]];
  export type Pos<I extends Iterator> = I[1]; // 取位置
  // 构造 iterator
  export type IteratorOf<n extends number | string> = n extends keyof MAP
    ? MAP[n]
    : Iterator;
}
```

#### `Concat`, `Prepend`, `Append`

利用 spread operator 可实现这三个方法。

```ts
namespace NspList {
  export type Concat<T extends List, U extends List> = [...T, ...U];
  export type Append<T extends List, U> = [...T, U];
  export type Prepend<T extends List, U> = [U, ...T];
}
```

#### `Tail`

`Tail` 用于构造去除首元素后剩下的 list。利用 spread operator 与 infer 可实现该方法。

```ts
namespace NspList {
  export type Tail<T extends List> = T extends [any, ...infer A] ? A : [];
}
```

### Object

#### `Partial`, `Required`, `Readonly`

mapped type 支持修饰符 `?` 和 `readonly`。在 TypeScript 2.8 时，官方增加了使用 `+`/`-` 增加或删除修饰符的特性，在不使用 `+`/`-` 时效果等同于 `+`，即增加。基于此，可实现上述方法。

```ts
namespace NspObject {
  export type Partial<T> = { [P in keyof T]?: T[P] };
  export type Required<T> = { [P in keyof T]-?: T[P] };
  export type Readonly<T> = { readonly [P in keyof T]: T[P] };
}
```

#### `Filter`

`Filter<T, K>` 为返回 T 中值为 K 中的项 (key-value 对) 构成的 object，如:

```ts
type t1 = Filter<{ a: string; b: number; c: boolean; d: number }, number>;
// type t1 = {
//   b: number;
//   d: number;
// }
```

由于要删除某些项，可以想到可将 keys 转 union，除去不符合条件的 key，再转为 object，具体的:

1. 构造 mapped type，当 key 符合条件 (即 `NspAny.Equal<key, K> extends true`) 时，值为 key，否则为 never。利用 index 的分配率，下标传入包含所有 key 的 union 将所有 value 转为 union，此时由于不符合条件的 value 为 never，故不会出现在 union 中
2. 用 `Pick` 和得到的 union 转换 object

```ts
namespace NspObject {
  type FilterKeys<T extends {}, K> = {
    [P in keyof T]: NspAny.Equal<T[P], K> extends true ? P : never;
  }[keyof T];
  export type Filter<T extends {}, K> = Pick<T, FilterKeys<T, K>>;
}
```

### Function

#### `OmitThisParameter`, `ThisParameterType`

- `OmitThisParameter`: 忽略函数中 this 参数
- `ThisParameterType`: 获得函数中 this 参数的类型

合理 infer 可实现。

```ts
namespace NspFunction {
  export type OmitThisParameter<T> = T extends (
    this: any,
    ...args: infer U
  ) => infer V
    ? (...args: U) => V
    : T;
  export type ThisParameterType<T> = T extends (
    this: infer R,
    ...args: any
  ) => any
    ? R
    : unknown;
}
```

#### `Parameters`, `Length`, `ReturnType`

- `Parameters`: 获取函数参数列表类型
- `Length`: 获取函数参数个数
- `ReturnType`: 获取函数返回值类型

对于 `Parameters`, `ReturnType` 依然使用 infer 实现，`Length` 则利用 list 的 `length` 属性获取。

```ts
namespace NspFunction {
  export type Parameters<T extends (...args: any[]) => any> = T extends (
    ...args: infer R
  ) => any
    ? R
    : never;
  export type Length<T extends (...args: any[]) => any> =
    Parameters<T>["length"];
  export type ReturnType<T extends (...args: any[]) => any> = T extends (
    ...args: any[]
  ) => infer R
    ? R
    : never;
}
```

#### `Curry`

`Curry` 即 curry (函数柯里化) 的类型。

考虑一种特殊情况:将一个 N 元函数转化为多个一元函数 (其实这是 curry 原本的定义，只是实际应用中希望其可转换为多个接受不定参数的函数)。记传入参数类型为 Fn (此处假设 Fn 的参数列表非空)，则应返回 `(a: Parameters<Fn>[0]) => R`，这里的 R 进行分类讨论:

- 若 Fn 的参数列表长度为 1 (`Parameters<Fn>['Length'] extends 1`)
  - 则为 Fn 的返回值类型
- 否则
  - 返回 `Curry<(...args: B) => ReturnType<Fn>>`，其中 B 为 Fn 的参数列表中除去第一个剩下的，即 `Tail<Parametes<Fn>>`

```ts
namespace NspFunction {
  type Curry_OneParameter<Fn extends (...args: any[]) => any> = <
    A extends any[] = Parameters<Fn>,
    B extends any[] = NspList.Tail<A>,
    R = ReturnType<Fn>
  >(
    a: Parameters<Fn>[0]
  ) => Length<Fn> extends 1 ? R : Curry_OneParameter<(...args: B) => R>;

  declare const f1: Curry_OneParameter<(x: number) => void>;
  f1(1);
  declare const f2: Curry_OneParameter<
    (x: number, y: string, z: boolean) => boolean
  >;
  const f2_r1 = f2(0)("str")(false);
  // const f2_r1: boolean
  const f2_r2 = f2(0)(1)(true);
  // Error: Argument of type 'number' is not assignable to parameter of type 'string'.ts(2345)
}
```

推广到更一般的情况，需要考虑两个问题:

1. 返回形式形如 `Curry<Fn> = (...args: T) => R`，此处的 `T` 基于用户输入，但又不应与原函数参数列表前缀不匹配，其应该如何编写？
2. `Curry<(...args: B) => ReturnType<Fn>>` 中的 `B` 对应于原参数列表去除 `A['length']` 个元素后剩下的列表，应如何实现？

对于问题 1，由于 T 实际上是基于使用者的输入，因此 T 的一种实现是将 T 作为泛型参数，构造原参数列表对应的全为 optional 形式的列表，然后将 T cast 到该列表上，具体的:

1. 将原参数列表 `Partial` 后对每一个 value 做一次 `NonNullable`，使得每一项都是 optional 的 object 并且去掉因 `?` 修饰符而引入的 undefined
2. 通过 `Cast` 将该 object 转为 list
3. 通过 `Cast` 将 T cast 到该 list 上

由于第 3 步的存在，当用户输入了不满足构造 list 的情况，该 list 会作为参数列表类型，此时又由于输入不满足，使得 TypeScript 报告错误。

```ts
namespace NspFunction {
  type Optionalize<L extends List> = NspAny.Cast<
    NspObject.NonNullable<Partial<L>>,
    List
  >;
  export type Curry<Fn extends (...args: any[]) => any> = <
    A extends List,  // 已用参数
    /* ...省略 */
  >(
    ...args: NspAny.Cast<A, Optionalize<Parameters<Fn>>>
  ) => /* ...省略 */
}
```

对于问题 2，不难想到可以扩展一下 Tail 类型，得到一个能够去除某列表前 N 个元素的类型。记 `OmitFirstNElements<L, N>` 的作用是获得忽略 `L` 前 N 个元素得到的 list，其只需要调用 N 次 `Tail` 即可。如何调用 N 次呢？一种方式为: 令 N 是 iterator，将调用 N 次表述为递归形式，每次递归取 `N = NspIterator.Prev<N>`，当 `NspIterator.Pos<N>` 为 0 时，则说明调用了 N 次。

```ts
namespace NspFunction {
  type _OmitFirstNElements<L extends List, N extends NspIterator.Iterator> = {
    0: _OmitFirstNElements<NspList.Tail<L>, NspIterator.Prev<N>>;
    1: L;
  }[NspLogic.Or<
    NspLogic.Extends<NspIterator.Pos<N>, 0>,
    NspLogic.Extends<number, NspIterator.Pos<N>> // 迭代器不存在时，值为 number
  > extends true
    ? 1
    : 0];

  // 避免 "Type instantiation is excessively deep and possibly infinite. ts(2589)"
  // 参见 https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
  // 关于这个错误，目前笔者没有找到更深入讨论其常见解决方案原理的内容
  type OmitFirstNElements<A extends List, B extends List> = _OmitFirstNElements<
    A,
    NspIterator.IteratorOf<B["length"]>
  > extends infer X
    ? NspAny.Cast<X, List>
    : never;
}
```

有了 `OmitFirstNElements`， `Curry` 的实现如下:

```ts
namespace NspFunction {
  export type Curry<Fn extends (...args: any[]) => any> = <
    A extends List,
    B extends List = OmitFirstNElements<Parameters<Fn>, A>,
    R = ReturnType<Fn>
  >(
    ...args: NspAny.Cast<A, Optionalize<Parameters<Fn>>>
  ) => B["length"] extends 0 ? R : Curry<(...args: B) => R>;

  declare const fCurry: Curry<(a: number, b: string, c: boolean) => symbol>;
  fCurry(1)("2", false);
  fCurry(1, "2", false);
  fCurry(1)("2")(false);
  fCurry(1, "2", false);
}
```

ts-toolbelt 中，实现了支持 placeholder 的 curry，有兴趣的可查看源码 ([https://github.com/millsp/ts-toolbelt/blob/master/src/Function/Curry.ts](https://github.com/millsp/ts-toolbelt/blob/master/src/Function/Curry.ts)) 此处不再展开。

## 最后

### checks 与 check 函数的实现

```ts
declare function check<T, U = true>(): NspAny.Equal<T, U>;
declare function checks(...arr: true[]): void;
```

### Equal 的伪实现

关于 Equal 的实现，笔者在没抄 ts-toolbelt 实现前写了几个假版本。

```ts
type FakeEqual1<T, U> = T extends U ? (U extends T ? true : false) : false;
```

问题何在呢？一个问题在于分配率问题，如:

```ts
type t1 = FakeEqual1<string | number, number>; // type t1 = 0 | 1
```

解决分配率倒是不麻烦，可以转为 tuple，如:

```ts
type FakeEqual2<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;

type t1 = FakeEqual2<string | number, number>; // type t1 = false
type t2 = FakeEqual2<any, string>; // type t2 = true
```

分配率问题解决了，但是并不能解决 `any` 的问题 = = (`any` 作为规避类型检查的用途，任何类型可以赋值给 `any`，`any` 也可以赋值给任何类型)
