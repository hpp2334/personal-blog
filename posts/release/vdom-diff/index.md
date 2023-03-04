## 什么是 Virtual DOM（基于 Snabbdom）

### 一种数据结构

顾名思义，Virtual DOM 就是虚拟的 DOM，是内存中用有别于 DOM 结构的数据结构来表示 DOM。比如其数据结构可以为：

```ts
type TypeVDOM = {
  root: TypeVNode;
};

type TypeVNode = {
  sel: string; // 选择器，如div#container
  key: string;
  children: TypeVNode[] | null; // 孩子数组，与text互斥（文本节点没有孩子）
  text: string | null; // 节点文本值，与children互斥
};
```

### 一种机制

不过，一般谈论 Virtual DOM，不光谈论这一数据结构，更多的是指 React, Vue 等框架通过比较两棵 Virtual DOM Tree 的不同，更新 DOM 的机制。

在 React, Vue 等框架中，Data（数据）与 View（视图）是绑定在一起的，如：

```html
<!-- 以Vue -->
<!-- content（Data）更新时，网页上呈现的内容（View）也会更新 -->
<div>{{ content }}</div>
```

在框架内部，首先会将代码转换为对应的生成 Virtual DOM 函数调用形式的代码，执行代码段后得到 Virtual DOM Tree，如：

```js
const tree = {
  sel: "div",
  children: [
    {
      sel: "",
      children: null,
      text: content,
    },
  ],
  text: null,
};
```

再拿着 Virtual DOM，通过 diff 算法得到与之前的 DOM 的差别之处，最后调用 DOM 接口更新真实的 DOM 结构。

## 如何实现 Virtual DOM（基于 Snabbdom）

### Create VNode

定义函数`h`用于产生`VNode`，实际上这一函数只需要把`TypeVNode`中的属性填上就行，其实现可以

```ts
const h = (sel, children, text, key): TypeVNode => ({
  sel,
  children,
  text,
  key,
});
```

### Build VDOM & Core

有了 Virtual Node，通过`children`属性可以很自然地构造一棵 Virtual DOM Tree，有了这棵树，就可以考虑实现 Virtual DOM 背后的机制核心：

1. **实现 diff 算法：如何对比当前 DOM 对应的 Virutal DOM 与下一状态状态对应的 Virtual DOM？** 这里的对比，指的是需要拿到必要且尽可能少的 Node 的 CRUD 信息，如 A 节点信息被更新（U）、B 节点右侧插入了一个 C 节点（C），D 节点被删除了（D）等。（为什么？考虑最初的目标，是希望通过 Virtual DOM 更新真实的 DOM。暴力地直接将 DOM 全部删除再将 Virtual DOM 转为 DOM 插入固然可以解决问题，但是效率太差，而考虑只对被修改了的节点做尽可能少的操作能提高不少效率，对它们的操作通过`insertBefore`, `removeChild`, `createTextNode`等 API 实现，于是拿到必要的且较少的 node 的 CRUD 信息就可以实现较为高效更新 DOM）

2. **实现 patch 算法：如何更新 DOM？**

### Diff

目前普遍认为，得到对比两棵树的算法最快为 $O(n^3)$，效率不足以在工业生产中使用，因此目前主流的 diff 算法实现基于一个假设：

1. 同一父节点下，key 值与 sel 值相同的节点认为是同一节点。此处的 key 值由用户指定，同一父节点下的节点 key 值应该唯一。

有了这个假设，就可以知道如何判断同一父节点下的两个节点是否相同。这有什么作用呢？假定有两棵树，我们分别从它们的根结点出发开始执行 diff 算法，如果两个节点是相同的，我们只需要更新节点上的一些属性，然后对孩子数组执行 diff 算法，再对孩子节点递归地执行 diff 算法；如果两个节点是不同的，我们自然得执行替换节点（可以认为是先删除旧节点再插入新节点）操作。上述描述即是整个 diff 算法的主要逻辑，其中判定节点是否相同是关键，而这已经在假设中被解决。

diff 算法的另一大要点在于：如何 diff 孩子数组？具体的，有数组 A 与数组 B，数组 A 如何变为数组 B？这里基于 snabbdom 执行 diff 与 patch 孩子数组代码，来看看这段代码是如何运作的。

