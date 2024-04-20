# Background

Recently, it's notable that the protobuf.js library has been observed to cause browser OOM(Out of memory) when serializing large JavaScript objects due to an excessive number of JavaScript objects. This issue seems unavoidable. Consequently, an alternative protobuf.js writer was developed to address scenarios involving the serialization of large JavaScript objects. Details of this implementation can be found in this [Repository](https://github.com/hpp2334/pbw-moon).

The results are as follows:

- Serialization of small objects (using the bench.proto and bench.json files from the official repository, resulting in a serialized output of 79 bytes) took 1.15 times longer, with negligible changes in JavaScript object heap memory.  
- Serialization of large objects (using a custom object which results in a serialized output of over 18MB) was 0.3 times faster than the original implementation, and reduced JavaScript heap memory consumption to 0.07 times.  

This post will primarily focus on:

- Key implementation aspects of both the official and the alternative protobuf.js writers.  
- How to ensure the correctness of the writer?  


# protobuf.js writer API

protobuf.js allows passing a writer as the second argument to the `encode` method.

```js
protos.partialsketch.Layer.encode(p, new Writer()).finish()
```

The APIs that need to be implemented on this writer can be categorized as follows:

- Data Writing: Write varint32, varint64, bytes, etc.  
- fork: Temporarily store the current serialized result, clear its own state, and treat itself as a completely new writer.  
- reset: Discard the current serialized result, restore the previously stored result, and use it as the current state.  
- ldelim: Write the current serialized result as bytes after the previous result (i.e., first write the length as varint32, then write the result), then restore to the previous result.  
- finish: Retrieve the current serialized result and return `Uint8Array`.  


# Official protobuf.js writer implementation

The implementation utilizes a linked list as the internal structure of the writer, which can be described as:

```typescript
// Linked list node
interface Op<T> {
    fn: (val: T,  buf: Uint8Array, pos: number) => void
    // byte len
    len: number
    val: T
    next: Op<unknown> | null
}

// Stash state
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

The writer maintains the data to be written using a linked list with head and tail, and the states are maintained as a stack linked list for temporary state storage.  

- When writing data, a node is directly appended after the tail.  
- When `fork` is called, a new state is created and inserted at the head of states. The current linked list is moved into it, then the head and tail are reset.  
- When `reset` is called, the head and tail are restored by taking out the head of states.  
- When `ldelim` is called, the head of states is taken out and the linked list is merged.  
- When `finish` is called, the linked list is traversed sequentially, calling `fn` to get the result.  

The advantages are:

- `fork`，`reset`，`ldelim`  can all be implemented in `$$O(1)$$`.  
- Calculations are avoided until the `finish` step, preventing redundant computations caused by `reset`.  

The disadvantages are also apparent:

- Each time data is written, at least one linked list node is added, leading to a sharp increase in JavaScript heap memory.
- Calculations are slow in large linked list.  


# Alternative protobuf.js writer implementation

The writer is with a paged doubling array as the internal structure, and it can be described as:

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

The writer maintains the written data using a paged doubling array `vec`, and it manages the saved states `snapshots`.

- When writing data, it directly writes the data into the array.  
- When `fork` is called, it saves the current paged state into snapshots. (In reality, there are some tricks performed here for `ldelim`, which you can explore in the source code if interested.)  
- When `reset` is called, it retrieves the last snapshot state and directly adjusts the array size `len` without modifying the actual written data.  
- When `ldelim` is called, it retrieves the last snapshot state, moves the array segment, and writes the length.
- When `finish` is called, it traverses all pages to merge the results.

The benefits of this approach are:

- Using arrays instead of linked lists greatly reduces the JavaScript object heap memory usage.  
- For large objects, using arrays has better performance.

The drawbacks are:

- If `reset` occurs after `fork` and performing some operations, the data for that segment will also be computed.  
- There will be some non-JavaScript heap memory consumption.  


# Optimization techniques for improving performance

## `Uint8Array` Pool

When obtaining a Uint8Array at last, memory allocation can be minimized by using a pooled `Uint8Array`. Simply put, initially allocate a large `Uint8Array`, and then slice it into smaller portions as needed using `subarray`.

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

## Avoid creating temporary objects frequently

For frequently called methods, if there are temporary variables of the same type `T`, you can avoid frequent creation by holding the variables externally, thus reducing the time spent on GC. For example, in writing data APIs of the writer, memory allocation is required before writing data. Here, the allocated result object can be stored in the class and passed in as a parameter.  

```typescript
export class Writer {
    // temporary object
    private _vecAllocated: AllocatedChunkRef = {
        chunk: {
            bytes: new Uint8Array([]),
            len: 0,
        }
    }

    public float(value: number) {
        // pass in as a parameter
        this._vec.reserveMore(4, this._vecAllocated)
        pbFloat.writeFloatLE(value, this._vecAllocated.chunk.bytes, this._vecAllocated.chunk.len)
        this._vec.addLen(4)
        return this
    }

    public double(value: number) {
        // pass in as a parameter
        this._vec.reserveMore(8, this._vecAllocated)
        pbFloat.writeDoubleLE(value, this._vecAllocated.chunk.bytes, this._vecAllocated.chunk.len)
        this._vec.addLen(8)
        return this
    }
}
```

# Profile

Profiling code can be divided into two scenarios:

- Profiling in the browser: Write a playground directly and run it in the browser, where you can use the browser's built-in profiler.
- Profiling in Node.js: Use the Node.js `Session` API to perform CPU profiling. The obtained profile can be imported into the performance tab of Chrome Developer Tools to view the flame graph.


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


# Validate correctness

## Overview

This library validates correctness in three aspects:

- `assert` statements within the code
- unit tests and fuzz tests   
- [Google protobuf conformance test](https://github.com/protocolbuffers/protobuf/tree/main/conformance). [protobuf-conformance](https://github.com/bufbuild/protobuf-conformance) evaluates the correctness of several JS implementations of protobuf libraries.


## assert

Writing such a library can be prone to errors due to various performance optimizations. Internal states can be validated using the `assert` statement.

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

When building packages for production environments, if using Rollup, all assert statements can be removed by the [rollup-plugin-unassert](https://github.com/unassert-js/rollup-plugin-unassert) plugin.

# Conclusion

It's quite pain to implement high-performance code in pure JavaScript. In the current landscape of 2024, prioritizing the use of WASM as the implementation solution for high-performance libraries should be considered.
