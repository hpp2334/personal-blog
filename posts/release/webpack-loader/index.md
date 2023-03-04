## 前言

十分抱歉这么久没有更新，因为花了比较久的时间一直在写训练系统（当然还有摸鱼划水）。最近训练系统日趋完善，因而那部分放慢进度，专心充电！

众所周知，webpack 只能处理 JavaScript 代码，通过 loader 可以将那些非 JavaScript 文件转换为 JavaScript 文件从而使得 webpack 能够处理。具体而言，loader 是一个导出了函数的模块，用于在源码经过 webpack 处理做一些预处理，如将非 JavaScript 文件转换为 JavaScript 文件、屏蔽代码中的注释等。

本文试图分析 loader 运行机制，涉及以下部分：

- 异步 loader 的一种基础形式, loader pitching, loader context
- 简要 css-loader, style-loader, file-loader 的工作原理
- 简单分析 loader runner 的运行流程

## loader 的内联引入方式

作为使用者，一般通过配置方式引入 loader，实际上其还可以通过 内联方式 与 CLI 方式 引入。内联引入方式形式如 `[...loaders, file].join('!')`，例如：

```js
import Styles from "style-loader!css-loader?modules!./styles.css";
```

另外，这种引入方式可以带有前缀：

- 使用 `!` 前缀，将禁用所有已配置的 normal loader(普通 loader)
- 使用 `!!` 前缀，将禁用所有已配置的 loader（preLoader, loader, postLoader）
- 使用 `-!` 前缀，将禁用所有已配置的 preLoader 和 loader，但是不禁用 postLoaders

（preLoader, normal loader, postLoader 是什么？）

