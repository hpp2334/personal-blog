## 前言

[hashbrown](https://github.com/rust-lang/hashbrown) 是 SwissTable 的 Rust 实现，而 SwissTable 是 Google 在 [CppCon 2017](https://www.youtube.com/watch?v=ncHmEUmJZf4) 上公开的一种更快的 HashTable。从 Rust 1.36 开始（2023.12.04 Rust stable 版本为 1.74.1），hashbrown 为 Rust `HashMap`/`HashSet` 的默认实现。

最近笔者研究 hashbrown 库出于以下的两件事情。

### `Arc<Mutex<HashMap<U, V>>>`

在多线程并发下，经常会用到 `Arc<Mutex<HashMap<U, V>>>`，但这意味着每次读写 hashmap 都需要锁 mutex，对性能影响比较大。这个问题实际上是 **实现高效的多线程并发 HashMap**，有库 [dashmap](https://github.com/xacrimon/dashmap) 实现了这一数据结构，笔者后面再单独研究后写文章来阐述。

### C++ 标准库 `unordered_map` 慢

最近工作中的 C++ 项目跑 benchmark 发现 `unordered_map` 的 `find` 操作特别慢。而由于该业务处的 hashmap 比较稀疏，因此加了一段代码用来快速排除 `find` 结果。这个问题向外拓展是 **有没有什么实现的比较快 HashMap**。

```cpp
// 不用取模的 hash 函数，速度会比较快
int quickHash(U& u) { return u.hashCode & 0x7f; }

void QuickHashTable::initialize(U& u) {
    // 初始化时构造 bitset
    this->bitset.set(quickHash(u), true);
}

V* QuickHashTable::find(U& u) {
    // 不包含则肯定不在 hashmap 里，可以直接返回 null
    if (!this->bitest.test(quickHash(u))) {
        return nullptr;
    }
    // ... 省略剩下的实现
}
```


## AHash

由于介绍的是 HashTable，首先需要搞明白 **如何衡量一个 hash 函数**。一个 hash 函数可以通过以下方面衡量：

- 性能
    - hash 小对象的速度：如 `uint64`  
    - hash 大对象的速度：如 1kb 的 `string`  
    - 占用内存  
- 质量
    - DDOS 攻击防御：在已知种子的情况下，能否构造一组数据使得都 hash 为同一个值  
    - 是否存在 bad seeds：使用这些种子会导致 DDOS 攻击  
    - 是否存在未定义行为 (Undefined Behaviour, UB)  

[SMhasher 测试套件](https://github.com/rurban/smhasher) 可以用来测试 hash 函数的性能和质量。  

[AHash](https://github.com/tkaitchuck/aHash) 是 hashbrown 默认的 hash 函数，它的速度非常快，对 DDOS 的防御有限，被设计在内存中使用。  

以下是 AHash 在 hash `u64` 时在 `fallback_hash.rs` 中的部分实现，其中只使用同余乘法、异或、位移等操作来实现。对于 AHash 的 hash 质量，笔者功力不足无法理解，或许搞 CTF 的同学更能看得懂（所谓术业有专攻）。  

```rust
///This constant comes from Kunth's prng (Empirically it works better than those from splitmix32).
pub(crate) const MULTIPLE: u64 = 6364136223846793005;

pub(crate) const fn folded_multiply(s: u64, by: u64) -> u64 {
    let result = (s as u128).wrapping_mul(by as u128);
    ((result & 0xffff_ffff_ffff_ffff) as u64) ^ ((result >> 64) as u64)
}

impl AHasher {
    // ...
    #[inline(always)]
    fn update(&mut self, new_data: u64) {
        self.buffer = folded_multiply(new_data ^ self.buffer, MULTIPLE);
    }
}
```

## 一些前置知识

### 三角数 mod `$$2^n$$`

hashbrown 内部用的不是 拉链法，而是 基于 [三角数](https://zh.wikipedia.org/zh-hans/%E4%B8%89%E8%A7%92%E5%BD%A2%E6%95%B8) （杨辉三角每一行的中间数）的探测法。

假设 `i = hash(x)`，那么 hashbrown 会依次访问大小为 N 的数组的第 `i % N`, `(i + 1) % N`, `(i + 1 + 2) % N`, `(i + 1 + 2 + 3) % N`, ... 位。可以证明，访问 N 次时，恰好访问且仅访问了数组中的每一位一次。

由于 `i` 只是偏移量，可以简单的令 `i = 0`，则 `0, 1, 3, 6, ...` 构成三角数（杨辉三角每一行的中间数）。这相当于证明 **从第 `$$1$$` 个到第 `$$2^n$$` 个三角数 mod `$$2^n$$`** 构成 `$$0$$` 到 `$$2^n - 1$$` 的一个排列数。

文章 [Triangular numbers mod 2^n](https://fgiesen.wordpress.com/2015/02/22/triangular-numbers-mod-2n/) 给出了详细的证明，笔者这里根据自己对这篇文章的理解给出证明。

令

```math
T_n = \sum_{i=0}^{n-1}i \mod n = i(i+1)/2 \mod n
```

性质 1：`$$T_k$$` 在 `$$n$$` 与 `$$n-1$$` 之间处对称，即 `$$T_k = T_{2n-1-k}$$`，证明：

```math
\begin{aligned}
T_{2n-1-k} - T_k &= (2n-k)(2n-1-k) / 2 - k(k + 1) / 2 \mod n\\
&= 2n^2 - (2k+1)n + k(k+1)/2 - k(k+1)/2 \mod n\\
&= 2n^2 - (2k+1)n \mod n\\
&= 0 \mod n
\end{aligned}
```

另外，这里有

```math
\begin{aligned}
T_{2n-1-k} - T_k &= 2n^2 - (2k+1)n \mod 2n\\
&= -n \mod 2n
\end{aligned}
```

性质 2：`$$T_k \mod n$$` 的循环节为 `$$2n$$`，证明：

```math
\begin{aligned}
T_{a+b} &= \sum_{i=0}^{a+b-1}i \mod n\\
        &= \sum_{i=0}^{a-1}i + \sum_{i=a}^{a+b-1}i \mod n\\
        &= T_a + \sum_{i=0}^{b-1}(i+a) \mod n\\
        &= T_a + T_b + ab \mod n
\end{aligned}
```

```math
\begin{aligned}
T_{2n+k} - T_{k} &= T_{2n} + T_k + 2nk - T_k \mod n\\
                 &= T_{2n} + 2nk \mod n\\
                 &= n(2n+1) + 2nk \mod n \\
                 &= 0
\end{aligned}
```

性质 3: 当 n 为 2 次方时，`$$k$$` 从 `$$1$$` 到 `$$n$$` 时 `$$T_k$$` 为 `$$0$$` 至 `$$n-1$$` 的一个排列，使用递推证明：

定义 `$$f(2^{n-1}, k) = T_k \mod 2^{n-1}$$`，当 `$$k$$` 从 `$$1$$` 到 `$$2^{n-1}$$` 时 `$$f(2^{n-1}, k)$$` 为 `$$0$$` 至 `$$2^{n-1}-1$$` 的一个排列，那么


```math
\begin{aligned} 
f(2^n, k) &= T_k \mod 2^n
\end{aligned}
```

因此对于 `$$k$$` 从 `$$1$$` 到 `$$2^{n-1}$$`，`$$f(2^n, k)$$` 的值为 `$$f(2^{n-1}, k)$$` 或 `$$f(2^{n-1}, k) + 2^{n-1}$$`。又因为

```math
\begin{aligned} 
f(2^n, 2^n-1-k) &= T_{2^n-1-k} \mod 2^n \\
                &= T_k - 2^{n-1} \mod 2^n \\
                &= T_k + 2^{n-1} \mod 2^n
\end{aligned}
```

所以 `$$f(2^n, 2^n-1-k)$$` 与 `$$f(2^n, k)$$` 在同余下相差 `$$2^{n-1}$$`。当 `$$k$$` 从 `$$1$$` 到 `$$2^{n}$$` 时 `$$f(2^n, k)$$` 包含了 `$$0$$` 至 `$$2^{n-1}-1$$` 的一个排列以及 `$$2^{n-1}$$` 至 `$$2^n-1$$` 的一个排列，正好是 `$$0$$` 至 `$$2^n-1$$` 的一个排列。


### 一些通用的位运算

#### 删掉最后一位 1

```rs
x & (x - 1)
```

很好理解，将 x 表述为 `...10000...000`，x - 1 为 `...01111...111`，相与最后 1 位变为 0。  

#### 最后一位 1 的位置

本质上是个二分算法，但直接用 `trailing_zeros` 计算（C++ 用 `__builtin_ctz`），编译器可能会翻译为 CPU 指令，性能会高出很多。  

### hashbrown 中的一些位运算

由于还没有介绍 hashbrown 的原理，笔者这里换一种方式介绍背景。

现在有一个 `u8` 的数组，其中的值只可能是 `0x80`, `0x8f` 或 `0x00` 至 `0x7f` 中的任何数。我们可能从数组的任意位置视为 `u32` 将数据读出来做运算。

#### 将 `0x80`, `0xff` 转为 `0x80`，剩下的转为 `0x00`

直接和 `0x80808080` 相与。

```rs
x & u32::from_ne_bytes(0x80)
```

#### 将 `0xff` 转为 `0x80`，剩下的转为 `0x00`

实际上是判断最高位和次高位为 1。让自己与自己左移一位相与，再与 `0x80`，结果为 `0x80` 说明最高位和次高位都为 1。

```rs
x & (x << 1) & u32::from_ne_bytes(0x80) 
```

#### 将指定的 y 转为 `0x80`，剩下的转为 `0x00`

操作 `(t - 1) & ~t` 能得到取最低位 1 再减 1 的结果，当 `t = 0` 时结果为 `0xff`，是唯一能让最高位为 1 的值。所以先异或 `x`，再应用这个操作，最后直接与 `0x80`。

```rs
let z = x ^ u32::from_ne_bytes(y);
z.wrapping_sub(repeat(0x01)) & !z & repeat(0x80)
```

## hashbrown 的工作原理

### 内存布局

![Memory Layout](/learn-rust-by-lib-hashbrown/memory_layout.png)

一个桶大小为 `n` 的 hashbrown 的内存布局如上图所示，被分为 3 个部分：

- Padding: 最前面的部分，目的是让后面的 control offset 处在内存对齐的位置  
- Data: 存放真实数据，这里注意数据是逆序存放的  
- Control Bits: 控制位，control offset 是控制位的起始位置，`$$CT_i$$` 与 `$$T_i$$` 对应，反映了 `$$T_i$$` 的特征，也反映了存在与否

这里的 `n` 一定是 2 的幂。

### h1, h2 函数

hashbrown 中定义了 `h1`, `h2` 函数：

- `h1(x)`: `hash(x)`
- `h2(x)`: `(hash(x) >> (8 * sizeof(usize) - 7)) & 0x7f`，即取高 7 位

`h1` 决定了数据存放的位置，`h2` 决定了数据的特征值。具体的，如果插入 `x` 且能够插入，那么：

- `x` 所在的位置 `i` 为 `h1(x) % n`
- `$$T_i$$` 为 `x`  
- `$$CT_i$$` 为 `h2(x)`

顺带一提，这里和 SwissTable 的定义不太一样，SwissTable 定义了 `h1` 是高 57 位，`h2` 是低 7 位，和 hashbrown 刚好反过来。  

### Control Bits

数据位是 hashbrown 中用于快速检索的设计，有三种状态：

- EMPTY: 代表空，值为 `0xff`  
- DELETE: 代表被删除，值为 `0x80`  
- FULL: 代表有值，值的范围为 `[0x00, 0x7f]`，由 `h2(x)` 计算得到  

由于每个控制位占 1 个字节，所以可以在数据位段中将某一段视为 `u32`, `u64` 甚至 `u128` 进行查找。这一段在 hashbrown 里被称为 `Group`，`Group` 中的字节数记录在了 `Group::WIDTH` 上。有了 `Group` 加上上文介绍的位运算，能够根据需要过滤得到数据位中 FULL, DELETE, EMPTY 的位置。

![Control Bits & Group](/learn-rust-by-lib-hashbrown/control_bits_group.png)



