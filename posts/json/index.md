## keys 顺序

> https://www.json.org/json-en.html

JSON 是无序（unordered）的。

> https://stackoverflow.com/a/23202095

对于 ES2015 及以后，按以下顺序：

1. 按 integer key 升序
2. 按 string key 插入顺序
3. 按 symbol name 插入顺序

对于 ES2015 以前，无定义顺序规则。

## API

众所周知，有 `JSON.stringify` 与 `JSON.parse`。

### 不常用的一些技巧

> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify

- `JSON.stringify` 若存在 `toJSON`，则会调用 `object.toJSON(key)` 作为待 stringify 的结果；
- `JSON.stringify(value[, replacer, space])` 中的 replacer 可以是 数组 或 `(key, value: T) => T | undefined`
  - 为数组，相当于 pick 操作；
  - 为函数，则取返回值为结果；

### polyfill `JSON.stringify`

笔者实现的一个 `JSON.stringify` polyfill 如下。

```js
// lib-type.js
const TYPE = {
  NUMBER: 0b0000000001,
  STRING: 0b0000000010,
  BOOLEAN: 0b0000000100,
  OBJECT: 0b0000001000,
  ARRAY: 0b0000010000,
  OBJECT_OR_ARRAY: 0b0000011000,
  SYMBOL: 0b0000100000,
  BIGINT: 0b0001000000,
  UNDEFINED: 0b0010000000,
  NULL: 0b0100000000,
  FUNCTION: 0b1000000000,
};

const MAP = {
  "[object Number]": TYPE.NUMBER,
  "[object String]": TYPE.STRING,
  "[object Boolean]": TYPE.BOOLEAN,
  "[object Array]": TYPE.ARRAY,
  "[object Symbol]": TYPE.SYMBOL,
  "[object BigInt]": TYPE.BIGINT,
  "[object Undefined]": TYPE.UNDEFINED,
  "[object Null]": TYPE.NULL,
  "[object Function]": TYPE.FUNCTION,
};

const getType = (x) => {
  const objectType = Object.prototype.toString.call(x);
  return MAP[objectType] || TYPE.OBJECT;
};

module.exports = {
  TYPE,
  getType,
};
```

```js
// lib-base.js

const { TYPE, getType } = require("./lib-type");

const NULL_STR = "null";
const COMMA_STR = ",";

const ESCAPE_RE = /"/g;
const quote = (str) => {
  return '"' + str.replace(ESCAPE_RE, '\\"') + '"';
};

const _defaultReplacerFactory = (replacer) => {
  const set = new Set(replacer);
  return (key, value) => {
    return set.has(key) || key === "" ? value : undefined;
  };
};

function stringify(value, replacer, space = 0, adapter) {
  const push = adapter.onPush;
  const setUndefined = adapter.onUndefinedResult;

  // handle space when is number, up to 10
  if (typeof space === "number") {
    space = Math.min(space, 10);
  }

  const getIndentString = (indent) => {
    const indentString =
      typeof space === "number"
        ? new Array(indent * space).fill(" ").join("")
        : new Array(indent).fill(space).join("");
    return indentString;
  };

  if (replacer) {
    replacer = Array.isArray(replacer)
      ? _defaultReplacerFactory(replacer)
      : replacer;
  }

  function _stringify(value, indent, type, contextType = 0, contextKey = "") {
    if (replacer) {
      value = replacer(contextKey, value);
    }
    let indentString = getIndentString(indent);

    type = type || getType(value);
    // handle Object String/Number/Boolean
    if (type & (TYPE.STRING | TYPE.NUMBER | TYPE.BOOLEAN)) {
      value = value.valueOf();
    }

    // "toJSON" method
    if (type === TYPE.OBJECT && typeof value.toJSON === "function") {
      value = value.toJSON(contextKey);
      type = getType(value);
    }

    if (type & (TYPE.ARRAY | TYPE.OBJECT)) {
      if (contextType === 0 && type & TYPE.OBJECT_OR_ARRAY) {
        push(type === TYPE.OBJECT ? "{" : "[");
        indent++;
        indentString = getIndentString(indent);
      }

      let prefix = "";
      for (const key in value) {
        // ignore symbol key, don't consider replacer function
        if (typeof key === "symbol") {
          continue;
        }
        // ignore non-num index in array
        if (type === TYPE.ARRAY && Number.isNaN(Number(key))) {
          continue;
        }

        let item = value[key];
        const itemType = getType(item);

        // in object, ignore function / symbol / undefined
        if (
          type === TYPE.OBJECT &&
          itemType & (TYPE.FUNCTION | TYPE.SYMBOL | TYPE.UNDEFINED)
        ) {
          continue;
        }

        push(prefix);
        if (space) {
          push("\n" + indentString);
        }
        if (type === TYPE.OBJECT) {
          push(quote(key) + ": ");
        }
        if (itemType & TYPE.OBJECT_OR_ARRAY) {
          push(itemType === TYPE.OBJECT ? "{" : "[");
        }
        _stringify(item, indent + 1, itemType, type, key);
        if (itemType & TYPE.OBJECT_OR_ARRAY) {
          if (space) {
            push("\n" + indentString);
          }
          push(itemType === TYPE.OBJECT ? "}" : "]");
        }
        prefix = COMMA_STR;
      }

      if (contextType === 0 && type & TYPE.OBJECT_OR_ARRAY) {
        if (space) {
          push("\n");
        }
        push(type === TYPE.OBJECT ? "}" : "]");
      }
    } else {
      // handle NaN / Infinity / -Infinity
      if (
        (type === TYPE.NUMBER && value !== value) ||
        value === Infinity ||
        value === -Infinity
      ) {
        push(NULL_STR);
      } else if (type === TYPE.STRING) {
        push(quote(value));
      } else if (type & (TYPE.FUNCTION | TYPE.SYMBOL | TYPE.UNDEFINED)) {
        // pure, transform result to undefined
        if (contextType === 0) {
          setUndefined();
        } else {
          push(NULL_STR);
        }
      } else if (type === TYPE.NULL) {
        push(NULL_STR);
      } else if (type === TYPE.BIGINT) {
        // cannot support BigInt
        throw TypeError("BigInt value can't be serialized in JSON");
      } else {
        push(value.toString());
      }
    }
  }
  _stringify(value, 0);
}

module.exports = {
  stringify,
};
```

