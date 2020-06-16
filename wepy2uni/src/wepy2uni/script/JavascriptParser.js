// const Parser = require('./Parser')  //基类
const babylon = require('babylon')  //AST解析器
const parse = require('@babel/parser').parse;
const generate = require('@babel/generator').default
const traverse = require('@babel/traverse').default

class JavascriptParser {
  constructor() {
    // super()
  }
  /**
   * 解析前替换掉无用字符
   * @param code
   * @returns
   */
  beforeParse(code) {
    return code.replace(/this\.\$apply\(\);?/gm, '')
    .replace(/super\(\);?/gm, '')
    .replace(/import\s+wepy\s+from\s+['"]wepy['"];?/gm, '')
    .replace(/import\s+['"](wepy.*?)['"];?/gm, '')
    .replace(/import.*?from\s+['"]wepy-.*?['"];?/gm, '');
  }
  /**
   * 文本内容解析成AST
   * @param scriptText
   * @returns {Promise}
   */
  parse(scriptText) {
    return new Promise((resolve, reject) => {
      try {
        //使用babylon.parse，在遇到解构语法(...)时，会报错，改用babel-parser方案
        // 
        //然后又出现新问题了(解析...)，SyntaxError: This experimental syntax requires enabling the parser plugin: 'classProperties'
        //解决方案：下面帖子最后一楼(不需要修改.babelrc文件)
        // https://stackoverflow.com/questions/52237855/support-for-the-experimental-syntax-classproperties-isnt-currently-enabled
        const ast = parse(scriptText, {
          sourceType: 'module',
          plugins: [
            'jsx',
            'classProperties', // '@babel/plugin-proposal-class-properties',
          ],
        });
        resolve(ast);

      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * AST树遍历方法
   * @param astObject
   * @returns {*}
   */
  traverse(astObject) {
    return traverse(astObject)
  }

  /**
   * 模板或AST对象转文本方法
   * @param astObject
   * @param code
   * @returns {*}
   */
  generate(astObject, code) {
    const newScript = generate(astObject, {}, code)
    return newScript
  }
}
module.exports = JavascriptParser