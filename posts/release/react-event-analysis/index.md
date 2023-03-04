## 前言

React 使用合成事件机制，React 17 中将 React 事件对应的原生事件绑定在 `root` 元素上（而非 `document`），这样做的好处有：

- 抹平浏览器之间的差异
- 允许带优先级调度任务
- 相对于绑定在 `document` 上，绑定在 `root` 上可以使得多个 React 版本同时运行时在事件处理上不冲突

下图是对 React 事件机制的总结，读者如有疑惑，可在阅读全篇后再看此图。

![React 事件机制](/react-event-analysis/react-event.png)

接下来，将通过源码分析 React 事件机制。需要注意，本文对源代码有简化甚至是修改，需要精确的源代码请自行查看官方 repo。

## DOM 事件机制的一些注意点

1. 事件传播按顺序为：捕获阶段（`capture`），目标阶段，冒泡阶段（`bubble`）；
2. `ev.target` 为事件发出者，`ev.currentTarget` 为事件绑定者（在事件传播中会变化）；
3. `ev.stopPropagation()` 可阻止事件传播，`ev.preventDefault()` 可阻止一些默认行为；

## React 事件优先级

按优先级这一维度，React 将事件划分为三类：

- 离散事件（DiscreteEvent）：不连续触发，如 `onClick` 等，优先级最低；
- 用户阻塞事件（UserBlockEvent）：连续触发，如 `onMouseOver` 等；
- 连续事件（ContinuousEvent）：`onCanPlay`, `onError` 等，优先级最高；

## React 中将什么 listener 绑定到 root 上？

**同 DOM 事件类型** 且 **传播阶段相同** 的绑定在 root 上的 listener 只有一个，简单逻辑代码可表述如下：

```js
function listenerWrapper(
  targetInst, // 事件发生者
  inCapturePhase // 是否处于捕获阶段
) {
  /** @type {Array<{ event: any, listeners: any[] }>} */
  const listenerQueue = [];
  // 从 targetInst 沿根行走，将对应 fiber 上的 listener 封装后再封装为合成事件，最后放入 listenerQueue 中
  extract(listenerQueue, targetInst);
  // ...
  for (const { event, listeners } of listenerQueue) {
    if (inCapturePhase) {
      // 在捕获阶段
      for (let i = listeners.length - 1; i >= 0; i--) {
        if (event.isPropagationStopped) {
          // 停止广播
          return;
        }
        executeListener(
          listners[i].listener,
          listeners[i].currentTarget /* ... */
        );
      }
    } else {
      // 在冒泡阶段
      // ... 逻辑与在捕获阶段的基本相同
    }
  }
}
```

当然，上述代码省略与修改了很多细节，要考虑的还有很多，如：

- 优先级如何表现？
- 沿根走如何收集 listener 及相关信息？
- 合成事件是怎么封装的？
- ...

### listenerWrapper 的创建

`createEventListenerWrapperWithPriority` 用于创建 listenerWrapper，后该 listenerWrapper 会绑定到某 DOM 元素上。在该方法内，会根据事件名决定具体使用的 listenerWrapper。listenerWrapper 有：

- `dispatchDiscreteEvent`：处理离散事件
- `dispatchUserBlockingUpdate`：处理用户阻塞事件
- `dispatchEvent`：处理连续事件

```js
export function createEventListenerWrapperWithPriority(
  targetContainer: EventTarget,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags
): Function {
  const eventPriority = getEventPriorityForPluginSystem(domEventName);
  let listenerWrapper;
  switch (eventPriority) {
    case DiscreteEvent:
      listenerWrapper = dispatchDiscreteEvent;
      break;
    case UserBlockingEvent:
      listenerWrapper = dispatchUserBlockingUpdate;
      break;
    case ContinuousEvent:
    default:
      listenerWrapper = dispatchEvent;
      break;
  }
  return listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer
  );
}
```

`dispatchEvent` 会间接调用 `dispatchEventsForPlugins`，其收集 listeners 同时创建合成事件，后执行 listeners。