```js
const { stringify: baseStringify } = require("./lib-base");

const stringify = (value, replacer, space) => {
  let result = "";

  const adapter = {};
  adapter.onPush = async function (str) {
    result += str;
  };
  adapter.onUndefinedResult = function () {
    result = undefined;
  };
  baseStringify(value, replacer, space, adapter);
  return result;
};

function main() {
  const result = stringify({ a: 1, b: { c: 3 } }, null, 4);
  console.log(result);
}

main();
```

## JSON 与 stream

`JSON.stringify` 与 `JSON.parse` 实际上都可以流式处理，适合处理较大的 JSON 文件。

对于 stream 式的 `JSON.stringify`，可以由以上的 polyfill 进行修改：

- 将 stringify 转为 generator 函数，对 push 操作进行 yield；
- 增加 `pull(n)` API，能够控制 generator 流程；
- 实现 Readable stream；

```js
function stringify(value, replacer, space = 0, adapter) {
  // push 改造
  const push = function (str) {
    return str;
  };
  const setUndefined = adapter.onUndefinedResult;

  // ...

  // 改造为 generator 以控制流程
  function* _stringify(value, indent, type, contextType = 0, contextKey = "") {
    // ...

    if (type & (TYPE.ARRAY | TYPE.OBJECT)) {
      if (contextType === 0 && type & TYPE.OBJECT_OR_ARRAY) {
        // 涉及 push 的地方 yield
        yield push(type === TYPE.OBJECT ? "{" : "[");
        // ...
      }
    } else {
      // ...
    }
  }
  const iter = _stringify(value, 0);

  const exports = {
    pull() {
      const { value, done } = iter.next();
      if (done) {
        return null;
      }
      return value;
    },
  };
  return exports;
}

class JSONStringify extends Readable {
  constructor(value, opts = {}) {
    super(opts);

    this.adapter = {};
    this.adapter.onUndefinedResult = function () {
      throw Error("encode fail");
    };

    this.stringifyObject = stringify(value, null, 4, this.adapter);
  }

  _read(n) {
    // 此处没有使用 n，是因为实现中没有用 n 控制输出
    // 而 stream 内部会做缓存，不需要手动做（即 push 不需要正好 push n 个字节）
    const str = this.stringifyObject.pull(n);
    this.push(str);
  }
}

async function main() {
  const jsonStream = new JSONStringify(
    {
      a: [12, 321, 42141, 512],
      b: {
        c: [{ dsaf: "2353252" }, { ddd: 23432 }],
        d: false,
        e: null,
      },
    },
    {
      // 控制 highWaterMark
      highWaterMark: 1,
    }
  );
  const rs = createWriteStream("./result.json");
  jsonStream.pipe(rs);
}

main();
```

对于 stream 式的 `JSON.parse`，基于 [jsonparse](https://github.com/creationix/jsonparse) 实现。（实际上就是太懒不想造轮子= =）

- 实现 Duplex stream，将 JSON 字符串导入到 jsonparse 中，从 `onValue` 中获取 parse 后的对象；

```js
const Parser = require("jsonparse");
const { Transform, Readable, Writable, Duplex } = require("stream");

const jsonText = `{"a": [12,321,42141,512
],"b": {"c": [{"dsaf": "2353252"
},{"ddd": 23432
}
],"d": false,"e": null
}
}`;

class FromRawData extends Readable {
  constructor(data) {
    super();
    this.data = Buffer.from(data);
  }

  _read(n) {
    if (this.data.length === 0) {
      this.push(null);
      return;
    }
    const next = this.data.slice(0, n);
    this.data = this.data.slice(n);
    this.push(next);
  }
}

class JSONParse extends Duplex {
  constructor() {
    super({
      readableObjectMode: true,
    });

    this.queue = [];

    const parser = (this.parser = new Parser());
    parser.onValue = (value) => {
      if (parser.stack.length === 0) {
        this.queue.push(value);
        this.queue.push(null);
      }
    };
  }

  _read(n) {
    if (this.queue.length > 0) {
      this.queue.slice(0, n).forEach((item) => this.push(item));
      this.queue.splice(0, n);
    }
  }

  _write(data, enc, next) {
    this.parser.write(data);
    next();
  }
}

class Log extends Writable {
  constructor() {
    super({
      objectMode: true,
    });
  }

  _write(data, enc, cb) {
    console.log("[Log]", data);
    cb();
  }
}

new FromRawData(jsonText).pipe(new JSONParse()).pipe(new Log());
```

## 更快的 JSON stringnify

[fast-json-stringify](https://github.com/fastify/fast-json-stringify) 是一个快速的 `JSON.stringify` 实现，其主要基于 schema，即通过编写 schema，可以预先组成 stringnify 的代码，而不需要运行时 遍历 与 判断类型 等。

（当然，如果已经使用了这个库，可以试试 protocol buffers）
