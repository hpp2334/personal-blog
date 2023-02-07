---
date: "2022-04-03"
title: "从库学 Rust - tower"
tags: ["rust"]
abstract: "本文会介绍 tower 的核心、部分工具与特性，并会手动实现一部分工具与特性。"
requirements: []
series: "learn-rust-by-lib"
references:
  [
    ["tower - Github", "https://github.com/tower-rs/tower"],
    ["Inventing the Service trait", "https://tokio.rs/blog/2021-05-14-inventing-the-service-trait"],
  ]
---

## 前言

tower 是一个用于构建 client, server 的库，它定义了一系列定义相关 trait，并提供了包括并发控制、超时机制、负载均衡在内的一系列组件。

## 其他知识点

### pin_project_lite

[pin_project_lite](https://docs.rs/pin-project-lite/latest/pin_project_lite/) 是一个方便创建映射 (projection) 类型的库。这里举个例子，假设有类型 `struct State { x: CustomFuture }`，`Pin<&mut State>` 中 `x` 的类型为 `CustomFuture`，pin_project_lite 可以创建类型为 `Pin<&mut CustomFuture>` 的 `x`，这在需要 `Pin` 类型作为 `self` 时会非常方便。

官方给出的使用例子为:

```rust
use std::pin::Pin;

use pin_project_lite::pin_project;

pin_project! {
    struct Struct<T, U> {
        #[pin]
        pinned: T,
        unpinned: U,
    }
}

impl<T, U> Struct<T, U> {
    fn method(self: Pin<&mut Self>) {
        let this = self.project();
        let _: Pin<&mut T> = this.pinned; // Pinned reference to the field
        let _: &mut U = this.unpinned; // Normal reference to the field
    }
}
```

## 核心

### `Service`

`Service` trait 本质上是 `async fn (req: Request) -> Response`，[Inventing the Service trait](https://tokio.rs/blog/2021-05-14-inventing-the-service-trait) 一文阐述了 `Service` trait 背后的设计动机，本文不再赘述这一 `trait` 是如何产生的，只做简单总结。

`Service` trait 定义如下，`poll_ready` 类似于 Future 的 `poll`，用于判断该 service 是否已准备可调用，当返回 `Poll::Ready(Ok())` 后可以调用 `call` 取得返回 `Response` 的 Future。

```rust
pub trait Service<Request> {
    type Response;

    type Error;

    type Future: Future<Output = Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>>;

    fn call(&mut self, req: Request) -> Self::Future;
}
```

### `Layer`

`Layer` trait 用于装饰 `Service`，可用于实现中间件，它的定义如下：

```rust
pub trait Layer<S> {
    /// The wrapped service
    type Service;
    /// Wrap the given service with the middleware, returning a new service
    /// that has been decorated with the middleware.
    fn layer(&self, inner: S) -> Self::Service;
}
```

当实现一个 `Layer` 后，调用 `layer` 可以装饰其他的对象（一般是 `Service`），并得到装饰后的 `Service`。

## 工具 (util)

tower 中内置了一系列工具，如：

- `oneshot`: 提前接受 `req` 并返回 future, 当服务 ready 时会执行；
- `ready`: 返回当服务 ready 时会 yield 的 future；
- `call_all`: 接受 `Stream<Request>` 调用后并返回 `Stream<Response>`；
- ...

这些工具通过引入 `tower::ServiceExt` trait 使用。tower 提供的工具非常多，他们的实现有异曲同工之处，这里不一一说明他们的作用与实现方式，以下仅介绍 `Oneshot` 工具。

### `Oneshot`

`Oneshot` 工具 `trait` 可以预先将 `req` 提供给 `service`，其会在 `service` ready 后自动调用 `call` 并返回对应的 Future，如：

```rust
async fn echo() {
  // ... snip
  let res = echo_service.oneshot("Hello!").await.unwrap();
  assert_eq!(res, "Hello!");
}
```

下面来看如何实现 `Oneshot`。从用法可以看出，`Oneshot` 应当实现 `Future`，且内部实现多次状态转换：

- service 未 ready；
- service 已 ready，可调用 `call` 来处理 request；
- service 已返回结果；

可以在 `poll` 中实现对 `service` 与 `service` future 的 `poll`，核心实现如下：

```rust
impl<R, S> std::future::Future for OneshotFuture<R, S>
where
    S: Service<R>,
{
    type Output = Result<S::Response, S::Error>;

    fn poll(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Self::Output> {
        let mut this = self.project();
        loop {
            // 内部维护状态转换
            match this.state.as_mut().project() {
                OneshotStateProj::NotReady { req, inner } => {
                    // poll 直到 service ready
                    let _service_ready = ready!(inner.poll_ready(cx))?;
                    let req = req.take().unwrap();
                    // 处理 request
                    let fut = inner.call(req);
                    this.state.set(OneshotState::Called { fut });
                }
                OneshotStateProj::Called { fut } => {
                    // poll 直到 service 处理完成
                    let res = ready!(fut.poll(cx));
                    // 返回处理结果
                    return Poll::Ready(res);
                }
                _ => {}
            }
        }
    }
}
```

## 主要特性

### 服务发现 `Discover`

`Discover` trait 给出了描述一组动态变化的 service 的接口，其主要 API 是 `poll_discover`，核心是返回一个描述服务变化的 `Change` enum:

```rust
#[derive(Debug)]
pub enum Change<K, V> {
    // key 为 `K` 的服务 `V` 出现
    Insert(K, V),
    // key 为 `K` 的服务消失
    Remove(K),
}

pub trait Discover: Sealed<Change<(), ()>> {
    type Key: Eq;
    type Service；
    type Error;

    fn poll_discover(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Change<Self::Key, Self::Service>, Self::Error>>>;
}
```

### 负载均衡 `Load`, `TrackCompletion`, `Balance`

#### `TrackCompletion`

`TrackCompletion` trait 定义了跟踪一个请求完成的 API，衡量服务负载而言是需要其作为参考依据之一，它的定义如下:

```rust
pub trait TrackCompletion<H, V>: Clone {
    type Output;

    fn track_completion(&self, handle: H, value: V) -> Self::Output;
}
```

实现方在实现 `track_completion` API 时，需要在请求确实完成时，将 `handle` drop，并对 `value` 处理后返回。

tower 内置的对 `TrackCompletion` 的内置实现目前有:

- `CompleteOnResponse`: 即返回时则认为完成，这对 HTTP 等请求一次则返回一次的服务是成立的，而对于 WebSocket 等请求与返回次数不一定相同；

```rust
impl<H, V> TrackCompletion<H, V> for CompleteOnResponse {
    type Output = V;

    fn track_completion(&self, handle: H, value: V) -> V {
        drop(handle);
        value
    }
}
```

#### `Load`

`Load` trait 定义了如何获取 service 的负载:

```rust
pub trait Load {
    // 可比较的负载值，值越小则负载越低
    type Metric: PartialOrd;

    fn load(&self) -> Self::Metric;
}
```

tower 目前内置的 `Load` 实现有:

- `PendingRequests`: 根据正在处理的请求数量计算负载；
- `Peak-EWMA`: 使用 Peak-EWMA 算法计算负载；

#### `Balance`

`Balance` 提供了负载均衡的具体实现，目前 tower 提供的内置实现有:

- `p2c`: Power of Two Random Choices, 详见 [Module tower::balance::p2c](https://docs.rs/tower/0.4.12/tower/balance/p2c/index.html)

#### Demo 例子

在这一 Demo 中，会实现:

- `CustomService`: 初始化时需要写入负载期望 `load` 与返回内容 `payload`，其负载衡量直接为 `load` 的值；
- `SimpleBalance`: 一个简单的负载均衡器，接受一个静态的 service 列表，并按照 service 的负载进行一次静态排序，后续按照这一顺序作依次调用；

具体实现见以下的代码片段。

```rust
// ==== CustomService ====
pub struct CustomService {
    load: i32,
    payload: &'static str,
}

// impl CustomService {
// ... snip

// 负载直接取 self.load
impl Load for CustomService {
    type Metric = i32;
    fn load(&self) -> Self::Metric {
        self.load
    }
}


// ==== SimpleBalance ====
struct SimpleBalance<S, R>
where
    S: Service<R> + Load,
{
    index: usize,
    services: Vec<S>,
    _marker: PhantomData<R>,
}

// impl<S, R> SimpleBalance<S, R>
// ... snip

impl<S, R> Service<R> for SimpleBalance<S, R>
where
    S: Service<R> + Load,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.services
            .sort_by(|a, b| a.load().partial_cmp(&b.load()).unwrap());
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: R) -> Self::Future {
        if self.index == self.services.len() {
            self.index = 0;
        }
        let svc = &mut self.services[self.index];
        self.index += 1;
        svc.call(req)
    }
}

// 测试代码
async fn load_balance() {
    let svc1 = CustomService::new(100, "from service 1");
    let svc2 = CustomService::new(50, "from service 2");
    let svc_list = vec![svc1, svc2];

    // 将 svc1, svc2 放入均衡器中管理
    let svc_balance = SimpleBalance::new(svc_list);

    let reqs = stream::repeat(CustomRequest).take(3);
    // 将生成的 3 个请求依次交给均衡器调用
    let resps = svc_balance.call_all(reqs);
    let resps = Arc::new(Mutex::new(resps));

    // assert 返回内容的 util 闭包
    let assert_eq_payload = |payload: &'static str| async move {
        let resps = Arc::clone(&resps);
        let mut resps = resps.lock().unwrap();
        assert_eq!(
            Some(CustomResponse(payload)),
            (&mut resps).try_next().await.unwrap()
        );
    };
    assert_eq_payload.clone()("from service 2").await;
    assert_eq_payload.clone()("from service 1").await;
    assert_eq_payload.clone()("from service 2").await;
}
```

#### 使用例子

下列例子使用 `PeakEwmaDiscover`, `CompleteOnResponse`, `p2c` 来实现负载均衡。

```rust
async fn load_balance() -> anyhow::Result<()> {
    // CustomService 是自定义的 service
    // 会返回 new 传入的字符串
    // 返回前以随机时间调用 sleep，模拟处理时间长的情况
    let svc1 = CustomService::new("from service 1");
    let svc2 = CustomService::new("from service 2");

    // PeakEwmaDiscover 实现了 `Discover` trait
    // 可以认为其是一个 decorator，对传递的 svc 用 `PeakEwma` 装饰一层
    let svc_discover = tower::load::PeakEwmaDiscover::new(
        // `ServiceList` 是实现了 `Discover` trait
        // 其接受实现了 `IntoIterator<Service> 的对象并返回一系列的 Insert(k, svc)
        tower::discover::ServiceList::new(vec![svc1, svc2]),
        Duration::from_millis(30),
        Duration::from_secs(10),
        tower::load::completion::CompleteOnResponse::default(),
    );
    let svc = tower::balance::p2c::Balance::new(svc_discover);

    let reqs = stream::repeat(CustomRequest).take(10);
    let mut resps = svc.call_all(reqs).unordered();
    while let Some(resp) = resps.try_next().await.unwrap() {
        println!("{:?}", resp);
    }

    Ok(())
}

/*
Output
===========
CustomResponse("from service 1")
CustomResponse("from service 2")
CustomResponse("from service 2")
CustomResponse("from service 1")
...
*/
```

### 速率控制 `RateLimit`

#### 请求速率控制 `RateLimit`

`RateLimit` 用于对请求速率进行控制，其会在相接且不相交的若干个时间片中规定每个时间片内的最大请求次数。如以下片段限制了每 1000ms 内最多可以有 4 个请求。

```rust
let svc = ServiceBuilder::new()
    .layer(RateLimitLayer::new(4, Duration::from_millis(1000)))
    .service(CustomService);
// ...
```

在 `RateLimit` 的实现中，要点在于使用了 `tokio::time::Sleep` 作为控制任务唤醒，更新内部状态的工具：

- 在 `RateLimit` 的 `poll_ready` 中，`poll` sleep 对象用于判断当前时间片是否已结束，同时 `poll` 可以使得 waker 在 sleep 对象收到信号（如睡眠状态改变）时重新 wake；
- 在 `RateLimit` 的 `call` 中，当已过当前时间片时，调用 sleep 对象的 `reset` 重新设置睡眠时间；

```rust
impl<T> RateLimit<T> {
    pub fn new(inner: T, rate: Rate) -> Self {
        // ... snip

        RateLimit {
            // ... snip
            sleep: Box::pin(tokio::time::sleep_until(until)),
        }
    }
            // ... snip
}

impl<S, Request> Service<Request> for RateLimit<S>
where
    S: Service<Request>,
{
    // ... snip

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        match self.state {
            State::Ready { .. } => return Poll::Ready(ready!(self.inner.poll_ready(cx))),
            State::Limited => {
                // 已到达最大请求值，若还在当前时间片内则保持 Poll:Pending
                // 这里 poll(cx) 使得 sleep 被唤醒时重新调用 poll_ready
                if Pin::new(&mut self.sleep).poll(cx).is_pending() {
                    tracing::trace!("rate limit exceeded; sleeping.");
                    return Poll::Pending;
                }
            }
        }

        // ... snip
    }

    fn call(&mut self, request: Request) -> Self::Future {
        match self.state {
            State::Ready { mut until, mut rem } => {
                let now = Instant::now();

                // 时间片已过，更新下一个时间片
                if now >= until {
                    until = now + self.rate.per();
                    rem = self.rate.num();
                }

                if rem > 1 {
                    // 更新当前时间片剩余请求数量
                    rem -= 1;
                    self.state = State::Ready { until, rem };
                } else {
                    // 到达请求限制，重置 sleep 对象
                    self.sleep.as_mut().reset(until);
                    self.state = State::Limited;
                }
                self.inner.call(request)
            }
            State::Limited => panic!("service not ready; poll_ready must be called first"),
        }
    }
}
```

#### 请求并发控制 `ConcurrencyLimit`

`ConcurrencyLimit` 用于控制同时处理的请求数量。在 `ConcurrencyLimit` 的实现中，要点在于使用 tokio 的 `Semaphore` （即 “信号量”）实现并发数量控制。当 `poll_ready` 中，通过尝试 acquire 到 permit 才视为服务已准备，才能处理请求，否则将服务挂起，直到能够获取到 permit。

```rust
impl<S, Request> Service<Request> for ConcurrencyLimit<S>
where
    S: Service<Request>,
{
    // ... snip

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        // poll 直到获取到一个 permit
        if self.permit.is_none() {
            // 这里的 `poll_acquire` 来自于 tokio_util 库
            self.permit = ready!(self.semaphore.poll_acquire(cx));
            debug_assert!(
                self.permit.is_some(),
                "ConcurrencyLimit semaphore is never closed, so `poll_acquire` \
                 should never fail",
            );
        }

        // 已获取 permit，服务准备就绪
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request) -> Self::Future {
        // 取出 permit
        let permit = self
            .permit
            .take()
            .expect("max requests in-flight; poll_ready must be called first");

        let future = self.inner.call(request);
        // 将 permit 下放到 future，future 完成时能 drop permit
        ResponseFuture::new(future, permit)
    }
}
```

### `Buffer`

`Buffer` 允许对同一个服务创建多个 handle，每个 handle 都可以通过 mpsc channel 将请求转发给实际的 service 处理。以下是官方文档给出的例子，笔者加上了一点儿自己的注释。

```rust
use tower::buffer::Buffer;
use tower::{Service, ServiceExt};
async fn mass_produce<S: Service<usize>>(svc: S)
where
  S: 'static + Send,
  S::Error: Send + Sync + std::error::Error,
  S::Future: Send
{
    let svc = Buffer::new(svc, 10 /* buffer 长度 */);
    for _ in 0..10 {
        // clone handle service，并不会 clone 服务本身
        let mut svc = svc.clone();
        tokio::spawn(async move {
            for i in 0usize.. {
                // 每个进程都取得一个 handle，由于实际处理的服务只有一个，因此不会并行处理
                svc.ready().await.expect("service crashed").call(i).await;
            }
        });
    }
}
```

现在来考虑 `Buffer` 的实现。tower 内部的实现相对复杂，包括了一些日志信息、错误处理等，笔者这里提供了一个参考了 tower 实现后编写的更简单的版本，有兴趣的读者可翻阅 [tower Buffer 的源码](https://github.com/tower-rs/tower/tree/master/tower/src/buffer) 看看 tower 实际上是如何实现的。

由于实际上处理的 service 只有一个，service handle 有多个且需要与实际的 service 通信，发送请求并 poll 结果，因此将实现分为三个部分:

- `Buffer`: service handle 的实现；
- `BufferFuture`: service handle 返回的 future；
- `Worker`: 实际 service 从 sender 接受请求，返回结果给 service handle 返回的 future；

#### `Worker`

`Worker` 内部需要维护 poll mpsc receiver 的循环，这里的 mpsc receiver 应该包含接受请求 req 与发送处理结果 future 的 oneshot sender，因此可将 `Worker` 的结构定义如下:

```rust
// mpsc channel 传递的结构
struct SenderPayload<R, S>
    where S: Service<R> {
    // 请求
    req: R,
    // 返回请求处理结果 fut 的 oneshot sender
    signal_tx: oneshot::Sender<Result<S::Future, S::Error>>,
}