更详细的信息请查阅 [loader 配置](https://webpack.docschina.org/concepts/loaders/#configuration)。

## 异步 loader 的一种基础形式

```js
function loader(content, sourceMap, meta) {
  //
  // this.async() 告知 loader-runner 异步执行
  const callback = this.async();

  // 根据 content 进行一些处理

  // 返回数据，此方法详细参数见 "Loader Context"
  callback(null);
  // 如果调用了 callback，应当始终返回 undefined
  return;
}
// （可选）如果定义了 raw = true，接收到的 content 将会是 Buffer 类型
loader.raw = false;
// （可选）如果 pitch，后续的 loader 不会被执行，关于 "pitch" 的更多
loader.pitch = function (remainingRequest, precedingRequest, data) {
  /* ... */
};

// 导出这个函数
module.exports = loader;
```

此处提一些注意点：

- 可以不执行 async 使 loader 同步执行，在不调用 callback 的情况下可以直接 return 返回 `string | Buffer`，返回值会被作为 loader 转换后的代码。

loader 的其他例子（同步、异步）见官方文档 [loader examples](https://webpack.docschina.org/api/loaders/#examples)。

## Loader Pitching

一般而言，loader 是从右向左执行的，但是实际上需要考虑 `pitch`，webpack 允许 loader 在导出的函数上定义 `pitch`，下面开始将导出的 loader 函数称为 normal，`loader.pitch` 称为 pitch。

假定有 loaders, 其中 `loaders[i]` 定义了 `pitch` 且有返回内容，则 loader 的执行流程为：

1. 按 `loaders[0], loaders[1], ... loaders[i - 1]` 的顺序执行 pitch（如果有）;
2. 执行到 `loaders[i]`，执行 pitch 得到结果 `content`
3. 以 `content` 作为最开始的参数，以 pipe 方式执行 `loaders[i - 1], loaders[i - 2], ...loaders[0]`

可以看见，pitch 起到了拦截后续 loader 的作用，其形式为：

```js
/**
 * @param remainingRequest 即剩余的 request，不包括本 loader。详细形式见 "loader-runner"，下同。
 * @param precedingRequest
 * @param data loaderContext.data，在 pitch 与 normal 阶段共享信息的 object
 */
module.exports = function (remainingRequest, precedingRequest, data) {
  // ...
};
```

## Loader Context

loader context 是 normal, pitch 中 `this` 对象的绑定者，其上有一系列与本次 loader 调用相关的信息。

假设有语句 `require('./loader1?xyz!loader2!./resource?rrr');`，其中一部分信息如下：

- request：resovled 的请求字符串，即 `/abc/loader1.js?xyz!/abc/node_modules/loader2/index.js!/abc/resource.js?rrr`；
- resource: request 中请求文件部分，即 `/abc/resource.js?rrr`。resource = resourcePath (`/abc/resource.js`) + resourceQuery (`?rrr`)
- async: 标记这个 loader 是异步执行的，返回 `this.callback`；
- callback: 支持同步或异步调用返回 loader 的执行结果，可以被多次调用；

```ts
this.callback(
	err: Error | null,
	content: string | Buffer,
	sourceMap?: SourceMap,
	meta?: any
);
```

- getOptions: 获取 loader 的 options
- `emitFile(name: string, content: Buffer|string, sourceMap: {...})`: 向 webpack 发射一个文件，其中 content 是文件路径。此部分会放到 `buildInfo.assets` 中（详见 xxx）

## utils

webpack 提供 [loader-utils](https://github.com/webpack/loader-utils) 与 [schema-utils](https://github.com/webpack/schema-utils) 用于在 loader 内部中使用。

**loader-utils** 是 webpack 提供的编写 loader 中时的 utils 包，里面一些常用的方法如下：

- getOptions: 获取 loader options （通过 this.query）（在 webpack 5 中，可以使用 this.getOptions 代替此方法）
- parseQuery: query string to object
- stringifyRequest: 将字符串转为可插入在 import/require 中的字符串，不同于 `JSON.stringify`，这个方法会考虑 hash
- interpolateName: 通过提供的规则转换字符串

**schema-utils** 是 webpack 提供的检验 loader/plugin option 的 utils 包，提供 `validate` API 用于校验 option。

## css-loader, style-loader, file-loader

下面简单分析 css-loader, style-loader, file-loader 的工作机制。

约定：

1. 不分析 HMR 逻辑，source map；
2. 只分析到能够大致工作的部分，不会涉及浏览间差异时各 loader 的处理、loader 中的错误处理、防多次调用处理等；
3. 暂不考虑 css module；

### file-loader

file-loader 用于将文件转为外置文件，并获得 url 链接。其原理简单概括为：

1. 通过 `interpolateName` 将链接转为 webpack 中的链接 url，默认是 `[contenthash].[ext]`；
2. 调用 `emitFile` （这个是啥）；
3. 导出 `__webpack_public_path__ + ${JSON.stringify(outputPath)}`，其中 `outputPath` 是经过 `url` 导出的结果。

以对某个 css 文件使用 file-loader，webpack 生成代码如下：

```js
// __webpack_require__.d 为 webpack 中的 define 逻辑，相当于导出且某个值都是只读的
__webpack_require__.d(__webpack_exports__, {
  default: () => __WEBPACK_DEFAULT_EXPORT__,
});
// __webpack_require__.p 为 webpack 中获取 publicPath 的结果，整个导出字符串即请求获取该 css 文件的链接地址
const __WEBPACK_DEFAULT_EXPORT__ =
  __webpack_require__.p + "35a770e9cd0c3ec97008038384244da8.css";
```

### css-loader

在开启 esModule 时，将原 css 文件转换为如下形式：

```js
// 这个runtime 待补充
import ___CSS_LOADER_API_IMPORT___ from "./node_modules/css-loader/dist/runtime/api.js";
// 下面 "i[1]" 是由于 i[1] 为 css 的内容
var ___CSS_LOADER_EXPORT___ = ___CSS_LOADER_API_IMPORT___(function (i) {
  return i[1];
});
___CSS_LOADER_EXPORT___.push([module.id /* 此处为 css 内容 */, , ""]);
export default ___CSS_LOADER_EXPORT___;
```

`___CSS_LOADER_EXPORT___` 是包含 css 代码的数组，形式为：

```ts
type CSSList = Array<
  [
    any, // 模块 id
    any, // css 代码
    any, // 媒体查询
    any // source map
  ]
>;
```

### style-loader

style-loader 用于将 css 文件插入到页面中的 `<style>` 或 `<link>` 中，常与 css-loader 配合使用（具体地，若插入到 `<style>` 则常与 css-loader 配合使用，若插入到 `<link>` 则常与 file-loader 配合使用）。其原理为：
① 定义 `pitch` 将其后的 loader 拦截
② 插入 runtime 模块引用，包括两部分： - 方法 `api`: 将 css 内容插入页面中的 `<style>` 或 `<link>` 中 - 模块 `content`: 调用 css-loader 得到包含 css 代码的数组
③ 以 `content` 和配置调用 `api`

#### pitch

style-loader 直接定义了 pitch，在 pitch 中根据 `injectType` 返回代码段。
假定 `injectType` 为 `styleTag`，开启 `esModule` 时，返回的代码段如下：

```js
`
// 引入 Runtime 代码，包括 api 模块 与 content 模块 (包含 CSS 代码)
import api from ${loaderUtils.stringifyRequest(
  this,
  `!${path.join(__dirname, "runtime/injectStylesIntoStyleTag.js")}`
)};
import content${
  namedExport ? ", * as locals" : ""
} from ${loaderUtils.stringifyRequest(this, `!!${request}`)};

var options = ${JSON.stringify(runtimeOptions)};

// 插入位置，默认是 'head'
options.insert = ${insert};
options.singleton = ${isSingleton};

// update 供 HMR 使用
var update = api(content, options);

// ...HMR 代码逻辑

export default content.locals || {};
`;
```

#### Runtime

content 模块实际上就是 `CSSList`，其供 api 模块使用。

在插入到 `<style>` 的条件下，api 模块为 "./src/runtime/injectStylesIntoStyleTag.js"，该模块会通过 `document.createElement('style')` 创建 style 元素，后清空子元素，再将 css 代码作为 textNode 插入。

在插入到 `<link>` 的条件下，api 模块为 "./src/runtime/injectStylesIntoLinkTag.js"，该模块会通过 `document.createElement('link')` 创建 link 元素，后插入到指定位置中。

到这里 style-loader 基础原理已明了，但还存在一个问题：webpack 如何感知对 api 模块引用的存在？（待填坑）

## loader-runner

[loader-runner](https://github.com/webpack/loader-runner) 允许在不安装 webpack 的情况下调用 loader(s)，笔者在其基础上简化代码（如删去错误处理等）并增加注释，便于读者分析其运行流程。

需要注意，loader-runner 没有完整还原 loader context，如 `emitFile` 方法不存在。

### createLoaderObject

此方法对 loader 做封装，在整个流程中使用，下称通过这一方法得到的为 loaderObject。

```js
/**
 * @param loader 一般是 loader 的绝对路径，可能包含 query string
 */
function createLoaderObject(loader) {
  var obj = {
    path: null,
    query: null,
    fragment: null,
    options: null,
    ident: null,
    normal: null, // normal 方法
    pitch: null, // pitch 方法
    raw: null,
    data: null,
    pitchExecuted: false, // pitch 方法是否已执行
    normalExecuted: false, // normal 方法是否已执行
  };
  Object.defineProperty(obj, "request", {
    enumerable: true,
    get: function () {
      return (
        obj.path.replace(/#/g, "\0#") +
        obj.query.replace(/#/g, "\0#") +
        obj.fragment
      );
    },
    set: function (value) {
      // ...设置 path, query, fragment 等属性
    },
  });
  obj.request = loader;
  return obj;
}
```

### loadLoader

```js
/**
 * 加载 loader
 * @param loader loaderObject
 */
function loadLoader(loader, callback) {
  // 根据 loader.type 同步或异步加载，此处只考虑同步情况
  var module = require(loader.path);

  loader.normal = typeof module === "function" ? module : module.default;
  loader.pitch = module.pitch;
  loader.raw = module.raw;

  callback();
}
```

### runSyncOrAsync

此方法执行 normal 或 pitch 方法。

```js
function runSyncOrAsync(fn, context, args, callback) {
  // 同步标记
  var isSync = true;
  // ... 完成标记，isDone
  // ... 错误标记，如 isError 等

  context.async = function async() {
    // ... 已完成检测
    isSync = false;
    return innerCallback;
  };

  var innerCallback = (context.callback = function () {
    // ... 已完成检测与标记
    isSync = false;
    callback.apply(null, arguments);
  });

  // 执行 normal/pitch 方法
  // 注意，如果方法中调用了 async，则 isSync = false
  var result = (function LOADER_EXECUTION() {
    return fn.apply(context, args);
  })();
  if (isSync) {
    // ... 已完成检测与标记
    // ... 根据 result （是否为 undefined 或 thenable） 进行 callback，此处保留默认情况
    return callback(null, result);
  }
}
```

### 主流程

```js
function iteratePitchingLoaders(options, loaderContext, callback) {
  // 到末尾了，处理 resource
  if (loaderContext.loaderIndex >= loaderContext.loaders.length)
    return processResource(options, loaderContext, callback);

  var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];

  // pitch 被执行过了，则执行下一个 loader （从左到右顺序）
  if (currentLoaderObject.pitchExecuted) {
    loaderContext.loaderIndex++;
    return iteratePitchingLoaders(options, loaderContext, callback);
  }

  // load loader module
  loadLoader(currentLoaderObject, function (err) {
    // ... 错误处理
    var fn = currentLoaderObject.pitch;
    currentLoaderObject.pitchExecuted = true;
    if (!fn) return iteratePitchingLoaders(options, loaderContext, callback);

    runSyncOrAsync(
      fn,
      loaderContext,
      [
        loaderContext.remainingRequest,
        loaderContext.previousRequest,
        (currentLoaderObject.data = {}),
      ],
      function (err) {
        // ... 错误处理
        var args = Array.prototype.slice.call(arguments, 1);
        var hasArg = args.some(function (value) {
          return value !== undefined;
        });

        // pitch 函数有返回时则截断，开始执行 normal，normal 得到的 content 是 args
        if (hasArg) {
          loaderContext.loaderIndex--;
          iterateNormalLoaders(options, loaderContext, args, callback);
        } else {
          iteratePitchingLoaders(options, loaderContext, callback);
        }
      }
    );
  });
}

function iterateNormalLoaders(options, loaderContext, args, callback) {
  // normal 全部处理结束
  if (loaderContext.loaderIndex < 0) return callback(null, args);

  var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];

  if (currentLoaderObject.normalExecuted) {
    loaderContext.loaderIndex--;
    return iterateNormalLoaders(options, loaderContext, args, callback);
  }

  var fn = currentLoaderObject.normal;
  currentLoaderObject.normalExecuted = true;
  if (!fn) {
    return iterateNormalLoaders(options, loaderContext, args, callback);
  }

  // ...

  runSyncOrAsync(fn, loaderContext, args, function (err) {
    // ... 错误处理

    var args = Array.prototype.slice.call(arguments, 1);
    iterateNormalLoaders(options, loaderContext, args, callback);
  });
}

function processResource(options, loaderContext, callback) {
  // 定位到最后一个 loader
  loaderContext.loaderIndex = loaderContext.loaders.length - 1;

  var resourcePath = loaderContext.resourcePath;
  if (resourcePath) {
    // 读取文件内容后开始从最后一个 loader 执行（从右到左 normal）
    options.processResource(
      loaderContext,
      resourcePath,
      function (err, buffer) {
        if (err) return callback(err);
        options.resourceBuffer = buffer;
        iterateNormalLoaders(options, loaderContext, [buffer], callback);
      }
    );
  } else {
    iterateNormalLoaders(options, loaderContext, [null], callback);
  }
}

function runLoaders(options, callback) {
  // ...
  // Loader Context
  var loaderContext = options.context || {};
  // 读取 resource
  var processResource =
    options.processResource ||
    ((readResource, context, resource, callback) => {
      context.addDependency(resource);
      readResource(resource, callback);
    }).bind(null, options.readResource || fs.readFile.bind(fs));

  /*
	...挂载 loaderContext，如
	{
		loaderIndex: 0, // 当前 loader 下标
		loaders: (options.loaders || []).map(createLoaderObject), // 将 loader 转换为 loaderObject
		resource,
		...
	}
	下面保留 remainingRequest 的挂载方式
	*/
  Object.defineProperty(loaderContext, "remainingRequest", {
    enumerable: true,
    get: function () {
      if (
        loaderContext.loaderIndex >= loaderContext.loaders.length - 1 &&
        !loaderContext.resource
      )
        return "";
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex + 1)
        .map(function (o) {
          return o.request;
        })
        .concat(loaderContext.resource || "")
        .join("!");
    },
  });

  var processOptions = {
    resourceBuffer: null,
    processResource: processResource,
  };
  iteratePitchingLoaders(processOptions, loaderContext, function (err, result) {
    // 处理结果
  });
}
```

## 一些其他的与本文关系不大的知识点

### **webpack_nonce**

[https://webpack.docschina.org/guides/csp/](https://webpack.docschina.org/guides/csp/)  
[https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/nonce](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/nonce)

与 CSP 相关，是一个 base64 字符串。

## 反思与疑惑

### 思考

#### `Error` 是可以继承的

可以通过继承 `Error` 对象自定义 `Error`，如 loader-runner 中有：

```js
class LoadingLoaderError extends Error {
  constructor(message) {
    super(message);
    this.name = "LoaderRunnerError";
    Error.captureStackTrace(this, this.constructor);
  }
}
```

#### loader context 的挂载方式

loader context 通过 `loaderContext.apply(fn, args)` 供 normal 和 pitch 使用。`this` 充当 context 的身份确实非常自然。

### 疑惑

1. pitch 返回的内容如果有新的 `require` webpack 会怎么处理？（待填坑）
2. loader-runner 中为何要 `eval("import(" + JSON.stringify(loaderUrl.toString()) + ")")` 而不是直接 import？
