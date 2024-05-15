export interface MaterialItem {
  title: string;
  description: string;
  description_en: string;
  link: string;
}

export type MaterialConfig = Array<{
  section: string;
  items: Array<MaterialItem>;
}>;

export const recommendMaterials: MaterialConfig = [
  {
    section: "Web",
    items: [
      {
        title: "web.dev",
        description:
          "Google 家的学习 Web 站点，包括了 Web 性能指标与优化、Web 动画等文章。",
        description_en: "Google's learning website for the Web includes articles on web performance metrics and optimization, web animations, and more.",
        link: "https://web.dev/learn/",
      },
      {
        title: "Deep Dive Into Modern Web Development",
        description: "偏向于 Web 的全栈教程",
        description_en: "A full-stack tutorial focused on the Web.",
        link: "https://fullstackopen.com/en/",
      },
    ],
  },
  {
    section: "Backend",
    items: [
      {
        title: "凤凰架构 - 构建可靠的大型分布式系统 ",
        description:
          "这是一部以“如何构建一套可靠的分布式大型软件系统”为叙事主线的开源文档，是一幅帮助开发人员整理现代软件架构各条分支中繁多知识点的技能地图。",
        description_en: "[CN] A book about how to build a reliable distributed large-scale software system.",
        link: "http://icyfenix.cn/",
      },
    ],
  },
  {
    section: "Rust",
    items: [
      {
        title: "Rust语言开源杂志（2021）",
        description: "包含了 2021 年各月收集的 Rust 项目、实践、学习材料等资料",
        description_en: "[CN] It includes materials such as Rust projects, practices, learning materials, etc. in 2021",
        link: "https://rustmagazine.github.io/rust_magazine_2021/index.html",
      },
    ],
  },
];


export const toolMaterials: MaterialConfig = [
  {
    section: "Web Tools",
    items: [
      {
        title: "Image Online Tools",
        description:
          "一个图片在线处理工具，包括图片格式转换，旋转，缩放等常见功能",
        description_en: "An online image processing tool, including image format conversion, rotation, scaling and other common features.",
        link: "https://image.clxhandy.com/",
      },
    ],
  },
]

export const selfMaterials: MaterialConfig = [
  {
    section: "App & WEB",
    items: [
      {
        title: "Handy Online Tools",
        description:
          "提供一系列在开发过程中使用的编写工具，包括文件预览、MD5 校验等",
        description_en: "Some handy online tools for developer in development.",
        link: "https://hol.hpp2334.com/",
      },
      {
        title: "Ease Music Player",
        description: "支持 WebDAV 的 Android 流式音乐播放器，使用 Rust 与 Flutter 编写",
        description_en: "A lightweight music player, written in rust and flutter. Webdav is supported.",
        link: "https://github.com/hpp2334/ease-music-player"
      },
      {
        title: "KuteClip",
        description: "支持 Windows 与 Mac 的剪切板历史应用，使用 tauri 编写",
        description_en: "A clipboard history written with tauri, supporting Windows and Mac.",
        link: "https://github.com/hpp2334/kute-clip"
      },
    ],
  },
  {
    section: "Lib",
    items: [
      {
        title: "Misty VM",
        description:
          "用于构造 ViewModel 的 Rust 库，一般用于跨端开发，如 flutter, tauri 等",
        description_en: "A rust library for building view models. It may be used with UI library/framework generally, such as flutter and tauri.",
        link: "https://github.com/hpp2334/misty-vm",
      },
      {
        title: "Slight Stream Archiver",
        description: "流式创建 zip 文件，需要环境支持 WASM",
        description_en: "A javascript library that can stream zip files requires a WASM environment. It wraps zip-rs to implement streaming archives.",
        link: "https://github.com/hpp2334/slight-stream-archiver"
      },
      {
        title: "pbw-moon",
        description: "protobuf.js writer，具有更小的内存堆占用",
        description_en: "Another implementation of protobuf writer for protobuf.js, with smaller javascript heap memory usage.",
        link: "https://github.com/hpp2334/pbw-moon",
      }
    ],
  },
];