// 由于要在 `self: Pin<&mut Worker>` 中取 `&mut self.inner` 等，这里打一个 `pin_project!`
pin_project! {
    struct Worker<S, R>
        where S: Service<R> {
        inner: S,
        receiver: mpsc::Receiver<SenderPayload<R, S>>,
        // 目前保存的从 receiver 拿到的内容，供内部使用
        current_payload: Option<SenderPayload<R, S>>,
        // receiver 对应的 channel 是否已关闭
        end: bool,
    }
}
```

`Worker` 本身是独立的，应被 `spawn` 调度，因此需要 `impl Future`，主要逻辑也在其中实现。Future 内如何实现相对明朗：

1. 维护最新的 mpsc channel sender 发过来的数据，并且该数据还未被处理；
2. 按数据情况：
   - 如果该数据为 `None`: 结束内部循环；
   - 否则: `poll_ready` 内部 service，后调用 `call` 处理，得到的 future 通过 oneshot channel 发送给调用方；

```rust
impl<S, R> Worker<S, R>
    where S: Service<R>,
          S::Future: Send + 'static,
          S::Error: Send + 'static,
          R: Send + 'static {
    fn poll_next_payload(self: &mut Self, cx: &mut Context<'_>) -> Poll<()> {
        let next = ready!(self.receiver.poll_recv(cx));
        if let Some(payload) = next {
            self.current_payload = Some(payload);
        } else {
            self.current_payload = None;
            self.end = true;
        }

        Poll::Ready(())
    }
}

