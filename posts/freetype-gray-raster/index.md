# 序言

工作时遇到文本绘制的问题，最后用了 [FreeType](https://gitlab.freedesktop.org/freetype/freetype) 光栅化生成 gray bitmap 后使用 texture atlas 的方法绘制。经过实践，FreeType 灰度光栅化在字号在 11px - 16px 时也能取得相当不错的抗锯齿效果，笔者有些好奇 freetype 的实现原理，故有了此文。

# FreeType 的基础原理

FreeType 灰度光栅化器的目标是将矢量形式表达的字形 (glyph) 渲染成灰度 bitmap，这张 bitmap 常用来上传为纹理后通过 GPU 绘制。这里的矢量由若干的闭合路径与填充规则（奇偶 或 非零）组成，每条闭合路径由若干曲线首尾相连而成，每一条曲线可以是线段、二次贝塞尔曲线 (Quadratic) 或 三次贝塞尔曲线 (Cubic)。

# 一些 trick

本部分介绍 FreeType 中一些优化 trick，便于读者理解后续阐述 FreeType 实现的部分。

## 非递归分治 `$$2^n$$` 长度列表

对于 `$$2^n$$` 长度列表，每次分治，左右两边会原本长度的一半。因此，分治 `$$2^n$$` 长度列表需要 `n` 层递归。将分治中的每一个节点用二进制表达，有 `$$n + 1$$` 层，第 `$$1$$` 层记为 0，对于第 `$$i (1 \le i \le n)$$` 层，每个节点向左 `$$+0$$`，向右 `$$+2^{n-i}$$`。

### 先序遍历

未达到 `$$n+1$$` 层时，显然，每次递归都向左节点递归。达到 `$$n+1$$` 层时，应该回溯到哪个节点？回溯时，需要经过一系列向右的边，再经过一条向左的边，在这一节点处向右走。由于向右走是不停的将对应位置为 1，因此上述过程实际上是从右边找到第一位 0，将后续位全部置为 0，再将下一位置为 1。

![divide_and_conquer_preorder](/freetype-gray-raster/divide_and_conquer_preorder.png)

可以求解下一个节点所在的层与数值，用代码表述如下：

```rust
let k = lowbit(!current_value);

let next_depth = n - k.trailing_zeros() + 1;
let next_value = current_value & !(k - 1) | (k >> 1);
```

还要考虑另外一个问题，若当前为 `$$n+1$$` 层第 `$$j-1$$` 个节点，那么遍历到同层第 `$$j$$` 个节点需要经过多少个节点？实际上就是

```math
\begin{aligned}
(n + 1) - next\_depth + 1 &= (n + 1) - (n - trailing\_zeros(!(j - 1)) + 1) + 1 \\
                          &= trailing\_zeros(!(j - 1)) + 1 \\
                          &= trailing\_zeros(j) + 1 \\
\end{aligned}
```

### 后序遍历

类似的，对于求解后序遍历应回溯到哪个节点，是从右边找到第一位 1，将该位与后续位全部置为 0。

![divide_and_conquer_postorder](/freetype-gray-raster/divide_and_conquer_postorder.png)

求解层与数值表述如下：

```rust
let k = lowbit(current_value);

let next_depth = n - k.trailing_zeros() + 1;
let next_value = current_value & !((k << 1) - 1);
```

若当前为 `$$n+1$$` 层第 `$$j+1$$` 个节点，那么遍历到同层第 `$$j$$` 个节点需要经过的节点数为：

```math
\begin{aligned}
(n + 1) - next\_depth + 1 &= (n + 1) - (n - trailing\_zeros(j + 1) + 1) + 1 \\
                          &= trailing\_zeros(j + 1) + 1 \\
\end{aligned}
```

## 定点数

FreeType 以 26.6 定点数存储顶点数据，并以定点数做光栅化过程中的数学运算。相比与浮点数，这一场景下的定点数具有以下优点：

- 精度稳定，不会受到数字本身大小的影响
- 整数运算快，可以使用位运算技巧
- 天然具备离散化的特点

### 与浮点数的转换

26.6 定点数使用 `int` 存储，低 6 位表示小数部分，因此直接将浮点数乘上 `$$2^{64}$$` 后舍弃小数部分，即得到 26.6 定点数。逆过程则得到浮点数。

```rust
fn to_fixed(f: f32) -> i32 {
    (f * 64.0) as i32
}
fn from_fixed(t: i32) -> f32 {
    (t as f32) / 64.0
}
```

### 相同分母的分数连续相加

定点数做除法表达为商与余数，如果只做一次，那么大可以把余数丢弃，但是如果多个分数相加都把余数丢弃，会造成计算误差不断扩大。当这些分数的分母相同时，可以把前面计算得到的余数用来给后面的商做补偿。

```rust
impl DivMod {
    pub fn new(divisor: i32) -> Self {
        debug_assert!(divisor > 0);
        Self {
            divisor,
            remainder: 0,
        }
    }

    pub fn add(&mut self, value: i32) -> i32 {
        self.remainder += value;

        let mut quotient = self.remainder / self.divisor;
        self.remainder = self.remainder % self.divisor;

        if self.remainder < 0 {
            self.remainder += self.divisor as i32;
            quotient -= 1;
        }
        quotient
    }
}
```

## 函数 `$$f(x) = \left|\operatorname{mod}\left(\left(x-(2^k-1)\right),\ (2^k-1)\cdot2\right)-(2^k-1)\right|$$` 的二进制近似表达

当 `$$k = 8$$` 时，函数 `$$f(x)$$` 函数图像为：

![fx_mod_255](/freetype-gray-raster/fx_mod_255.png)

从二进制的角度上，从 0 开始，每增加 `$$2^k$$`，则第 `$$k$$` 位会从 0 变成 1，或从 1 变成 0。操作 `!x & ((1 << k) - 1)` 等价于 `((1 << k) - 1 - x & ((1 << k) - 1))`。于是可以构造这样一段函数 `$$g(x)$$`。

```rust
fn g(x: i32) -> i32 {
    let k = 8;
    let mut v = x;
    if ((x & k) != 0) {
        v = !x;
    }
    v = v & (k - 1);
    return v;
}
```

这个函数的图像为下图中红色的部分，黑色的部分为函数 `$$f(x)$$`。可知 `$$f(x)$$` 近似于 `$$g(\frac{2^k \cdot x}{2^k - 1})$$`，两者在各点相差不超过 1。

![fx_mod_255_bits](/freetype-gray-raster/fx_mod_255_bits.png)

## 多次相同分母的非负整数除法

算除法比算乘法慢得多，因此当多次非负除法除数一样时，可以考虑用 `$$\lfloor \frac{\lfloor\frac{k}{b}\rfloor \cdot a}{k}\rfloor$$` 来计算 `$$\frac{a}{b}$$`。首先计算一次 `$$b_r = \lfloor\frac{k}{b}\rfloor$$`，再根据不同的数 `$$a$$` 计算 `$$\lfloor\frac{b_r \cdot a}{k}\rfloor$$`。这里的 `$$k$$` 取 2 的幂，即可以避免后续计算除以 `$$k$$` 使用除法操作。

这里对 `$$k$$` 的要求是需要至少满足 `$$k \ge b$$`，在满足后续运算不溢出的情况下，`$$k$$` 越大，精度会越高。

![floor_a_b](/freetype-gray-raster/floor_a_b.png)

但出于性能方面的考量，FreeType 对前后两个操作中的 `$$k$$` 取了不同的值：

- 计算 `$$b_r$$` 时：取了 `$$2^{32} - 1$$`（即 `UINT_MAX`），因为作者发现这个数字在 32 位内计算会快一些
- 计算 `$$\lfloor\frac{b_r \cdot a}{k}\rfloor$$` 时：取了 `$$2^{32}$$`，因为方便右移

# FreeType 中贝塞尔曲线的细分

在光栅化过程中，FreeType 会将二次与三次贝塞尔曲线做细分，细分到每一段可以近似的看作线段，再以线段参与后续的光栅化过程。这样做的好处是做数学运算方便，如求与某条水平线的交点，求与某些水平线和垂直线形成的三角形的面积等。

众所周知，de Casteljau's 算法能够推导出细分 N 次贝塞尔曲线的算法，[A Primer on Bézier Curves](https://pomax.github.io/bezierinfo/#splitting) 网站以一种可交互的方式展示了三次贝塞尔曲线的细分，并提供了实现的伪代码。[Why Is the Subdivision Algorithm Correct? ](https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/Bezier/b-sub-correct.html) 文章推导了细分算法的正确性。

在实现中，常取 `$$t = 0.5$$`。

在此 `$$t$$` 的取值下，根据细分算法正确性推导文章中给出的结论 `$$D(t) = C(ut)$$`，则 `$$D(t) = C(\frac{1}{2}t)$$`。可以进一步推导出，若细分恰好组成了一棵 `$$2^n$$` 的树，那么细分出 `$$n$$` 段曲线，此时第 `$$i$$` 段曲线的终点为 `$$C(\frac{i}{n})$$`。显然二次贝塞尔曲线的细分具有这样的性质。

## 二次贝塞尔曲线细分的终止条件

FreeType 将二次贝塞尔曲线的终止条件设为：

```rust
fn is_near_zero(v: Vec) -> bool {
    return v.x.abs() < eps && v.y.abs() < eps;
}

let d = from + to - 2 * ctrl;
return is_near_zero(d);
```

当 `v` 为零向量时，代表三个点位于同一条直线上，又由于贝塞尔曲线可以理解为不断地做线性插值，因此这条曲线是一条线段，即细分希望达到的效果。

注意到 x, y 是独立的，因此可以单独看一个轴时。经过一次细分后，左侧曲线的目标值 `$$d'$$` 为：

```math
\begin{aligned}
d' &= from + \frac{\frac{from+ctrl}{2}+\frac{ctrl+to}{2}}{2} - 2 \cdot \frac{from+ctrl}{2} \\
&= \frac{from+to-2 \cdot ctrl}{4} \\
&= \frac{d}{4} \\
\end{aligned}
```

右侧曲线与左侧形式上是对称的，因此结果一致。所以实际上每次细分后目标值会变为上一次的 `$$\frac{1}{4}$$`，这个条件具有非常快的收敛速度。

## 三次贝塞尔曲线细分的终止条件

类似的，三次贝塞尔曲线的终止条件设为：

```rust
let d0 = 2 * from + to - 3 * ctrl0;
let d1 = from + 2 * to - 3 * ctrl1;

return is_near_zero(d0) && is_near_zero(d1);
```

当 `$$d_0 = d_1 = 0$$` 时，单独看一个轴时，能够推导出 `$$ctrl_0 - from = ctrl_1 - ctrl_0 = to - ctrl1$$`，因此这四个点在一条直线上且间距相同，这条曲线是线段。

将 `$$from$$`, `$$ctrl_0$$`, `$$ctrl_1$$`, `$$to$$` 分别记为 `$$p_0, p_1, p_2, p_3$$`，推导经过一次细分后 `$$d'_0$$`, `$$d'_1$$` 的值：

```math
\begin{aligned}
d_{0}' &= 2 p_0 + p_3 - 3 p_1 \\
&= 2 p_0 + \frac{1}{8} \sum_{i=0}^{3} {3 \choose i}p_i - 3 \sum_{i=0}^{1} {1 \choose i} p_i \\
&= \frac{5p_0-9p_1+3p_2+p_3}{8} \\
&= \frac{4p_0+2p_3-6p_1}{8} + \frac{p_0-3p_1+3p_2-p_3}{8} \\
&= \frac{d_0}{4} + \frac{d_0-d_1}{8} \\

d_{1}' &= p_0 + 2p_3 - 3 p_2 \\
&= p_0 + \frac{1}{4} \sum_{i=0}^{3} {3 \choose i}p_i - \frac{3}{4} \sum_{i=0}^{1} {1 \choose i} p_i \\
&= \frac{2p_0-3p_1+p_3}{4} \\
&= \frac{d_0}{4} \\
\end{aligned}
```

因此在 n 次细分后目标值会接近 `$$\frac{1}{4^n}$$`。令 `$$d_0=2^{32}, d_1=-2^{32}$$`，通过打表的方式看这一终止条件的收敛情况：

| 细分次数 |   `$$d_0$$`   |     `$$d_1$$` |
| :------- | :-----------: | ------------: |
| 1        | 3.221225472E9 | 1.073741824E9 |
| 2        | 1.34217728E9  |  8.05306368E8 |
| 3        | 4.69762048E8  |   3.3554432E8 |
| 4        | 1.50994944E8  |  1.17440512E8 |
| 5        |  4.6137344E7  |   3.7748736E7 |
| 6        |  1.3631488E7  |   1.1534336E7 |
| 7        |   3.93216E6   |    3.407872E6 |
| 8        |  1.114112E6   |      9.8304E5 |
| 9        |   3.11296E5   |     2.78528E5 |
| 10       |   8.6016E4    |      7.7824E4 |
| 11       |   2.3552E4    |      2.1504E4 |
| 12       |     6.4E3     |       5.888E3 |
| 13       |    1.728E3    |         1.6E3 |
| 14       |      464      |           432 |
| 15       |      124      |           116 |
| 16       |      33       |            31 |
| 17       |     8.75      |          8.25 |
| 18       |    2.3125     |        2.1875 |
| 19       |   0.609375    |      0.578125 |
| 20       |  0.16015625   |    0.15234375 |

即使初值非常大，但当细分到第 19 次时 `$$d'_0$$`, `$$d'_1$$` 的值已经小于 1。

# 无 `FT_INT64` 宏定义下的实现

FreeType 在有无 `FT_INT64` 定义下的实现有所不同，在没有这个宏时，所有运算都不能突破 32 位。本部分阐述 FreeType 在无该宏的情况下的实现。

## 基本思想

FreeType 灰度光栅化器的基本思想是：计算 bitmap 中每一个像素点被覆盖的有向面积 `area`，根据填充规则 与 `$$\frac{area}{pixel\_area}$$` 决定这一像素点的灰度值。而当使用扫描线算法，按水平线扫描时，只有扫描到线才会产生面积的变化，因此只需要计算每条线在包含其的像素点内的信息，每个像素点被覆盖的有向面积可以通过差分推出。将每个像素点位置记录的信息称之为 `cell`，`cell` 需要记录的信息是：

- 这条线在 y 轴的增量 `cell_cover`。后续那些不包含线的像素点能够计算得到总的 y 轴覆盖量（可能为负），进而计算得到有向覆盖面积。
- 这条线左侧的有向面积 `cell_area`。这样在扫描时能够计算当前像素点的有向覆盖面积。

![scan_a](/freetype-gray-raster/scan_a.png)

## 精度扩大

首先需要注意到虽然 FreeType 使用 26.6 定点数存储了顶点的数据，但是光栅化的过程中，FreeType 实际上默认使用 8 位小数位做运算，并有以下定义：

- `PIXEL_BITS`：一个像素内的小数部分大小的位数，默认为 8，代表一个像素精度为 `$$\frac{1}{256}$$`。至少需要有 6 位，即与 26.6 定点数的精度一致。
- `ONE_PIXEL`：一个像素内的小数部分大小，为 `1 << PIXEL_BITS`
- `UPSCALE`：对定点数按 `PIXEL_BITS` 扩大精度，可以认为实现为 `x << (PIXEL_BITS - 6)`
- `DOWNSCALE`：按 `PIXEL_BITS` 减小精度转换回定点数，可以认为实现为 `x >> (PIXEL_BITS - 6)`
- `ex`/`ey`：坐标 `x`/`y` 的整数部分
- `fx`/`fy`：坐标 `x`/`y` 的小数部分

此部分对应 [代码开始部分宏定义](https://gitlab.freedesktop.org/freetype/freetype/-/blob/d2612e1c3ff839595fbf67c8263a07d6bac3aaf5/src/smooth/ftgrays.c#L335) 的实现。

## 线段在水平扫描线内

将线段的起点记为 `$$(x_1, y_1)$$`，终点记为 `$$(x_2, y_2)$$`，令 `$$d_x = x_1 - x_2$$`, `$$d_y = y_1 - y_2$$`。首先考虑线段起点与终点都落在水平扫描线的情况，即 `$$ey_1 == ey_2$$` 的情况。

如果起点与终点都落在单个像素点内，那么该像素点被覆盖面积增量是 `$$\frac{(fx_1 + fx_2) \cdot d_y}{2}$$`。

如果起点与终点落在不同的像素点内，那么从起点开始逐步移动到终点计算。当 `$$d_x > 0$$`：

- 对于起点，移动到下一像素点 x 轴增量为 `$$Pixel - fx_1$$`，y 轴增量使用相似三角形计算为 `$$\frac{d_y \cdot |Pixel - fx_1|}{|d_x|}$$`，被覆盖的面积增量为 `$$\frac{(fx_1 + Pixel) \cdot d_y}{2}$$`
- 对于中间像素点，移动到下一个像素点 x 轴增量为 `$$Pixel$$`，y 轴增量为 `$$\frac{d_y \cdot Pixel}{|d_x|}$$`，被覆盖的面积增量为 `$$\frac{d_y \cdot Pixel^2}{2|d_x|}$$`
- 对于终点，当前像素点 x 轴增量为 `$$fx_2$$`，y 轴增量为 `$$\frac{d_y \cdot fy_2}{|d_x|}$$`，被覆盖的面积增量为 `$$\frac{d_y \cdot fy_2^2}{2|d_x|}$$`

当 `$$d_x < 0$$` 时的计算是类似的，这里不做展开，读者可以自行推导。

另外还需要注意：

- 在实际实现中，将被覆盖的面积 `cell_cover` 与 y 轴增量 `cell_cover` 都乘上 2，以消除分母
- 上述过程是一个从起点移动到终点中分数连续相加的过程，需要运用之前提到的 “相同分母的分数连续相加” 的方法来减少精度误差
- 可能有多条线穿过同一个像素点，因此对 `cell_cover`, `cell_area` 的计算需要累加

此部分对应了方法 [gray_render_scanline](https://gitlab.freedesktop.org/freetype/freetype/-/blob/d2612e1c3ff839595fbf67c8263a07d6bac3aaf5/src/smooth/ftgrays.c#L640) 的实现。

![scanline](/freetype-gray-raster/scanline.png)

## 线段

如果线段不在水平扫描线内，那么可以拆分成多段水平扫描线，这个过程需要计算从起点开始逐步移动到终点中 y 为整数的点。当 `$$d_y > 0$$`：

- 对于起点部分，移动到该点 y 轴增量为 `$$Pixel - fy_1$$`，x 轴增量为 `$$\frac{(Pixel - fy_1) \cdot d_x}{d_y}$$`
- 对于中间部分，从上一点移动到该点 y 轴增量为 `$$Pixel$$`，x 轴增量为 `$$\frac{Pixel \cdot d_x}{d_y}$$`

当 `$$d_x < 0$$` 时的计算也是类似的。此部分对应了方法 [gray_render_line](https://gitlab.freedesktop.org/freetype/freetype/-/blob/d2612e1c3ff839595fbf67c8263a07d6bac3aaf5/src/smooth/ftgrays.c#L736) 的实现。

![line](/freetype-gray-raster/line.png)

## 二次贝塞尔曲线

二次贝塞尔曲线细分成多段线段后，可以按多段线段计算。FreeType 在这一过程中使用非递归细分算法，并且预分配了栈顶点数组。

按照 “二次贝塞尔曲线细分的终止条件”，`eps` 取 `$$\frac{Pixel}{4}$$` 时，由于处理 `int32` 数据，所以细分层数不会超过 15（不包含最开始的 3 个顶点），一次细分会多出 2 个顶点，因此非递归算法所需的顶点栈长度取 `16 * 2 + 1`。

- 栈一开始为 `[to, ctrl, from]`，即栈存放的时逆序的数据
- 每次细分时取栈最后的 3 个点细分为 5 个点
- 细分为线段时，取栈最后 2 个顶点为线段计算，再弹出

令 `$$d_x = \max(d_x, d_y)$$`，能够计算得到需要的细分层数 `draw`。整个细分过程，可以看作是对 `$$2^{draw}$$` 长度列表的数组后序分治的过程。非叶节点执行的是细分曲线，叶节点得到了线段。

![split_quad](/freetype-gray-raster/split_quad.png)

这个过程并不需要知道当前访问了哪个节点，只需要计算从叶节点到下一个叶节点所需要的经过的节点个数 `split'`，执行 `split' - 1` 次的细分，再执行一次对线段的运算。假设计算 `split'` 过程有 `split' = lowbit(j) + 1`，这里可以使用 `lowbit(j)` 的结果，通过循环右移的方式执行细分与线段的运算，并不需要将 `split'` 的值算出来。`lowbit` 的运算为 `lowbit(x) = x & -x`，计算快，而计算 `split'` 需要用到 `trailing_zeros`，这一方法的性能取决于具体硬件。

此部分对应了方法 [gray_render_conic](https://gitlab.freedesktop.org/freetype/freetype/-/blob/d2612e1c3ff839595fbf67c8263a07d6bac3aaf5/src/smooth/ftgrays.c#L1013) 的实现。

## 三次贝塞尔曲线

三次贝塞尔曲线的处理与二次贝塞尔曲线类似，不同的是：

- `eps` 取 `$$\frac{Pixel}{2}$$`，此时查表可知细分层数不会超过 15，顶点栈长度取 `16 * 3 + 1`
- `$$d_x$$` 细分时无法恰好对半分，因此不能使用 `$$2^n$$` 长度数组分治 trick，需要在每次细分时判断是否满足细分终止条件

此部分对应了方法 [gray_render_cubic](https://gitlab.freedesktop.org/freetype/freetype/-/blob/d2612e1c3ff839595fbf67c8263a07d6bac3aaf5/src/smooth/ftgrays.c#L1281) 的实现。

## Bitmap 生成

经过上述的处理后，得到了所有 `cell` 的结果，进而可以通过差分的方法得到所有像素点被覆盖的有向面积，最后计算得到灰度值。本部分对于 y 轴的覆盖量与面积覆盖量均取实现上的意义，即取 2 倍面积。

假设在水平扫描线过程中，维护 y 轴的覆盖量 `cover` 与单个像素面积的覆盖量 `area`。当遍历到像素点 `$$(x,y)$$` 时，若该处没有变化值：

```math
\begin{aligned}
cover_{x,y} &= cover_{x-1,y} \\
area_{x,y} &= cover_{x,y} \cdot Pixel \cdot 2 \\
\end{aligned}
```

当有变化值时：

```math
\begin{aligned}
cover_{x,y} &= cover_{x-1,y} + cell\_cover_{x,y} \\
area_{x,y} &= cover_{x,y} \cdot Pixel \cdot 2 - cell\_area_{x,y} \\
\end{aligned}
```

![sweep](/freetype-gray-raster/sweep.png)

灰度取值范围为 `$$[0,255]$$`，令 `$$coverage = \frac{255 \cdot area}{2 \cdot Pixel^2}$$`，那么根据填充规则：

- 当为非零时，灰度值为 `$$\min(|coverage|,255)$$`
- 当为奇偶时，灰度值为 `$$\left|\operatorname{mod}\left(\left(coverage-255\right),\ 255\cdot2\right)-255\right|$$`

![coverage](/freetype-gray-raster/coverage.png)

FreeType 用二进制近似表达 trick 优化了上述的计算，将 `$$coverage$$` 缩放 `$$\frac{256}{255}$$` 来计算。

```math
\begin{aligned}
coverage' &= \frac{256}{255}coverage \\
&= \frac{2^8 \cdot area}{2 \cdot 2^{Pixel\_Bit + 1}} \\
&= \frac{2^8 \cdot area}{2 \cdot 2^{2 \cdot Pixel\_Bit}} \\
&= \frac{area}{2^{2 \cdot Pixel\_Bit - 7}} \\
\end{aligned}
```

接下来根据填充规则计算：

- 对于奇偶规则，取 `$$2^k = 256$$`
- 对于非零规则，取 `$$2^k$$` 需要取一个比较大的值，FreeType 取了 `INT_MIN`，最后需要 clamp 到 255 内

此部分对应了方法 [gray_sweep](https://gitlab.freedesktop.org/freetype/freetype/-/blob/d2612e1c3ff839595fbf67c8263a07d6bac3aaf5/src/smooth/ftgrays.c#L1733) 的实现。

# 存在 `FT_INT64` 宏定义下的实现

当有 `FT_INT64` 时，可以使用 64 位整数做运算，这主要是允许了两个 32 位的整数相乘。在现有的 FreeType 实现中，以下方法的实现与无该宏的实现有所不同：

- 对线段的处理
- 对二次贝塞尔曲线的细分

## 线段

这部分实现中，不再将线段拆成多段落在水平扫描线内的线段，而是直接计算从起点出发到终点，穿过的每一个 `cell` 的起点与终点，这样做能够有效避免大量的除法运算，加快算法速度。

假设当前落在 `cell` 内的坐标是 `(fx, fy)`，则按向上、下、左、右四种情况的穿出这一 `cell` 来讨论。本文只阐述 向右 穿出的情形，其余情形留给读者推导。假设当前向右穿出 `cell`，到穿出位置的向量记为 `(vx, vy)`，传出的位置为 `(fx', fy')`，那么有

```math
\frac{v_x}{v_y} = \frac{d_x}{d_y}
```

```math
v_x + f_x = Pixel
```

```math
0 \le v_y + f_y \le Pixel
```

结合上述能够得到向右穿出的条件：

```math
\begin{aligned}
0 &\le v_y + f_y &\le Pixel \\
0 &\le \frac{d_y}{d_x}v_x + f_y &\le Pixel \\
0 &\le d_y \cdot (Pixel - f_x) + d_x f_y &\le d_x \cdot Pixel \\
-d_y \cdot Pixel &\le d_x f_y - d_y f_x &\le d_x \cdot Pixel - d_y \cdot Pixel \\
\end{aligned}
```

这里记 `$$prod = d_x f_y - d_y f_x$$`，它在整个计算过程中都会用到，并且可以方便的更新。令下一位置的 `prod` 值为 `prod'`，`$$\Delta prod = prod' - prod$$`，则：

```math
\begin{aligned}
\Delta prod &= d_x v_y + d_y v_x \\
&= d_y v_x + d_y f_x \\
&= d_y \cdot Pixel \\
\end{aligned}
```

根据此可以算出传出位置 `fy'` 的值（显然 `fx'` 为 0，不需要特意计算）：

```math
\begin{aligned}
prod' &= d_x f'_y \\
  f'_y &= \frac{prod'}{d_x} \\
\end{aligned}
```

至此，所有的量都得到了维护。另外需要注意的是，整个过程会频繁的用到 `$$\frac{1}{d_x}$$` 与 `$$\frac{1}{d_y}$$`，FreeType 使用了 多次分母相同的非负整数除法 trick 进行了优化。

此部分对应了方法 [gray_render_line](https://gitlab.freedesktop.org/freetype/freetype/-/blob/d2612e1c3ff839595fbf67c8263a07d6bac3aaf5/src/smooth/ftgrays.c#L1013) 的实现。

## 二次贝塞尔曲线

此部分并不使用分治的细分算法，而是直接使用 DDA 进行计算每段细分后的线段的起点与终点。（作者在 commit 中表示这是因为 benchmark 显示在这里使用 DDA 会稍微快一些）

按贝塞尔曲线的细分性质，能知道当细分得到 `$$n$$` 段线段时，每段线段的终点对应 `$$t = \frac{i}{n}, i = 1, 2, \cdots, n$$`。以下来自源码注释的推导说明了每段线段的终点可以通过迭代与递推得到：

令 `$$h = \frac{1}{n}$$`，`$$A = 2(P_1-P_0)$$`，`$$B = P_0+P_2-2P_1$$`

```math
\begin{aligned}
P(t) &= P_0 (1 - t)^2 + P_1 (1 - t)t + P_2 t^2 \\
&= P_0 + At^2 + 2Bt \\
Q(t) &= P(t + h) - P(t) \\
&= 2Bh + Ah^2 + 2Aht \\
R(t) &= Q(t + h) - Q(t) \\
&= 2Ah^2 \\
\end{aligned}
```

此部分对应了方法 [gray_render_conic](https://gitlab.freedesktop.org/freetype/freetype/-/blob/d2612e1c3ff839595fbf67c8263a07d6bac3aaf5/src/smooth/ftgrays.c#L1013) 的实现。

# 后言

查阅 FreeType 源码的时候，本文阐述的许多优化实际上是在 2015 - 2019 年合并进去的，而不是一开始就是这样实现的。优秀的库也是需要时间不断迭代，才成为了今天这个样子。

不过，这些优化并不是一时半会能想出来的，而且更偏科研方向，写本文全当算法练习了。