```ts
// snabbdom原有逻辑在 /src/package/init.ts 的 updateChildren 中
function updateChildren(
  parentElm: Node, // 父节点
  oldCh: VNode[], // 旧节点列表
  newCh: VNode[], // 新节点列表
  insertedVnodeQueue: VNodeQueue
) {
  let oldStartIdx = 0;
  let newStartIdx = 0;
  let oldEndIdx = oldCh.length - 1;
  let oldStartVnode = oldCh[0];
  let oldEndVnode = oldCh[oldEndIdx];
  let newEndIdx = newCh.length - 1;
  let newStartVnode = newCh[0];
  let newEndVnode = newCh[newEndIdx];
  const oldKeyToIdx = Object.fromEntries(
    oldCh.filter((p) => p?.key !== undefined).map((p, i) => [p.key, i])
  );

  // 相同节点判定：key相同且sel相同
  const sameVnode = (vnode1: VNode, vnode2: VNode) => {
    return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
  };

  // 首尾指针向中间靠拢
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    // 某个指针指向节点为空，则移动指针
    if (oldStartVnode == null) {
      oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
    } else if (oldEndVnode == null) {
      oldEndVnode = oldCh[--oldEndIdx];
    } else if (newStartVnode == null) {
      newStartVnode = newCh[++newStartIdx];
    } else if (newEndVnode == null) {
      newEndVnode = newCh[--newEndIdx];
    }
    // 头/头 或 尾/尾 节点相同，则直接patch更新属性并递归diff
    else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
      oldStartVnode = oldCh[++oldStartIdx];
      newStartVnode = newCh[++newStartIdx];
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
      oldEndVnode = oldCh[--oldEndIdx];
      newEndVnode = newCh[--newEndIdx];
    }
    // 头/尾 或 尾/头 相同，则patch后移动节点并递归diff
    else if (sameVnode(oldStartVnode, newEndVnode)) {
      // Vnode moved right
      patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
      api.insertBefore(
        parentElm,
        oldStartVnode.elm!,
        api.nextSibling(oldEndVnode.elm!)
      );
      oldStartVnode = oldCh[++oldStartIdx];
      newEndVnode = newCh[--newEndIdx];
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      // Vnode moved left
      patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
      api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!);
      oldEndVnode = oldCh[--oldEndIdx];
      newStartVnode = newCh[++newStartIdx];
    }
    // 根据 newStartNode 的key值找到旧节点列表中的对应节点
    // 找得到，则patch后移动
    // 找不到，则创建并插入
    else {
      const idxInOld = oldKeyToIdx[newStartVnode.key as string];
      if (isUndef(idxInOld)) {
        // New element
        api.insertBefore(
          parentElm,
          createElm(newStartVnode, insertedVnodeQueue),
          oldStartVnode.elm!
        );
      } else {
        const elmToMove = oldCh[idxInOld];
        if (elmToMove.sel !== newStartVnode.sel) {
          api.insertBefore(
            parentElm,
            createElm(newStartVnode, insertedVnodeQueue),
            oldStartVnode.elm!
          );
        } else {
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
          oldCh[idxInOld] = undefined as any;
          api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!);
        }
      }
      newStartVnode = newCh[++newStartIdx];
    }
  }

  // 最后的处理
  if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
    if (oldStartIdx > oldEndIdx) {
      // 新列表有剩余，则批量插入
      const before =
        newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
      addVnodes(
        parentElm,
        before ?? null,
        newCh,
        newStartIdx,
        newEndIdx,
        insertedVnodeQueue
      );
    } else {
      // 旧列表有剩余，则批量删除
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }
}
```

SnabbDOM 维护了新旧节点列表的首尾指针，使它们向中间靠拢，旧首尾指针的外侧维护已经被更新且移动到正确位置的节点。

情况 1：当某个指针指向的节点为`null`或`undefined`时，它们是无效的，此时直接移动指针；

情况 2：头/头 或 尾/尾 节点相同，则直接 patch 更新属性，并递归 diff；

情况 3：头/尾 或 尾/头 节点相同，则先 patch 更新属性，并递归 diff，再移动节点；

情况 4：上述情况都不满足，则在 Hash 表找到节点`newStartNode`对应的旧节点（即 key 值相同），若不存在或非同一节点，则创建新节点并插入；否则 patch 节点移动节点，并将原数组中的设为`null`，其会在 情况 1 或 最后阶段 被处理。

最后阶段：上述跑完后新旧双指针必有一方指针间无元素，若新指针有剩余，则将它们都插入；若旧节点列表有剩余，则都删除。

### Patch【WIP】

（WIP）

## 为什么需要 Virtual DOM