impl<S, R> Future for Worker<S, R>
    where S: Service<R>,
          S::Future: Send + 'static,
          S::Error: Send + 'static,
          R: Send + 'static {
    type Output = ();

    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        loop {
            match self.current_payload {
                None => {
                    if self.end {
                        return Poll::Ready(());
                    }
                    ready!(self.poll_next_payload(cx));
                }
                Some(_) => {
                    let res = ready!(self.inner.poll_ready(cx));

                    // 调用 `take` 取出 SenderPayload，使得 `poll_next_payload` 可以正常工作
                    let SenderPayload { req, signal_tx } = self.current_payload.take().unwrap();
                    let res = res.map(|_| {
                        self.inner.call(req)
                    });

                    signal_tx.send(res)
                        .map_err(|_| CustomError::new("send payload to signal_rx fail"))
                        .unwrap();
                }
            }
        }
    }
}
```

#### `BufferFuture`

`BufferFuture` 是返回给 service handle 调用方的 future，因此其内部主要涉及两件事情：

- 从 oneshot channel receiver 拉到请求处理结果 future；
- poll 处理结果 future；

实现上，定义数据结构 `Buffer`、内部转换状态 `BufferFutureState`，并在 `impl Future` 内实现状态转换。

```rust
pin_project! {
    // BufferFuture 内部状态
    #[project = BufferFutureStateProj]
    enum BufferFutureState<F, T, E>
    where F: Future<Output = Result<T, E>> {
        // 还未或正在 poll oneshot receiver
        Rx,
        // 还未或正在 poll 请求结果 future
        Fut {
            #[pin]
            fut: F,
        },
    }
}