```js
function dispatchEventsForPlugins(/* ... */): void {
  const nativeEventTarget = getEventTarget(nativeEvent);
  const dispatchQueue: DispatchQueue = [];
  // 收集 listeners 并生成合成事件
  extractEvents(/* ... */);
  // 执行 listeners
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}
```

### listener 的收集

listenerWrapper 触发时会在内部执行需要被执行的 listener，因此触发时 listenerWrapper 时需要收集 listener。

需要注意，React 事件与原生事件并不一定是一一对应的，如 `onMouseEnter` 事件同时依赖了 `mouseout` 与 `mouseover` 原生事件。另外，React 可能使用使用 polyfill 的方式实现事件，如 `onMouseEnter`, `onMouseLeave`。这便在一定程度上使得 React 为不同的事件设立 plugin 用于处理事件相关事宜，其中便包括了 listener 的收集。除 SimpleEventPlugin 外的插件为 polyfillPlugin。

- SimpleEventPlugin：处理大部分事件
- SelectEventPlugin：处理 `onSelect`，适用于 `input`, `textarea`, `contentEditable`
- EnterLeaveEventPlugin：处理 `onMouseEnter`, `onMouseLeave`, `onPointerEnter`, `onPointerLeave`
- ChangeEventPlugin：处理 `onChange`
- BeforeInputEventPlugin：处理 `onBeforeInput`, `onCompositionEnd`, `onCompositionStart`, `onCompositionUpdate`

SimpleEventPlugin 会间接调用 `accumulateSinglePhaseListeners` 以收集 listener。该方法会从 targetFiber 到根收集 listener（通过 `fiber.return` 访问父亲）。

```js
function createDispatchListener(instance, listener, currentTarget) {
  return { instance, listener, currentTarget };
}

export function accumulateSinglePhaseListeners(
  targetFiber: Fiber | null,
  reactName: string | null,
  nativeEventType: string,
  inCapturePhase: boolean,
  accumulateTargetOnly: boolean,
): Array<DispatchListener> {
  const captureName = reactName !== null ? reactName + 'Capture' : null; // 捕获事件对应为 "xxxCapture"
  const reactEventName = inCapturePhase ? captureName : reactName;
  const listeners: Array<DispatchListener> = [];

  let instance = targetFiber;
  let lastHostComponent = null;

  // Accumulate all instances and listeners via the target -> root path.
  while (instance !== null) {
    const {stateNode, tag} = instance;
    // Handle listeners that are on HostComponents (i.e. <div>)
    if (tag === HostComponent && stateNode !== null) {
      lastHostComponent = stateNode;
      // ...
      if (reactEventName !== null) {
        // 从 instance.stateNode 对应的 fiber 的 props 中获取 listener（如 props.onClick）
        const listener = getListener(instance, reactEventName);
        if (listener != null) {
          listeners.push(createDispatchListener(instance, listener, lastHostComponent));
        }
      }
    } else if (/* ... */) {
      // ...
    }
    // ...
    instance = instance.return;
  }
  return listeners;
}
```

BeforeInputEventPlugin, ChangeEventPlugin, SelectEventPlugin 只在冒泡阶段处理，通过 `accumulateTwoPhaseListeners` 方法收集 listener，在方法内部需要模拟捕获与冒泡传播阶段。具体的，在沿父边移动过程中，通过 `listeners.unshift` 插入捕获 listener 到头部，通过 `listeners.push` 插入冒泡 listener 到尾部，这样顺序遍历 listeners 数组即是事件传播顺序。

