// Reference ConstPlugin.js

const ConstDependency = require('webpack/lib/dependencies/ConstDependency');

const pluginName = 'RemoveIfPlugin';

class RemoveIf {
  constructor(opts) {
    this.condition = opts.condition;
  }

  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap(pluginName, (factory) => {
      factory.hooks.parser
        .for('javascript/auto')
        .tap(pluginName, (parser) => {
          parser.hooks.statementIf.tap(pluginName, statement => {
            console.log(statement);
            if (statement.test.name === this.condition) {
              const dep = new ConstDependency('', statement.range);
              dep.loc = statement.loc;
              // 告知 wepback 使用这个 dep 构建新的文件
              parser.state.module.addPresentationalDependency(dep);
            }
            return false;
          })
        })
    })
  }
}

module.exports = {
  RemoveIf,
}