pin_project! {
    struct BufferFuture<F, T, E>
    where F: Future<Output = Result<T, E>>
    {
        #[pin]
        signal_rx: oneshot::Receiver<Result<F, E>>,
        #[pin]
        state: BufferFutureState<F, T, E>,
    }
}

impl<F, T, E> Future for BufferFuture<F, T, E>
    where F: Future<Output=Result<T, E>> {
    type Output = Result<T, E>;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let mut this = self.project();

        loop {
            match this.state.as_mut().project() {
                BufferFutureStateProj::Rx => {
                    let res = ready!(this.signal_rx.as_mut().poll(cx))
                        .expect("recv error");
                    match res {
                        Ok(fut) => {
                            this.state.set(BufferFutureState::Fut { fut });
                        }
                        // 发生在 `Worker` 内的 `self.inner.poll_ready` 是可能返回 `S::Error` 的
                        // 此时直接返回 error
                        Err(e) => {
                            return Poll::Ready(Err(e));
                        }
                    }
                }
                BufferFutureStateProj::Fut { fut } => {
                    let res = ready!(fut.poll(cx));
                    return Poll::Ready(res);
                }
            }
        }
    }
}
```

#### `Buffer`

实现 `Buffer` 需要做的事情已比较清楚：

- 创建时：创建 `Worker` 并 `spawn` 以独立运行；
- `impl Service` 内：在 `call` 时将请求内容传递给 `Worker`，并构造 `BufferFuture` 返回；
- `impl Clone` 内：把 mpsc channel sender `clone` 一份；

实现上还是会有一部分细节，具体见以下代码片段：

```rust
struct Buffer<S, R>
    where
        S: Service<R>,
        S::Future: Send + 'static,
        S::Error: Send + 'static,
        R: Send + 'static
{
    // 来自 tokio_util::sync::PollSender
    // 可以被 poll
    poll_sender: PollSender<SenderPayload<R, S>>,
}

