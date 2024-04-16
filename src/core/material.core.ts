export interface MaterialItem {
  title: string;
  description: string;
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
        link: "https://web.dev/learn/",
      },
      {
        title: "Deep Dive Into Modern Web Development",
        description: "偏向于 Web 的全栈教程",
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
        link: "https://rustmagazine.github.io/rust_magazine_2021/index.html",
      },
    ],
  },
];

export const selfMaterials: MaterialConfig = [
  {
    section: "App & WEB",
    items: [
      {
        title: "Handy Online Tools",
        description:
          "提供一系列在开发过程中使用的编写工具，包括文件预览、MD5 校验等",
        link: "https://hol.hpp2334.com/",
      },
      {
        title: "Ease Music Player",
        description: "支持 WebDAV 的 Android 流式音乐播放器，使用 Rust 与 Flutter 编写",
        link: "https://github.com/hpp2334/ease-music-player"
      },
      {
        title: "KuteClip",
        description: "支持 Windows 与 Mac 的剪切板历史应用，使用 tauri 编写",
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
        link: "https://github.com/hpp2334/misty-vm",
      },
      {
        title: "Slight Stream Archiver",
        description: "流式创建 zip 文件，需要环境支持 WASM",
        link: "https://github.com/hpp2334/slight-stream-archiver"
      },
      {
        title: "pbw-moon",
        description: "protobuf.js writer，具有更小的内存堆占用",
        link: "https://github.com/hpp2334/pbw-moon",
      }
    ],
  },
];
