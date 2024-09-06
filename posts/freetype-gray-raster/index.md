# 序言

工作时遇到文本绘制的问题，最后用了 [FreeType](https://gitlab.freedesktop.org/freetype/freetype) 光栅化生成 gray bitmap 后使用 texture atlas 的方法绘制。经过实践，FreeType 灰度光栅化在字号在 11px - 16px 时也能取得相当不错的抗锯齿效果，笔者有些好奇 freetype 的实现原理，故有了此文。

# FreeType 的基础原理

FreeType 灰度光栅化器的目标是将矢量形式表达的字形 (glyph) 渲染成灰度 bitmap，这张 bitmap 常用来上传为纹理后通过 GPU 绘制。这里的矢量由若干的闭合路径与填充规则（奇偶 或 非零）组成，每条闭合路径由若干曲线首尾相连而成，每一条曲线可以是线段、二次贝塞尔曲线 (Quadratic) 或 三次贝塞尔曲线 (Cubic)。

# 一些 trick

本部分介绍 FreeType 中一些 trick 技巧，便于读者理解后续阐述 FreeType 实现的部分。

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

# FreeType 中贝塞尔曲线的细分

在光栅化过程中，FreeType 会将二次与三次贝塞尔曲线做细分，细分到每一段可以近似的看作线段，再以线段参与后续的光栅化过程。这样做的好处是做数学运算方便，如求与某条水平线的交点，求与某些水平线和垂直线形成的三角形的面积等。

众所周知，de Casteljau's 算法能够推导出细分 N 次贝塞尔曲线的算法，[A Primer on Bézier Curves](https://pomax.github.io/bezierinfo/#splitting) 网站以一种可交互的方式展示了三次贝塞尔曲线的细分，并提供了实现的伪代码。[Why Is the Subdivision Algorithm Correct? ](https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/Bezier/b-sub-correct.html) 文章推导了细分算法的正确性。

在实现中，常取 `$$t = 0.5$$`。

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

FreeType 在有无 `FT_INT64` 定义下的实现有所不同，本部分阐述 FreeType 在无该宏的情况下的实现。

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
- `fx`/`fy`：坐标 `x`/`y` 的整数部分

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

经过上述的处理后，得到了所有 `cell` 的结果，进而可以通过差分的方法得到所有像素点被覆盖的有向面积。本部分对于 y 轴的覆盖量与面积覆盖量均取实现上的意义，即取 2 倍面积。

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

- 当为非零时，颜色为 `$$\min(|coverage|,255)$$`
- 当为奇偶时，颜色为 `$$\left|\operatorname{mod}\left(\left(coverage-255\right),\ 255\cdot2\right)-255\right|$$`

![coverage](/freetype-gray-raster/coverage.png)