```js
// We should only use this function for:
// - BeforeInputEventPlugin
// - ChangeEventPlugin
// - SelectEventPlugin
// This is because we only process these plugins
// in the bubble phase, so we need to accumulate two
// phase event listeners (via emulation).
export function accumulateTwoPhaseListeners(
  targetFiber: Fiber | null,
  reactName: string
): Array<DispatchListener> {
  const captureName = reactName + "Capture";
  const listeners: Array<DispatchListener> = [];
  let instance = targetFiber;

  // Accumulate all instances and listeners via the target -> root path.
  while (instance !== null) {
    const { stateNode, tag } = instance;
    // Handle listeners that are on HostComponents (i.e. <div>)
    if (tag === HostComponent && stateNode !== null) {
      const currentTarget = stateNode;
      const captureListener = getListener(instance, captureName);
      if (captureListener != null) {
        // 通过 unshift 插入到头部
        listeners.unshift(
          createDispatchListener(instance, captureListener, currentTarget)
        );
      }
      const bubbleListener = getListener(instance, reactName);
      if (bubbleListener != null) {
        // 通过 push 插入到头部
        listeners.push(
          createDispatchListener(instance, bubbleListener, currentTarget)
        );
      }
    }
    instance = instance.return;
  }
  return listeners;
}
```

### 合成事件生成

合成事件是 React 内部提供的类 DOM 事件对象，对原生事件对象进行了封装，一般由 `createSyntheticEvent` 工厂方法构造其构造函数。

```js
function createSyntheticEvent(Interface: EventInterfaceType) {
  // 构造函数
  function SyntheticBaseEvent(
    reactName: string | null,
    reactEventType: string,
    targetInst: Fiber,
    nativeEvent: { [propName: string]: mixed },
    nativeEventTarget: null | EventTarget
  ) {
    this._reactName = reactName;
    this._targetInst = targetInst;
    this.type = reactEventType;
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;
    this.currentTarget = null;

    for (const propName in Interface) {
      if (!Interface.hasOwnProperty(propName)) {
        continue;
      }
      const normalize = Interface[propName];
      // normalize 非 0 时为函数
      this[propName] = normalize
        ? normalize(nativeEvent)
        : nativeEvent[propName];
    }

    const defaultPrevented =
      nativeEvent.defaultPrevented != null
        ? nativeEvent.defaultPrevented
        : nativeEvent.returnValue === false;
    this.isDefaultPrevented = defaultPrevented
      ? functionThatReturnsTrue
      : functionThatReturnsFalse;
    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }

  Object.assign(SyntheticBaseEvent.prototype, {
    preventDefault: function () {
      this.defaultPrevented = true;
      const event = this.nativeEvent;
      if (!event) return;

      if (event.preventDefault) {
        event.preventDefault();
      } else if (typeof event.returnValue !== "unknown") {
        event.returnValue = false;
      }
      this.isDefaultPrevented = functionThatReturnsTrue;
    },

    stopPropagation: function () {
      const event = this.nativeEvent;
      if (!event) return;

      if (event.stopPropagation) {
        event.stopPropagation();
      } else if (typeof event.cancelBubble !== "unknown") {
        // The ChangeEventPlugin registers a "propertychange" event for
        // IE. This event does not support bubbling or cancelling, and
        // any references to cancelBubble throw "Member not found".  A
        // typeof check of "unknown" circumvents this issue (and is also
        // IE specific).
        event.cancelBubble = true;
      }

      this.isPropagationStopped = functionThatReturnsTrue;
    },
    // ...
  });
  return SyntheticBaseEvent;
}
```

各类合成事件构造函数通过 `createSyntheticEvent` 创建，如：

```js
const MouseEventInterface: EventInterfaceType = {
  ...UIEventInterface,
  screenX: 0,
  screenY: 0,
  // ...
  metaKey: 0,
  getModifierState: getEventModifierState,
  // ..
};
// ...
export const SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface);
export const SyntheticDragEvent = createSyntheticEvent(DragEventInterface);
export const SyntheticFocusEvent = createSyntheticEvent(FocusEventInterface);
// ...
```

### dispatchQueue 维护：listener 收集与合成事件生成

dispatchQueue 的类型为 `Array<{ event: SyntheticEvent, listeners: Function[] }>`，即维护了合成事件及其对应的 listeners 的队列。listeners 已在上一部分收集完成，现需要维护合成事件生成，此部分逻辑在 `extractEvents` 中。

