# 序言

工作时遇到文本绘制的问题，最后用了 [FreeType](https://gitlab.freedesktop.org/freetype/freetype) 光栅化生成 gray bitmap 后使用 texture atlas 的方法绘制。经过实践，FreeType 灰度光栅化在字号在 11px - 16px 时也能取得相当不错的抗锯齿效果，笔者有些好奇 freetype 的实现原理，故有了此文。

# FreeType 的基础原理

FreeType 灰度光栅化器的目标是将矢量形式表达的字形 (glyph) 渲染成灰度 bitmap，这张 bitmap 可以上传为纹理后通过 GPU 绘制。这里的矢量由若干的闭合路径与填充规则（奇偶 或 非零）组成，每条闭合路径由若干曲线首尾相连而成，每一条曲线可以是线段、二次贝塞尔曲线 (Quadratic) 或 三次贝塞尔曲线 (Cubic)。

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
