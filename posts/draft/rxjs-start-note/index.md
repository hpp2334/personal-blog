---
date: "2021-04-01"
title: "RxJS 入门笔记"
tags: ['fe']
abstract: 'RxJS 入门笔记'
requirements: [
  '熟悉观察者模式'
]
---

## 版本

RxJS: 6.6.7

## 前言

## 基础概念

### Observable, Observer, Subscription
 
- **Observable**（可观察对象）：通过 `subscribe` 订阅 observer；  
- **Observer**（观察者）：通过 `observable.subscribe` 订阅 observer。在 rxjs 中一般形式如 `{ next: Function, error: Function, complete: Function }`；  
- **Subscription**（订阅）：`observable.subscribe` 的返回对象。有 `unsubscribe()` 属性可取消订阅；有 `add` 属性可添加其他 subscription，`unsubscribe` 时会一起取消订阅；  

```js
const observerA = {
  next: (val) => {
    log("observerA: next is", val);
  },
  complete: () => {
    log("observerA: complete!");
  }
};
const observerB = {
  next: (val) => {
    log("observerB: next is", val);
  },
  complete: () => {
    log("observerB: complete!");
  }
};
const observable = new Observable((subscriber) => {
  subscriber.next(1);
  setTimeout(() => {
    subscriber.next(2);
    subscriber.complete();
  });
});

const subscriptionA = observable.subscribe(observerA);
const subscriptionB = observable.subscribe(observerB);
subscriptionB.unsubscribe();

// Log:
// observerA: next is 1
// observerB: next is 1
// observerA: next is 2
// observerA: complete!
```

### Subject

**Subject** 类似 `EventEmitter`，是手动执行的 observable（类似于 generator 与 async/await 的关系）。有 `next()`, `complete()`, `error()` 属性可调用。  

```js
const observer = {
  next: (val) => {
    log("observer: next is", val);
  },
  complete: () => {
    log("observer: complete!");
  }
};
const subject = new Subject();
subject.subscribe(observer);
subject.next(1);
log("between 1 and 2");
subject.next(2);
subject.complete();

// observer: next is 1
// between 1 and 2
// observer: next is 2
// observer: complete!
```

Subject 有一些特殊变体：

- BehaviorSubject：有当前值的 subject，通过 `new BehaviorSubject(initialValue)` 实例化，当 `subscribe` 时会立即发出当前值；  
- ReplaySubject：有缓存的 subject，通过 `new ReplaySubject(bufferSize)` 实例化，当 `subscribe` 根据缓存数量大小 `bufferSize` 发出缓存值（BehaviorSubject 可以视为缓存数量为 1 的 ReplaySubject）；  
- AsyncSubject：只有最后的值会被发送的 subject，通过 `new AsyncSubject()` 实例化；  


### Operator

**Operator** 实际上即为 util 函数，增强 rxjs 实用性。若有 `obs: Observable`，则有两种方式使用 operator：  

```js
// op1, op2, op3 为 operator
// Method 1：直接调用
op3()(op2()(op1()(obs)))

// Method 2：使用 pipe （即 pipeline）
obs.pipe(
  op1(),
  op2(),
  op3(),
)
```

常用的 operator 有 `fromEvent`, `map` 等，以下列举常见 operator 及用途，更多 operator 见 [官方文档](https://rxjs-dev.firebaseapp.com/api)。  

- tap: 执行副作用  


### Scheduler

**Scheduler** 可以控制当消息到达时 subscription 的触发时机。

```js
const observable = from([1, 2, 3]).pipe(observeOn(asyncScheduler));
const observer = {
  next: (val) => log("observer: val is", val)
};
log("before subscribe");
observable.subscribe(observer);
log("after subscribe");

// before subscribe
// after subscribe
// observer: val is 1
// observer: val is 2
// observer: val is 3
```

<Collapse title="完整 Demo" maxHeight="500">
<iframe src="https://codesandbox.io/embed/rxjs-simple-demo-p7q4t?fontsize=14&hidenavigation=1&theme=dark"
  style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
  title="rxjs-simple-demo"
  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>
</Collapse>

## 简单应用

## 与 Angular 的关系

> [Angular 中的可观察对象](https://angular.cn/guide/observables-in-angular)

Angular 中多处使用了 RxJS 中的 Observable，包括了：

- `EventEmitter`： 派生了 `Subject`；  
- `AsyncPipe`：模板中的 `obj|async` 为 async 管道，其中 obj 为 observable 或 promise，这一操作使得值被订阅；  
- HTTP 模块使用 observable 处理请求  
- ...  

