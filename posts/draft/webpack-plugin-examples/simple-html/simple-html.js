const { readFileSync, writeFileSync } = require('fs');
const path = require('path');
const { Compilation } = require('webpack');

const pluginName = 'SimpleHTMLPlugin';

Object.defineProperty(String.prototype, 'asPath', {
  get() {
    const self = this;
    
    return {
      get slash() {
        return self.split(path.sep).join(path.posix.sep);
      }
    }
  }
})

class SimpleHTML {
  constructor() {}

  apply(compiler) {
    const templateStr = readFileSync('./template.html', { encoding: 'utf-8' });

    compiler.hooks.thisCompilation.tap(pluginName, async (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        { name: pluginName, stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        async (assets) => {
          // console.log('in processAssets', assets);
          // 输出路径
          const outputDir = compilation.outputOptions.path;
          const relOutputDir = path.relative(process.cwd(), outputDir);

          const scripts = Object.keys(assets)
            .map(filename => './' + path.join(relOutputDir, filename).asPath.slash)
            .map(src => `<script src=${JSON.stringify(src)}></script>`)
            .map(label => '  ' + label)
            .join('\n');
          const nextTemplate = templateStr.replace('<!--INJECT_SCRIPTS-->', scripts);
          
          // 提供 source() 与 size()
          // 实际上并不规范
          // 应当使用 wepback-sources 库
          assets['template.html'] = {
            source: () => nextTemplate,
            size: () => nextTemplate.length,
          }
        })
    });
  }
}

module.exports = {
  SimpleHTML,
}