impl<S, R> Service<R> for Buffer<S, R>
    where S: Service<R> + 'static,
          S::Future: Send + 'static,
          S::Response: Send + 'static,
          S::Error: Send + 'static,
          R: Send + 'static {
    type Response = S::Response;
    type Error = S::Error;
    type Future = BufferFuture<S::Future, S::Response, S::Error>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        // poll_ready 内要给下面 `call` 时发送数据预留空间
        ready!(self.poll_sender.poll_reserve(cx))
            .expect("sender reserve error");
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: R) -> Self::Future {
        // 构建 oneshot channel
        let (signal_tx, signal_rx) = tokio::sync::oneshot::channel::<Result<S::Future, S::Error>>();
        // oneshot channel sender 给 `Worker`
        self.poll_sender.send_item(SenderPayload { signal_tx, req })
            .expect("poll_ready should call first");

        // oneshot channel receiver 给 `BufferFuture`
        BufferFuture {
            signal_rx,
            state: BufferFutureState::Rx,
        }
    }
}

impl<S, R> Buffer<S, R>
    where S: Service<R> + Send + 'static,
          S::Future: Send + 'static,
          S::Error: Send + 'static,
          R: Send + 'static {
    pub fn new(inner: S, buf_size: usize) -> Self {
        // 构造 mpsc channel
        let (tx, rx) = mpsc::channel(buf_size);
        // tx 自己留着，因为要 clone
        let poll_sender = PollSender::new(tx);

        // rx 交给 `Worker`
        let worker = Worker {
            inner,
            receiver: rx,
            current_payload: None,
            end: false,
        };
        // spawn `Worker` 以独立运行
        tokio::spawn(worker);

        Self {
            poll_sender,
        }
    }
}

