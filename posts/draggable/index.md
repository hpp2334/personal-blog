## 前言

一般情况下，前端实现拖拽效果可以采用两种方式（或两种方式一起结合）：

- Drag and Drop API：标准拖拽 API，可以从操作系统获取数据（如 拖拽文件到浏览器中），但拖动元素时无法实现动态移动的效果；
- MouseEvent (& TouchEvent)：通过鼠标事件（与触摸事件）模拟实现拖拽，拖动元素时可以实现复杂的视觉效果，但不能与操作系统打交道；

本文将以 Demo 为主，简要介绍这两种方式实现拖拽的方式。

## Drag and Drop API

### 属性与事件

此 API 将元素分为 源元素（被的拖拽对象）与 目标元素（拖拽放置对象）。

对于源元素，需要将 `draggable` 设置为 `true` 才可拖拽。

源元素与目标元素有一系列顾名思义的事件：

- 源元素：`dragstart`, `drag`, `dragend`；
- 目标：`dragenter`, `dragover`, `dragleave`, `drop`

通过这些事件与事件上 DataTransfer 对象，可以实现拖拽功能。

需要注意，`dragover` 事件中需要执行 `ev.preventDefault()`，这是由于：

> https://stackoverflow.com/questions/50230048/react-ondrop-is-not-firing/50230145  
> Alex D Oct 13 '18 at 9:06  
> The default action for dragOver is "Reset the current drag operation to none".  
> So unless you cancel it the drop doesn't work.

### DataTransfer 对象

`DragEvent` 继承了 `MouseEvent` 事件对象，增加了 `datatransfer` 属性。`datatransfer` 是一个 `DataTransfer` 对象，可以用于传递数据，其上有：

- 属性：
  - `types`, `files`；
  - `dropEffect`: `'copy' | 'move' | 'link'`，会影响鼠标样式；
  - `effectAllowed`: `'none' | 'copy' | 'copyLink' | 'copyMove' | 'link' | 'linkMove' | 'move' | 'all' | 'uninitialized'`
- 方法：
  - `setData(format, data)`：设置数据，format 可以是 MIME；
  - `getData()`：获取已设置的数据；
  - `clearData()`；
  - `setDragImage()`；

可以在 Demo 中看到此对象的使用方式。

## MouseEvent (& TouchEvent)

下面部分以鼠标事件为主，触摸事件的实现大同小异，可参考库 [react-draggable](https://github.com/react-grid-layout/react-draggable) 的实现。

鼠标事件主要为：`mousedown`, `mousemove`, `mouseup`，拖拽逻辑可以依赖这三个事件实现。

- `mousedown`：拖拽开始，通过 `ev.target` 知道是哪一个元素被点击了，通过 `ev.clientX`, `ev.clientY` 能够获取鼠标在 DOM 元素中的位置；
- `mousemove`：拖拽中，通过鼠标位置变化，动态修改元素位置（如通过 `top`/`left`, `translate` CSS 属性）；
- `mouseup`：拖拽结束，编写释放元素的逻辑；

需要注意，**`mousemove`, `mouseup` 应该绑定在 `document` 上而非元素本身上**，因为在拖拽过程中很可能因为移动过快导致光标不在元素上，造成逻辑无法持续触发。

另外，`MouseEvent` 上不仅有 `clientX`/`clientY`，还有 `offsetX`/`offsetY`, `pageX`/`pageY`, `screenX`/`screenY` 获取鼠标位置，他们的区别见 [MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent)。

## Demo

### 拖拽以展示文本（Drag/Drop API）

```yaml:codeDemo
key: "drag-to-show-innerText"
```

### 从操作系统拖拽文件到浏览器中（Drag/Drop API）

```yaml:codeDemo
key: "drag-file-from-os"
```

### 随意拖动（MouseEvent）

```yaml:codeDemo
key: "drag-block-anywhere"
```

### Drag List（Drag/Drop API）

本部分参考了 [react-drag-listview](https://github.com/raisezhang/react-drag-listview) 库的实现。

利用 Drag/Drop API 实现的 Drag List，基于 React。但实际上如果希望效果更动态，结合 MouseEvent 与 TouchEvent API 实现会更好，如 [react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd) 。

```yaml:codeDemo
key: "simple-drag-list"
```
