// const Parser = require('./Parser') //基类
const htmlparser = require('htmlparser2')   //html的AST类库
class TemplateParser {
  constructor() {
  }
  /**
   * HTML文本转AST方法
   * @param scriptText
   * @returns {Promise}
   */
  parse(scriptText) {
    return new Promise((resolve, reject) => {
      //先初始化一个domHandler
      const handler = new htmlparser.DomHandler((error, dom) => {
        if (error) {
          reject(error);
        } else {
          //在回调里拿到AST对象  
          resolve(dom);
        }
      });
      //再初始化一个解析器
      const parser = new htmlparser.Parser(handler, {
        xmlMode: true,
        //将所有标签小写，并不需要，设置为false, 如果xmlMode禁用，则默认为true。所以xmlMode为true。
        lowerCaseTags: false,
        //自动识别关闭标签，并关闭，如<image /> ==> <image></image>,不加的话，会解析异常，导致关闭标签会出现在最后面
        recognizeSelfClosing: true,
      });
      //再通过write方法进行解析
      parser.write(scriptText);
      parser.end();
    });
  }
  /**
   * AST转文本方法
   * @param ast
   * @returns {string}
   */
  astToString(ast) {
    let str = '';
    ast.forEach(item => {
      if (item.type === 'text') {
        str += item.data;
      } else if (item.type === 'tag') {
        str += '<' + item.name;
        if (item.attribs) {
          Object.keys(item.attribs).forEach(attr => {
            let value = item.attribs[attr];
            if (value == "") {
              str += ` ${attr}`;
            } else {
              str += ` ${attr}="${item.attribs[attr]}"`;
            }
          });
        }
        str += '>';
        if (item.children && item.children.length) {
          str += this.astToString(item.children);
        }
        str += `</${item.name}>`;
      } else if (item.type == "comment") {
        str += `<!--${item.data}-->`;
      }
    });
    return str;
  }

  /**
   * 优化ast，将键名与值相等时，将值设为空 主要处理wx-_-wx|a-_-a|dot-_-dot
   * 因为这里的ast是从xmldom解析而来，所以跟htmlparser2解析的html，在结构上有所不同。
   * @param childNodes
   * @returns {string}
   */
  astOptimizer(childNodes) {
    for (const key in childNodes) {
      let item = childNodes[key];
      if (item.attributes) {
        for (let i = 0; i < item.attributes.length; i++) {
          const attributes = item.attributes[i];
          let name = attributes["name"];
          let value = attributes["value"];
          if (name == value && (/wx-_-wx|a-_-a|dot-_-dot/).test(name)) {
            attributes["value"] = "";
          }
        }
      }
      if (item.childNodes && item.childNodes.length) {
        this.astOptimizer(item.childNodes);
      }
    }
  }
}

module.exports = TemplateParser
