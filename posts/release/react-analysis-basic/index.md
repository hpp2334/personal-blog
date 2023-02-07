---
date: "2021-05-18"
title: "React 机制基础"
tags: ['fe', 'react', 'source']
abstract: 'React 机制基础。'
state: 'wip'
requirements: ['使用过 React']
series: 'react-analysis'
---

## 参考

- [10.scheduler&lane模型(来看看react是暂停、继续和插队的)](https://xiaochen1024.com/article_item/600acd54245877002ed5df04)  

## 前言

请注意本文 Work In Progress

## Fiber Tag

`ReactWorkTag` 列出了 fiber 的 tag 类型。

```ts
export const FunctionComponent = 0;
export const ClassComponent = 1;
export const IndeterminateComponent = 2; // Before we know whether it is function or class
export const HostRoot = 3; // Root of a host tree. Could be nested inside another node.
export const HostPortal = 4; // A subtree. Could be an entry point to a different renderer.
export const HostComponent = 5;
export const HostText = 6;
export const Fragment = 7;
export const Mode = 8;
export const ContextConsumer = 9;
export const ContextProvider = 10;
export const ForwardRef = 11;
export const Profiler = 12;
export const SuspenseComponent = 13;
export const MemoComponent = 14;
export const SimpleMemoComponent = 15;
export const LazyComponent = 16;
export const IncompleteClassComponent = 17;
export const DehydratedFragment = 18;
export const SuspenseListComponent = 19;
export const FundamentalComponent = 20;
export const ScopeComponent = 21;
export const Block = 22;
export const OffscreenComponent = 23;
export const LegacyHiddenComponent = 24;
```

若有如下代码：

```jsx
const context = React.createContext();
class ClassComp extends React.Component {
  render = () => this.props.children || null;
}
class PureComp extends React.PureComponent {
  render = () => this.props.children || null;
}
const FunctionComp = ({ children = null }) => children;
const Memozied = React.memo(FunctionComp);
const NotSimpleMemozied = React.memo(FunctionComp, () => true);

const style = { display: "none" };
const spanStyle = {
  whiteSpace: "pre",
  fontFamily: "Consolas"
};
export default function App() {
  const ref = React.useRef(null);

  useEffect(() => {
    getReadableFiberTree("root", (text) => {
      ref.current.innerText = text;
    });
  }, []);

  return (
    <div>
      <div style={style}>
        <FunctionComp>
          <>
            <span>span-text</span>
            <Memozied></Memozied>
            <NotSimpleMemozied></NotSimpleMemozied>
            text
          </>
        </FunctionComp>
        <context.Provider value={"provider-text"}>
          <ClassComp>
            <context.Consumer>{(val) => <span>{val}</span>}</context.Consumer>
          </ClassComp>
        </context.Provider>
        <React.Fragment>
          <PureComp />
        </React.Fragment>
      </div>
      <div style={spanStyle} ref={ref}></div>
    </div>
  );
}
```

其 Fiber 树如下：

```
HostRoot:
  Mode:
    FunctionComponent:
      HostComponent:
        HostComponent:
          FunctionComponent:
            HostComponent
            SimpleMemoComponent(react.memo)
            MemoComponent(react.memo):
              FunctionComponent
            HostText
          ContextProvider(react.provider):
            ClassComponent:
              ContextConsumer(react.context):
                HostComponent
          Fragment:
            ClassComponent
        HostComponent
```

## Lane 模型

lane 意思是 “车道”，是 React 中的优先级模型。  

`Lane` 为单独的优先级，`Lanes` 则是表示有多个优先级。  

```ts
export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;
export const SyncBatchedLane: Lane = /*                 */ 0b0000000000000000000000000000010;

export const InputDiscreteHydrationLane: Lane = /*      */ 0b0000000000000000000000000000100;
const InputDiscreteLanes: Lanes = /*                    */ 0b0000000000000000000000000011000;

const InputContinuousHydrationLane: Lane = /*           */ 0b0000000000000000000000000100000;
const InputContinuousLanes: Lanes = /*                  */ 0b0000000000000000000000011000000;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000100000000;
export const DefaultLanes: Lanes = /*                   */ 0b0000000000000000000111000000000;

const TransitionHydrationLane: Lane = /*                */ 0b0000000000000000001000000000000;
const TransitionLanes: Lanes = /*                       */ 0b0000000001111111110000000000000;

const RetryLanes: Lanes = /*                            */ 0b0000011110000000000000000000000;

export const SomeRetryLane: Lanes = /*                  */ 0b0000010000000000000000000000000;

export const SelectiveHydrationLane: Lane = /*          */ 0b0000100000000000000000000000000;

const NonIdleLanes = /*                                 */ 0b0000111111111111111111111111111;

export const IdleHydrationLane: Lane = /*               */ 0b0001000000000000000000000000000;
const IdleLanes: Lanes = /*                             */ 0b0110000000000000000000000000000;

export const OffscreenLane: Lane = /*                   */ 0b1000000000000000000000000000000;
```

`LanePriority` 越大则优先级越高。  

```ts
export const SyncLanePriority: LanePriority = 15;
export const SyncBatchedLanePriority: LanePriority = 14;

const InputDiscreteHydrationLanePriority: LanePriority = 13;
export const InputDiscreteLanePriority: LanePriority = 12;

const InputContinuousHydrationLanePriority: LanePriority = 11;
export const InputContinuousLanePriority: LanePriority = 10;

const DefaultHydrationLanePriority: LanePriority = 9;
export const DefaultLanePriority: LanePriority = 8;

const TransitionHydrationPriority: LanePriority = 7;
export const TransitionPriority: LanePriority = 6;

const RetryLanePriority: LanePriority = 5;

const SelectiveHydrationLanePriority: LanePriority = 4;

const IdleHydrationLanePriority: LanePriority = 3;
const IdleLanePriority: LanePriority = 2;

const OffscreenLanePriority: LanePriority = 1;

export const NoLanePriority: LanePriority = 0;
```

### Lanes 的运算

```ts
// 取 lanes 中最高的 lane/lanes
function getHighestPriorityLanes(lanes: Lanes | Lane): Lanes;

/* 取 lanes 中取 lane 操作 */
function getHighestPriorityLane(lanes: Lanes) { return lanes & -lanes; }
function getLowestPriorityLane(lanes: Lanes): Lane {
  // This finds the most significant non-zero bit.
  const index = 31 - clz32(lanes);
  return index < 0 ? NoLanes : 1 << index;
}
export function pickArbitraryLane(lanes: Lanes): Lane;
function pickArbitraryLaneIndex(lanes: Lanes);
// ...

/* lanes 集合操作 */
export function includesSomeLane(a: Lanes | Lane, b: Lanes | Lane)   { return (a & b) !== NoLanes; }
export function isSubsetOfLanes(set: Lanes, subset: Lanes | Lane)    { return (set & subset) === subset; }
export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes  { return a | b; }
export function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes { return set & ~subset; }

export function findUpdateLane(lanePriority: LanePriority, wipLanes: Lanes): Lane;
```

其中，  

- `getHighestPriorityLanes`：同时维护变量 `return_highestLanePriority`；  
- `findUpdateLane(lanePriority: LanePriority, wipLanes: Lanes)`：会取优先级最高为 lanePriority 的，尽量排除 wipLanes 的 lane；  

### 与 Scheduler 中的优先级

lane 与 Scheduler 中的优先级不同，因此 `schedulerPriorityToLanePriority`, `lanePriorityToSchedulerPriority` 可实现优先级互转。  

### FiberRoot 相关

```ts
type FiberRoot = {
  eventTimes: LaneMap<number>,
  expirationTimes: LaneMap<number>,
  pendingLanes: Lanes,
  suspendedLanes: Lanes,
  pingedLanes: Lanes,
  expiredLanes: Lanes,
  mutableReadLanes: Lanes,

  finishedLanes: Lanes,

  entangledLanes: Lanes,
  entanglements: LaneMap<Lanes>,
}
```

- `markRootFinished(root, remainingLanes)`：用 `remainingLanes` 视为新的 `pendingLanes` 并更新 root 上的各个 lanes 属性与 `LaneMap` 等；  
- `markStarvedLanesAsExpired(root, currentTime)`：根据 currentTime 将 `root.pendingLanes` 中的 lane 合并到 `root.expiredLanes` 中， 此 API 用于防 lane 饥饿；  
- `markRootUpdated`/`markRootSuspended`/`markRootPinged`/`markRootExpired`/...；  
- `getNextLanes(root: FiberRoot, wipLanes: Lanes)`：根据 root 上的 lanes 信息与 wipLanes 得到应被优先处理的 lanes。在一次 render 过程中，若 nextLanes 非 NoLane 且 wipLanes 优先级更高则会返回 wipLanes，以防止任务中断；  


### 维护变量

- `currentUpdateLanePriority`  