通过上述流程叙述，可以发现 Virtual DOM 存在的意义在于：

1. 用更瘦的数据结构表示原 DOM 结构，方便多棵 Virtual DOM Tree 同时存储于内存中，加快 CRUD 效率。（目前看来，其实用 DOM 直接做 diff 算法不是不行，但是可能需要调用`cloneNode`，同时要防止`id`冲突等等问题。）

2. 自动将 Data 与 View 绑定，一般不需要手动将 Data 通过 DOM 接口更新到 View 中，提高了研发效率，且运行效率相对原生 DOM 操作不会太差。（一般而言，Virtual DOM 的效率是不会高于原生 DOM 操作的，因为 diff 算法受限，且 Virtual DOM 机制最后更新到 DOM 上也是调用了原生 DOM 接口。）

## React 中的 Fiber diff 算法

在 React 16 中，起到 Virtual DOM 的作用的是 Fiber。Fiber 树中孩子节点是 **单链表**（准确的说，Fiber 是以 **左孩子右兄弟** 法表示的树），因此不能够使用 snabbdom 中的 diff 算法。（源码注释中表示不是不能加指向上一个节点的指针以组成双向链表，但是现在不打算加。）

React 源码中 `reconcileChildren` 用于协调孩子节点，其在 mount 时（即 `current` 不存在）调用 `mountChildFibers`，update 时调用 `reconcileChildFibers`。

```js
export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderLanes: Lanes
) {
  if (current === null) {
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes
    );
  } else {
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes
    );
  }
}
```

`mountChildFibers` 与 `reconcileChildFibers` 由同一个工厂方法产生，区别在于 `mountChildFibers` 中 `shouldTrackSideEffects` 被标记为 `false`，而 `reconcileChildFibers` 中其为 `true`，代码中通过该变量判断是否应当打上 flag。因此，可以认为 `reconcileChildFibers` 用于实现 diff 算法。对于 React 的 diff 算法，比较对象是 JSX 组件与 `current` 树，结果生成 `workInProgress` 树。与 snabbdom 不同的是，React 并不会同时进行 diff 与更改 DOM 操作。（准确的说，diff 算法发生在 `render` 阶段，实际更新到 DOM 发生在 `commit` 阶段）

```js
function reconcileChildFibers(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChild: any,
  lanes: Lanes
): Fiber | null {
  // ...

  const isObject = typeof newChild === "object" && newChild !== null;

  if (isObject) {
    switch (newChild.$$typeof) {
      // 对 REACT_ELEMENT_TYPE 单元素进行 diff
      case REACT_ELEMENT_TYPE:
        return placeSingleChild(
          reconcileSingleElement(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          )
        );
      case REACT_PORTAL_TYPE: // ...
      case REACT_LAZY_TYPE: // ...
    }
  }

  if (typeof newChild === "string" || typeof newChild === "number") {
    // ...
  }

  // 对列表进行 diff
  if (isArray(newChild)) {
    return reconcileChildrenArray(
      returnFiber,
      currentFirstChild,
      newChild,
      lanes
    );
  }

  // ...
}
```

以下对 Fiber diff 算法分析分为了：对列表的 diff；对单个元素的 diff（单元素仅限 `REACT_ELEMENT_TYPE`，大多数 react 元素都是这个类型）。

### 对列表的 diff

JSX 元素形如：

```jsx
const aJSXElement = {
  $$typeof: Symbol("..."),
  key: null, // or string
  props: {
    children: [...JSXElements],
    prop1,
    prop2,
    ...otherProps,
  },
  ref: null, // ...
  type: "div",
};
```

对列表（多元素）的 diff 实际上是 `props.children` 与对应 fiber 链表的 diff，React 源码中使用 `reconcileChildrenArray` 进行列表 diff。记 `props.children` 为 `newChildren`，fiber 链表的头节点为 `oldFiber`，则 `reconcileChildrenArray` 的实现思路如下。

#### 优先处理节点更新情况

从 `oldFiber` 与 `newChildren[newIdx]`(`newIdx` 初始为 0) 同时开始遍历，若对应元素

- type, key 都相同：复用 `oldFiber`；
- type 不同, key 相同：删除 `oldFiber`（实际上是打上 `Deletion` 标记），插入 `newFiber`（实际上是打上 `Placement` 标记）；
- key 不同：结束遍历；

