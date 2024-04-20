# 背景

最近工作中发现，protobuf.js 这个库在序列化比较大的 JavaScript 对象时会因为 JavaScript 对象过多而导致浏览器 OOM (Out of memory)，并且只是一个不可规避的问题，于是自己实现了一个 protobuf.js writer，用于序列化大 JavaScript
对象的场景，具体见此 [Repo](https://github.com/hpp2334/pbw-moon)。结果上看:   

- 序列化小对象 (这里测试的是官方 Repo 中的 bench.proto 与 bench.json 文件，序列化结果为 79 字节) 时，耗时为原来的 1.15 倍，统计不到 JS 对象堆内存的变化  
- 序列化大对象 (这里测试的是一个自定义对象，序列化后 >= 18MB) 时，耗时为原来的 0.3 倍，JS 堆内存占用为原来的 0.07 倍  

本文会主要关注  

- 官方的与自实现的 writer 的实现要点    
- 如何保证编写的 writer 是正确的？  

# protobuf.js writer API

protobuf.js 允许将 writer 作为第二个参数传入 `encode` 方法。

```js
protos.partialsketch.Layer.encode(p, new Writer()).finish()
```

这个 writer 上需要实现的 API 分为以下几类  

- 数据写入: 写入 varint32，varint64，bytes 等  
- fork: 将当前序列化的结果暂存下来，清除自己的状态，将自己作为一个全新的 writer  
- reset: 舍弃当前序列化的结果，将上一次暂存下来的结果复原，作为此时的状态  
- ldelim: 将当前序列化的结果以 bytes 写入上一次的结果后 (即长度作为 varint32 写入，再写结果)，再复原到上一次的结果  
- finish: 取出当前序列化的结果，返回 `Uint8Array`  

# 官方的 protobuf.js writer 实现

官方的 writer 采用了 链表 作为 writer 的内部结构，可以表述为:

```typescript
// 写入数据的操作节点
interface Op<T> {
    fn: (val: T,  buf: Uint8Array, pos: number) => void
    // byte len
    len: number
    val: T
    next: Op<unknown> | null
}

// 暂存状态
interface State {
    head: Op<unknown>
    tail: Op<unknown>
    len: number
    next: State | null
}

interface Writer {
    head: Op<unknown>
    tail: Op<unknown>
    len: number
    states: State | null
}
```

writer 以 head，tail 作为链表维护了需要写入的数据，states 作为栈链表维护了暂存状态。 

- 当写入数据时，直接在 tail 后挂一个节点  
- 当 fork 时，创建一个新的 state 插入到 states 头，将当前链表转移到其中，再重置 head，tail  
- 当 reset 时，取出 states 头并复原 head，tail  
- 当 ldelim 时，取出 states 头并合并链表  
- 当 finish 时，依次遍历链表调用 `fn` 得到结果  

这样的好处是:

- `fork`，`reset`，`ldelim` 均可以 `$$O(1)$$` 实现  
- 最后 finish 时再计算，避免了被 `reset` 部分的冗余计算  

坏处也非常明显:

- 每次写入数据都会增加至少一个链表节点，导致 JavaScript 堆内存暴涨  
- 使用链表数据量大时计算慢  

# 自实现 protobuf.js writer 的实现

自实现 protobuf.js writer 以 分页倍增数组 作为 writer 的内部结构，可以表述为

```typescript
export interface AllocatedChunk {
    bytes: Uint8Array
    len: number
}

export class ByteVec {
    private _chunks: Array<AllocatedChunk> = [{ bytes: obtainInitialChunk(), len: 0 }]
    private _len = 0
    private _nextCapacity = _InitialChunkCapacity * 2;
}

export interface ByteVecSnapshot {
    chunksIndex: number,
    chunkLen: number,
    len: number,
    nextCapacity: number,
}

export class Writer {
    private _vec: ByteVec = new ByteVec()
    private _snapshots: ByteVecSnapshot[] = []
}
```

writer 以 vec 分页倍增数组维护写入的数据，以 snapshots 维护保存的状态  

- 当写入数据时，直接将数据写入数组中
- 当 fork 时，保存当前分页状态到 snapshots 中 (实际上，这里有一些为了 ldelim 而做的 trick 操作，感兴趣的话可以看看源码)
- 当 reset 时，取出最后一个 snapshots 状态并直接改变数组大小的记录，不修改实际写入数据  
- 当 ldelim 时，取出最后一个 snapshots 状态，移动数组段，并写入长度  
- 当 finish 时，遍历分页合并结果  

这样的好处是:

- 使用数组而非链表，极大的降低了 JavaScript 对象堆内存的占用  
- 对象大时，使用数组的性能会更好  

坏处则是:  

- 如果 fork 完后一段操作后 reset，这部分的数据也会被计算  
- 会有一定的非 JavaScript 堆内存占用  

# 一些优化性能的手段

## 池化 Uint8Array

在最后 finish 得到 Uint8Array 时，通过池化 Uint8Array 来避免频繁分配内存. 简单地说，首先分配一个大的 Uint8Array，再根据实际上需要多少逐份通过 `subarray` 分配出去。  

```typescript
const _ToBufferChunkCapacity = 16384; // 16KB
let _ToBufferChunk = new Uint8Array(_ToBufferChunkCapacity)
let _ToBufferOffset = 0

function allocateToBuffer(len: number): Uint8Array {
    if (_ToBufferOffset + len > _ToBufferChunkCapacity) {
        _ToBufferChunk = new Uint8Array(_ToBufferChunkCapacity)
        _ToBufferOffset = 0
    }
    const buffer = _ToBufferChunk.subarray(_ToBufferOffset, _ToBufferOffset + len)
    _ToBufferOffset += len
    return buffer
}
```

## 避免频繁创建临时对象

对于高频调用的方法，如果有同类型的临时变量，可以通过在外部持有变量的方式来避免频繁创建，从而减少 GC 的时间。 举个例子，在 writer 的各个写入数据 API 中都需要先分配内存再写入数据，这里可以把分配得到的结果对象放在类上，通过参数传入。  

```typescript
export class Writer {
    // 这实际上是一个临时变量
    private _vecAllocated: AllocatedChunkRef = {
        chunk: {
            bytes: new Uint8Array([]),
            len: 0,
        }
    }

    public float(value: number) {
        // 传入得到结果
        this._vec.reserveMore(4, this._vecAllocated)
        pbFloat.writeFloatLE(value, this._vecAllocated.chunk.bytes, this._vecAllocated.chunk.len)
        this._vec.addLen(4)
        return this
    }

    public double(value: number) {
        // 传入得到结果
        this._vec.reserveMore(8, this._vecAllocated)
        pbFloat.writeDoubleLE(value, this._vecAllocated.chunk.bytes, this._vecAllocated.chunk.len)
        this._vec.addLen(8)
        return this
    }
}
```

# Profile

对代码进行 profile 分为两种情况：

- 在浏览器上 profile：直接编写 playground 后放在浏览器上运行，即可使用浏览器自身的 profiler  
- 在 NodeJS 上 profile：使用 NodeJS `Session` API 可以做 CPU profile，得到的 profile 可以导入到 Chrome 开发者工具的 performance 中查看火焰图  

```typescript
import fs, { readFileSync } from "fs"
import { Session } from 'node:inspector/promises'
import path from "path"

async function main() {
    const session = new Session();
    session.connect();
    await session.post('Profiler.enable');
    await session.post('Profiler.start');
    // Run your code
    const { profile } = await session.post('Profiler.stop');
    fs.writeFileSync('./profile.cpuprofile', JSON.stringify(profile));
}
main()
```


# 正确性验证

## 概述

这个库在 3 个方面验证正确性

- 代码内 assert  
- 自编写单元测试与 Fuzz 测试  
- [Google protobuf conformance test](https://github.com/protocolbuffers/protobuf/tree/main/conformance)，[protobuf-conformance](https://github.com/bufbuild/protobuf-conformance) 测试了若干 JS 实现的 protobuf 库的通过表现  


## assert

写这种库由于各种各样的性能优化，实际上非常容易写错，内部状态可以用 `assert` 库来验证。

```typescript
export class ByteVec {
    public fowardIter(iter: ByteVecIter) {
        assert(iter._chunk.len > 0, `[fowardIter] chunk len is 0`)
        if (iter._indexInChunk === iter._chunk.len - 1) {
            iter._indexInChunkList++
            iter._indexInChunk = 0
            iter._chunk = this._chunks[iter._indexInChunkList]
            assert(Boolean(iter._chunk), `[fowardIter] chunk is null, indexInArrayList = ${iter._indexInChunkList}`)
            iter._byte = iter._chunk.bytes[iter._indexInChunk]
        } else {
            // ...
        }
    }
}
```

在构建生产环境的包时，如果使用 rollup，可以用 rollup-plugin-unassert 插件把所有的 `assert` 语句去掉。

# 结论

在 JavaScript 实现高性能代码还是过于费劲了，在 2024 年的当下，还是应该考虑使用 WASM 作为高性能库的优先实现方案。  