每个 plugin 都维护了自己的 `extractEvents` 逻辑，以 SimpleEventPlugin 为例。该方法根据 DOM 事件类型名选择相应的合成事件构造函数并生成合成事件，同时调用 `accumulateSinglePhaseListeners` 收集 listeners，最后维护 dispatchQueue。

```js
function extractEvents(
  dispatchQueue: DispatchQueue,
  domEventName: DOMEventName,
  targetInst: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: null | EventTarget,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget
): void {
  // 将 DOM 事件名转为 React 事件名
  const reactName = topLevelEventsToReactNames.get(domEventName);
  // ...
  let SyntheticEventCtor = SyntheticEvent;
  let reactEventType: string = domEventName;
  // 根据 DOM 事件类型名选择合成事件构造函数 SyntheticEventCtor
  switch (domEventName) {
    // ...
    case "click":
      // Firefox creates a click event on right mouse clicks. This removes the
      // unwanted click events.
      if (nativeEvent.button === 2) {
        return;
      }
      /* falls through */
      // ...
      SyntheticEventCtor = SyntheticMouseEvent;
      break;
    // ...
  }

  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
  // ...
  // 收集 listeners
  const listeners = accumulateSinglePhaseListeners(/* ... */);
  if (listeners.length > 0) {
    // Intentionally create event lazily.
    // 创建合成事件并维护 dispatchQueue
    const event = new SyntheticEventCtor(
      reactName,
      reactEventType,
      null,
      nativeEvent,
      nativeEventTarget
    );
    dispatchQueue.push({ event, listeners });
  }
}
```

总的 `extractEvents` 调用了各个 plugin 的 `extractEvents`。

```js
function extractEvents(/* ... */) {
  SimpleEventPlugin.extractEvents(/* ... */);
  const shouldProcessPolyfillPlugins =
    (eventSystemFlags & SHOULD_NOT_PROCESS_POLYFILL_EVENT_PLUGINS) === 0;
  if (shouldProcessPolyfillPlugins) {
    EnterLeaveEventPlugin.extractEvents(/* ... */);
    ChangeEventPlugin.extractEvents(/* ... */);
    SelectEventPlugin.extractEvents(/* ... */);
    BeforeInputEventPlugin.extractEvents(/* ... */);
  }
}
```

### dispatchQueue 执行

`processDispatchQueue` 方法执行 dispatchQueue，会区分捕获与冒泡阶段从而决定遍历 listeners 的顺序。

```js
export function processDispatchQueue(
  dispatchQueue: DispatchQueue,
  eventSystemFlags: EventSystemFlags
): void {
  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
  for (let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i];
    processDispatchQueueItemsInOrder(event, listeners, inCapturePhase);
  }
  // ...
}

function processDispatchQueueItemsInOrder(
  event: ReactSyntheticEvent,
  dispatchListeners: Array<DispatchListener>,
  inCapturePhase: boolean
): void {
  let previousInstance;
  if (inCapturePhase) {
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      const { instance, currentTarget, listener } = dispatchListeners[i];
      if (instance !== previousInstance && event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
      previousInstance = instance;
    }
  } else {
    for (let i = 0; i < dispatchListeners.length; i++) {
      const { instance, currentTarget, listener } = dispatchListeners[i];
      if (instance !== previousInstance && event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
      previousInstance = instance;
    }
  }
}
```

## React 中如何将 listener 绑定到 root 上？

### 在设置 DOM 属性时确保监听

`setInitialDOMProperties` 在 render 阶段的 complete 期间执行，当 propKey 为事件名时，会调用 `ensureListeningTo` 确保事件被监听。

```js
function setInitialDOMProperties(
  tag: string,
  domElement: Element,
  rootContainerElement: Element | Document,
  nextProps: Object,
  isCustomComponentTag: boolean
): void {
  for (const propKey in nextProps) {
    if (!nextProps.hasOwnProperty(propKey)) {
      continue;
    }
    const nextProp = nextProps[propKey];
    // ...
    if (registrationNameDependencies.hasOwnProperty(propKey)) {
      // ...
      ensureListeningTo(rootContainerElement, propKey, domElement);
    }
    // ...
  }
}
```