impl<S, R> Clone for Buffer<S, R>
    where S: Service<R>,
          S::Future: Send + 'static,
          S::Error: Send + 'static,
          R: Send + 'static {
    fn clone(&self) -> Self {
        Self {
            poll_sender: self.poll_sender.clone(),
        }
    }
}
```

#### Demo 使用

最后，写一段 Demo 使用代码。需要注意的是，处理结束前原有的 service 不能被销毁，因此可以在最后构造一个永远 `Pending` 的 future 使得不会退出 main 函数。

```rust
pub fn demo_use_buffer() {
    let svc = ConstantService {
        poll_delay: Duration::from_millis(0),
        call_delay: Duration::from_millis(1000),
        last_poll_ready: Instant::now(),
        constant: 3,
    };
    let svc = tower::limit::ConcurrencyLimit::new(
        Buffer::new(svc, 10),
        2
    );

    for _ in 0..3 {
        let mut svc = svc.clone();
        tokio::spawn(async move {
            for i in 0usize.. {
                svc.ready().await.expect("service crashed").call(i).await;
            }
        });
    }
}

#[tokio::main]
async fn main() {
    buffer::demo_use_buffer();

    futures_util::future::pending::<()>().await;
}

/*
Output
===========
[CustomService] process request 0 done
[CustomService] process request 0 done
[CustomService] process request 1 done
[CustomService] process request 0 done
[CustomService] process request 2 done
[CustomService] process request 1 done
......
*/
```