```js
function reconcileChildrenArray(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChildren: Array<*>,
  lanes: Lanes
): Fiber | null {
  let resultingFirstChild: Fiber | null = null; // 链表头
  // ...

  let oldFiber = currentFirstChild;
  let lastPlacedIndex = 0;
  let newIdx = 0;
  let nextOldFiber = null;
  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber;
      oldFiber = null;
    } else {
      nextOldFiber = oldFiber.sibling;
    }

    // 复用或创建 fiber
    // 若 type 与 key 都相同时会复用 fiber
    // 若 oldFiber 与 newChildren[newIdx] 的 key 不同会直接返回 null
    const newFiber = updateSlot(
      returnFiber,
      oldFiber,
      newChildren[newIdx],
      lanes
    );
    // 当 key 不同时，直接结束本次遍历
    if (newFiber === null) {
      if (oldFiber === null) {
        oldFiber = nextOldFiber;
      }
      break;
    }

    // 未复用已有 fiber 故删除（打上 "Deletion" flags）
    if (oldFiber && newFiber.alternate === null) {
      deleteChild(returnFiber, oldFiber);
    }

    // 维护 newFiber.index, newFiber.flags（可能打上"Placement"标记）
    // lastPlacedIndex = max(oldFiber.index, lastPlacedIndex)
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

    // ...维护链表头 resultingFirstChild 与上一个fiber的兄弟指针 sibling

    oldFiber = nextOldFiber;
  }
  // ...
  return resultingFirstChild;
}
```

需要注意，`lastPlacedIndex` 是当前遍历复用过的 `oldFiber` 中 `index` 最大值，`placeChild` 会根据 `lastPlacedIndex` 来判断 `newFiber` 是否被移动。若满足 `oldIndex < lastPlacedIndex`，则说明这个 fiber 应向右移动。

```js
// 作用：
// 1. 维护 lastPlacedIndex
// 2. 设置 newFiber.index = newIndex
// 3. 视情况打 "Placement" 标记
function placeChild(
  newFiber: Fiber,
  lastPlacedIndex: number,
  newIndex: number
): number {
  // 维护 newFiber.index
  newFiber.index = newIndex;
  // ...
  // current !== null 时，newFiber 为复用 fiber
  const current = newFiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      // 移动的 fiber
      newFiber.flags = Placement;
      return lastPlacedIndex;
    } else {
      // 在原来位置上的 fiber
      return oldIndex;
    }
  } else {
    // 插入的新 fiber
    newFiber.flags = Placement;
    return lastPlacedIndex;
  }
}
```

#### 情况 1：newChildren 遍历完成

此情况下，直接把剩下的 `oldFiber` 全部删除。

```js
// Case 1 | newChildren 遍历完成：oldFiber 剩下的都是多余的，全部删除
if (newIdx === newChildren.length) {
  deleteRemainingChildren(returnFiber, oldFiber);
  return resultingFirstChild;
}
```

#### 情况 2：oldFiber 遍历完成

此情况下，直接把剩下的 `newChildren[newIdx], ..., newChildren[newChildren.length - 1]` 插入到 `newFiber` 后部。

```js
// Case 2 | oldFiber 遍历完成：把 newChildren 剩下的都直接接在后面
if (oldFiber === null) {
  for (; newIdx < newChildren.length; newIdx++) {
    const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    // ...维护链表头 resultingFirstChild 与上一个fiber的兄弟指针 sibling
  }
  return resultingFirstChild;
}
```

#### 情况 3：newChildren, oldFiber 都未遍历完

与 snabbdom 的 diff 类似，通过对 oldFiber 创建 map（Hash 表），再继续 newChildren 完成。

```js
// Case 3 | oldFiber 与 newChildren 都没遍历完：构建 map，根据 map 复用或创建节点
// 利用剩下的 oldFiber 构建 Map: key/index -> fiber，这一 map 需要被维护为在 newFiber 中不存在的 fiber
const existingChildren = mapRemainingChildren(returnFiber, oldFiber);
for (; newIdx < newChildren.length; newIdx++) {
  const newFiber = updateFromMap(
    existingChildren,
    returnFiber,
    newIdx,
    newChildren[newIdx],
    lanes
  );
  if (newFiber !== null) {
    // 为复用 fiber 则将其从 existingChildren 删除
    if (newFiber.alternate !== null) {
      existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key);
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    // ...维护链表头 resultingFirstChild 与上一个fiber的兄弟指针 sibling
  }
}

// 删除剩余的 oldFiber
existingChildren.forEach((child) => deleteChild(returnFiber, child));
```