### 添加监听事件

`ensureListeningTo` 会调用 `listenToReactEvent` 以监听 React 事件。  
`listenToReactEvent` 中将 React 事件名映射到原生事件名（一个或多个），后调用 `listenToNativeEvent` 监听原生事件（polyfillPlugin 会通过 react 事件名为 key 的 set 优化性能）。  
`listenToNativeEvent` 中在对应 root 还未添加该原生事件（此处区分冒泡/捕获，以 `${domEventName}__${capture ? 'capture' : 'bubble'}` 为 key）时，调用 `addTrappedEventListener` 添加 listener。  
`addTrappedEventListener` 中会调用 `createEventListenerWrapperWithPriority` 创建 listenerWrapper，会根据是否为 capture，是否为 passive 等情况调用各 API 将其绑定到 root 上。

```js
export function ensureListeningTo(rootContainerInstance: Element | Node, reactPropEvent: string, targetElement: Element | null): void {
  // ...
  const rootContainerElement =
    rootContainerInstance.nodeType === COMMENT_NODE
      ? rootContainerInstance.parentNode
      : rootContainerInstance;
  // ...
  listenToReactEvent(reactPropEvent, rootContainerElement, targetElement);
}

export function listenToReactEvent(reactEvent: string, rootContainerElement: Element, targetElement: Element | null): void {
  const dependencies = registrationNameDependencies[reactEvent];
  const dependenciesLength = dependencies.length;
  const isPolyfillEventPlugin = dependenciesLength !== 1; // SimpleEventPlugin 都只有一个 dependency

  if (isPolyfillEventPlugin) {
    const listenerSet = getEventListenerSet(rootContainerElement);
    if (!listenerSet.has(reactEvent)) {
      listenerSet.add(reactEvent);
      for (let i = 0; i < dependenciesLength; i++) {
        listenToNativeEvent(dependencies[i], false, rootContainerElement, targetElement);
      }
    }
  } else {
    const isCapturePhaseListener = reactEvent.substr(-7) === 'Capture' && reactEvent.substr(-14, 7) !== 'Pointer';
    listenToNativeEvent(dependencies[0]， isCapturePhaseListener, rootContainerElement, targetElement);
  }
}

export function listenToNativeEvent(domEventName: DOMEventName, isCapturePhaseListener: boolean, rootContainerElement: EventTarget,
  targetElement: Element | null, eventSystemFlags?: EventSystemFlags = 0): void {
  let target = rootContainerElement;

  // ...
  const listenerSet = getEventListenerSet(target);
  const listenerSetKey = getListenerSetKey(domEventName, isCapturePhaseListener);

  if (!listenerSet.has(listenerSetKey)) {
    if (isCapturePhaseListener)  eventSystemFlags |= IS_CAPTURE_PHASE;
    addTrappedEventListener(target, domEventName, eventSystemFlags, isCapturePhaseListener);
    listenerSet.add(listenerSetKey);
  }
}

function addTrappedEventListener(targetContainer: EventTarget, domEventName: DOMEventName, eventSystemFlags: EventSystemFlags,
  isCapturePhaseListener: boolean, isDeferredListenerForLegacyFBSupport?: boolean) {
  let listener = createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags);
  let isPassiveListener = undefined;
  // ... 更新 isPassiveListener 逻辑
  // ...

  let unsubscribeListener;
  // ...
  if (isCapturePhaseListener) {
    if (isPassiveListener !== undefined) {
      unsubscribeListener = addEventCaptureListenerWithPassiveFlag(targetContainer, domEventName, listener, isPassiveListener);
    } else {
      unsubscribeListener = addEventCaptureListener(targetContainer, domEventName, listener);
    }
  } else {
    // ... 处理冒泡逻辑
  }
}
// 在浏览器中，以下两个 API 实际上是对 DOM API 的简单封装
export function addEventCaptureListener(target, eventType, listener) {
  target.addEventListener(eventType, listener, true);
  return listener;
}
export function addEventCaptureListenerWithPassiveFlag(target, eventType, listener, passive) {
  target.addEventListener(eventType, listener, {
    capture: true,
    passive,
  });
  return listener;
}
```

