# 序言

工作时遇到文本绘制的问题，最后用了 FreeType 光栅化生成 gray bitmap 后使用 texture atlas 的方法绘制。FreeType

本文会主要关注

- 官方的与自实现的 writer 的实现要点
- 如何保证编写的 writer 是正确的？