### 对单元素的 diff（仅限 `REACT_ELEMENT_TYPE`）

React 源码中 `reconcileSingleElement` 负责 `REACT_ELEMENT_TYPE` 的 diff。对于这种情况，需要考虑 `oldFiber` 可能是多于一个元素的链表，因此：

- 遍历 `oldFiber`
  - 若 key, type 相同，则复用 fiber 并修改相关信息，删除剩下的 `oldFiber`，返回复用的 fiber
  - 若 key 相同，type 不同，则不可能出现可以复用的 fiber（同一列表下 `key` 的唯一性），删除自身与剩下的 `oldFiber`，结束遍历
  - 若 key 不同，则后续可能出现可以复用的 fiber，删除自身，继续遍历
- 若之前没有复用 fiber，则从 `element` 创建 fiber 后返回

```js
function reconcileSingleElement(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  element: ReactElement,
  lanes: Lanes,
): Fiber {
  const key = element.key;
  let child = currentFirstChild;
  while (child !== null) {
    // TODO: If key === null and child.key === null, then this only applies to
    // the first item in the list.
    if (child.key === key) {
      switch (child.tag) {
        case Fragment: // ...
        case Block:    // ...
        default: {
          if (
            child.elementType === element.type // ...省略DEV情况
          ) {
            deleteRemainingChildren(returnFiber, child.sibling);
            const existing = // ...复用 fiber 并修改 "ref", "return"
            return existing;
          }
          break;
        }
      }
      // key 相同且 type 不同，那么后续也不可能有相同 fiber（由于 key 的唯一性）
      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      // key 不同，可以尝试复用后续的 fiber
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }

  // ...通过 element 创建 fiber 并返回
}
```

## 题外话

### 更优秀的 diff 算法？

Snabbdom 的算法固然是线性的，并且对常见的情况（节点左移，节点右移，节点相对无移动）做了处理，但不能得到最少的 diff 操作。举个例子（假定每个值代表一个节点，值相同代表节点相同）：

```ts
oldCh = [1, 2, 3, 4, 5, 6];
newCh = [3, 4, 5, 6, 1, 2];
```

按 Snabbdom 的实现，会得到移动节点`[3, 4, 5, 6]`，但实际上只需要移动节点`[1, 2]`。

如果只考虑节点在同一列表中移动，那求解最少 diff 操作可以转换为 _最小编辑距离问题_，其使用动态规划（DP）求解，DP 方程为

```cpp
if (oldCh[i] != newCh[j])
    dp[i, j] = Min(
      dp[i - 1, j] + 1,    // 删除oldCh[i]（因为取dp[i - 1, j]，即oldCh[0...i-1]与newCh[0...j]相同，那么oldCh[i]就是多出来的，应该被删除）
      dp[i, j - 1] + 1,    // 插入newCh[j]
      dp[i - 1, j - 1] + 1 // 修改oldCh[i]为newCh[j]
    )
else
    dp[i, j] = dp[i - 1, j - 1] // 无需操作
```

上述算法的时间复杂度为 $O(nm)$ ，空间复杂度为 $O(nm)$。与 LCS 相同，可以用 Hirschberg 算法将空间复杂度优化到 $O(n+m)$。

利用上述算法，容易想到：为 Snabbdom 中的原有 diff 算法设置阈值，超过一定阈值时执行原有算法，否则执行最小编辑距离 DP，能得到理论更优的 diff 算法。

这里提供一个个人的编码方案（可能有误，仅供参考）：

1. 跑 DP。
2. 用沿前驱记录的方法记录 `oldCh[i]`, `newCh[j]`, `opType`，其中 `opType` 为插入、删除或修改，注意此处的 `i`, `j` 应当非递减，即需要符合 DP 的顺序。
3. 扫描操作顺序，找出其中为操作其实是移动的节点。
4. 用记录下的操作顺序执行操作。此处较为麻烦的是处理其实是移动操作的节点的 插入 与 删除 操作。执行插入操作使用 DOM API `insertBefore`，其会先删除 DOM 中对原节点的引用，再将其插入到指定节点的前面，这就导致了后续节点执行`insertBefore`时，若参考节点选择不当，可能会选择一个已经被移动了的节点，导致顺序不正确。

个人使用上述方案编码并通过官方的单测后（但是这里的代码仍然有 bug），执行 benchmark，结果却不如官方给出的 diff 算法。个人推测原因有：

1. 方案常数太大
2. 对同一列表下的 diff 算法可能不是整体性能瓶颈