## React 如何处理优先级？

前面提过，有 3 种 listenerWrapper：`dispatchDiscreteEvent`, `dispatchUserBlockingUpdate`, `dispatchEvent`。其中 `dispatchEvent` 会间接调用 `dispatchEventsForPlugins` 以处理 listeners； `dispatchDiscreteEvent` 和 `dispatchUserBlockingUpdate` 会间接 `dispatchEvent`，并加上优先级相关逻辑。

### 默认

默认情况下：

```js
let batchedUpdatesImpl = function (fn, bookkeeping) {
  return fn(bookkeeping);
};
let discreteUpdatesImpl = function (fn, a, b, c, d) {
  return fn(a, b, c, d);
};
let flushDiscreteUpdatesImpl = function () {};
let batchedEventUpdatesImpl = batchedUpdatesImpl;

// ...
// render 可通过此方法改变相关 impl
export function setBatchingImplementation(
  _batchedUpdatesImpl,
  _discreteUpdatesImpl,
  _flushDiscreteUpdatesImpl,
  _batchedEventUpdatesImpl
) {
  batchedUpdatesImpl = _batchedUpdatesImpl;
  discreteUpdatesImpl = _discreteUpdatesImpl;
  flushDiscreteUpdatesImpl = _flushDiscreteUpdatesImpl;
  batchedEventUpdatesImpl = _batchedEventUpdatesImpl;
}
```

`dispatchDiscreteEvent` 会间接调用 `discreteUpdatesImpl(dispatchEvent, ...)`。  
`dispatchUserBlockingUpdate` 会调用 `runWithPriority(UserBlockingPriority, dispatchEvent.bind(...))`。（`runWithPriority` 来自于 Scheduler 包）  
`dispatchEvent` 会调用 `batchedEventUpdatesImpl(() => dispatchEventsForPlugins(...))`。

### ReactDOM 注入

ReactDOM 会注入 `discreteUpdatesImpl`, `batchedEventUpdatesImpl` 的实现，它们来自于 `react-reconciler`。

```js
setBatchingImplementation(
  batchedUpdates,
  discreteUpdates,
  flushDiscreteUpdates,
  batchedEventUpdates
);
```

`discreteUpdates` 通过 `runWithPriority(UserBlockingSchedulerPriority, ...)` 调用 callback，最后在 `NoContext` 时调用 `flushSyncCallbackQueue`。

```js
export function discreteUpdates<A, B, C, D, R>(
  fn: (A, B, C) => R,
  a: A,
  b: B,
  c: C,
  d: D
): R {
  const prevExecutionContext = executionContext;
  executionContext |= DiscreteEventContext;

  // ...
  try {
    return runWithPriority(
      UserBlockingSchedulerPriority,
      fn.bind(null, a, b, c, d)
    );
  } finally {
    executionContext = prevExecutionContext;
    if (executionContext === NoContext) {
      // Flush the immediate callbacks that were scheduled during this batch
      resetRenderTimer();
      flushSyncCallbackQueue();
    }
  }
}
```

`batchedEventUpdates` 直接调用 callback，最后在 `NoContext` 时调用 `flushSyncCallbackQueue`。

```js
export function batchedEventUpdates<A, R>(fn: (A) => R, a: A): R {
  const prevExecutionContext = executionContext;
  executionContext |= EventContext;
  try {
    return fn(a);
  } finally {
    executionContext = prevExecutionContext;
    if (executionContext === NoContext) {
      resetRenderTimer();
      flushSyncCallbackQueue();
    }
  }
}
```
