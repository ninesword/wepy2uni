const fs = require('fs-extra');
const path = require('path');

const utils = require('../utils/utils.js');
const pathUtil = require('../utils/pathUtil.js');

const t = require('@babel/types');
const nodePath = require('path');
const parse = require('@babel/parser').parse;
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;

const template = require('@babel/template').default;

const componentConverter = require('./script/componentConverter');
const JavascriptParser = require('./script/JavascriptParser')
const astHelpers = require('./script/astHelpers')


/**
 * 将ast属性数组组合为ast对象
 * @param {*} pathAry 
 */
function arrayToObject(pathAry, property) {
    let obj = {};
    switch (property) {
        case "mixins":
            obj = t.arrayExpression(pathAry);
            break;
        default:
            obj = t.objectExpression(pathAry);
            break;
    }

    return obj;
}

/**
 * 子页面/组件的模板
 */
function templatePackage(fillObject){
  let templateArr  = [],
      fill = {};
  if(fillObject.DATA.properties.length){
    templateArr.push(`data() {
      return DATA
    }`) 
    fill.DATA = fillObject.DATA;
  }
  if(fillObject.MIXINS.elements.length){
    templateArr.push(`mixins: MIXINS`);
    fill.MIXINS = fillObject.MIXINS;
  }
  if(fillObject.COMPONENTS.properties.length){
    templateArr.push(`components: COMPONENTS`);
    fill.COMPONENTS = fillObject.COMPONENTS;
  }
  if(fillObject.PROPS.properties.length){
    templateArr.push(`props:PROPS`);
    fill.PROPS = fillObject.PROPS;
  }
  if(fillObject.METHODS.properties.length){
    global.template.current?global.template.current.userEvent.forEach((per)=>{
      fillObject.METHODS.properties&&fillObject.METHODS.properties.forEach((item)=>{
        if(per.value == item.key.name){
           let clone = JSON.parse(JSON.stringify(item));
           clone.key = t.identifier(per.key);
           fillObject.vistors.events.save(clone);
        }
      })
    }):[]; 

    // 处理自定义事件 不需要放在methods 
    if(fillObject.METHODS.properties.length > 0){
      templateArr.push(`methods: METHODS`);
      fill.METHODS = fillObject.METHODS;
    }
  }
  if(fillObject.COMPUTED.properties.length){
    templateArr.push(`computed: COMPUTED`);
    fill.COMPUTED = fillObject.COMPUTED;
  }
  if(fillObject.WATCH.properties.length){
    templateArr.push(`watch:WATCH`);
    fill.WATCH = fillObject.WATCH;
  }

  return template(`export default { 
    ${templateArr.join(',\t')}
  }`)(fill);
}

/**
 * 处理require()里的路径
 * @param {*} path      CallExpression类型的path，未做校验
 * @param {*} fileDir   当前文件所在目录
 */
function requireHandle(path, fileDir) {
    let callee = path.node.callee;
    if (t.isIdentifier(callee, { name: "require" })) {
        //处理require()路径
        let arguments = path.node.arguments;
        if (arguments && arguments.length) {
            if (t.isStringLiteral(arguments[0])) {
                let filePath = arguments[0].value;
                filePath = pathUtil.relativePath(filePath, global.miniprogramRoot, fileDir);
                path.node.arguments[0] = t.stringLiteral(filePath);
            }
        }
    }
}

function lifeCycleHelper(liftCycleArr,key){
  let index = -1;
  let find = liftCycleArr.find((item,i)=>{
    if(item.key.name == key){
      index = i;
      return item;
    }
  });
  return {
    set(path){
      if(this.get()){
        liftCycleArr[index] = path;
      }else{
        liftCycleArr.push(path);
      }
    },
    get(){
      return find?find:undefined;
    }
  }
}

/**
 * 组件模板处理
 */
const componentTemplateBuilder = function (ast, vistors, filePath, isApp,fileType) {
    let buildRequire = null;
    let fillObject = {
      PROPS: arrayToObject(vistors.props.getData(), "props"),
      DATA: arrayToObject(vistors.data.getData(), "data"),
      MIXINS: arrayToObject(vistors.mixins.getData(), "mixins"),
      COMPONENTS: arrayToObject(vistors.components.getData(), "components"),
      METHODS: arrayToObject(vistors.methods.getData(), "methods"),
      COMPUTED: arrayToObject(vistors.computed.getData(), "computed"),
      WATCH: arrayToObject(vistors.watch.getData(), "watch"),
      EVENTS: arrayToObject(vistors.events.getData(), "events"),
      vistors:vistors
      // LIFECYCLE: arrayToObject(vistors.lifeCycle.getData(), "lifeCycle"),
   } 
    //非app.js文件
    ast = templatePackage(fillObject);
    //获取配置
    let config = vistors.config.getData();
    let oe = t.objectExpression(config);  //需要先转成objectExpression才能转成字符串
    let code = generate(oe).code;
    let object = null;
    try {
      object = (new Function('return ' + code+';'))();
    } catch (error) {
        console.log("config解析失败，file: " + filePath);
    }

    if (object && isApp) {
        global.appConfig = object;
    }else if(object && Object.keys(object).length > 0){

      // 去除掉useComponent 单独处理了组件 。这里先不需要
      delete object.usingComponents;
      global.pageConfigs[filePath] =  object;
    }

    let fileDir = path.dirname(filePath);

    // 分成两次 traverse 
    // 第一次 处理 生命周期相关语法
    // 第二次 处理 一些普通语法
    traverse(ast, {
        noScope: true,
        ImportDeclaration(path) {
            requireHandle(path, fileDir);
        },
        ObjectExpression(path){
          if(path.parent.type === "ExportDefaultDeclaration"){
              let root = path.node,
                  allNode = path.node.properties;

              let liftCycleArr = vistors.lifeCycle.getData();
  
              //  处理onload相关
              let onload = lifeCycleHelper(liftCycleArr,"onLoad");
              vistors.events.data.length && onload.set(astHelpers.modifyExp.event_2_on(vistors.events.data,onload.get()));
              fileType=="component" &&onload.get() && astHelpers.modifyExp.onLoad_2_mounted(onload.get());

              // 处理onUnload相关
              let onUnload = lifeCycleHelper(liftCycleArr,"onUnload");
              vistors.events.data.length && onUnload.set(astHelpers.modifyExp.event_2_on_destoryed(vistors.events.data,onUnload.get()));
              fileType=="component" && onUnload.get() && astHelpers.modifyExp.onUnload_2_destoryed(onUnload.get());
  
              // 处理 lifecycle
              liftCycleArr = liftCycleArr.reverse();
              root.properties = [allNode[0]].concat(liftCycleArr).concat(allNode.slice(1,allNode.length));

              // 处理 config里面引用组件
              astHelpers.addExp.useComponent_2_require(vistors.config.data,ast,(res)=>{
                ast = res;
              });
              
              path.skip();
          }
        }
      });

      traverse(ast, {
        noScope: true,
        MemberExpression(path){
          astHelpers.memberExp.wepy_$instance_2_getApp(path);
          astHelpers.memberExp.wx_2_uni(path);
          astHelpers.rmExp.this_methods_remove(path);
          astHelpers.rmExp.$apply_remove(path);
          astHelpers.addExp.createMapContext_add_this(path);
        },
        ObjectMethod(path) {
            const name = path.node.key.name;
            if (name === 'data') {
                //将require()里的地址都处理一遍
                traverse(path.node, {
                    noScope: true,
                    CallExpression(path2) {
                        requireHandle(path2, fileDir);
                    }
                });
            }
        },
        ObjectProperty(path){
          astHelpers.modifyExp.lifecycle_ArrowFun_2_normalFun(path);
        },
        CallExpression(path) {
            astHelpers.modifyExp.$broadcast_2_emit(path);
            
            let callee = path.node.callee;
            //将wx.createWorker('workers/fib/index.js')转为wx.createWorker('./static/workers/fib/index.js');
            if (t.isMemberExpression(callee)) {
                let object = callee.object;
                let property = callee.property;
                if (t.isIdentifier(object, { name: "wx" }) && t.isIdentifier(property, { name: "createWorker" })) {
                    let arguments = path.node.arguments;
                    if (arguments && arguments.length > 0) {
                        let val = arguments[0].value;
                        arguments[0] = t.stringLiteral("./static/" + val);
                    }
                }
            } else {
                requireHandle(path, fileDir);
            }
        }
    });
    return ast;
}


/**
 * 处理css文件 
 * 1.内部引用的wxss文件修改为css文件
 * 2.修正引用的wxss文件的路径
 * 
 * @param {*} fileContent       css文件内容
 * @param {*} file_wxss         当前处理的文件路径
 */
async function scriptHandle(v, filePath, targetFilePath, isApp,isJS) {
    let fileType = "";
    try {
        return await new Promise((resolve, reject) => {
            //先反转义
            let javascriptContent = v.childNodes.toString(),
                //初始化一个解析器
                javascriptParser = new JavascriptParser()

            // 判断是page 或者 component
            if((/wepy.component/g).test(javascriptContent)){
              fileType = "component";
            }else{
              fileType = "page";
            }

            //去除无用代码   
            javascriptContent = javascriptParser.beforeParse(javascriptContent);

            //去掉命名空间及标志
            javascriptContent = utils.restoreTagAndEventBind(javascriptContent);

            javascriptContent = utils.decode(javascriptContent);

            // console.log("javascriptContent   --  ", javascriptContent)
            //解析成AST
            javascriptParser.parse(javascriptContent).then((javascriptAst) => {
                //进行代码转换
                let { convertedJavascript, vistors, declareStr } = componentConverter(javascriptAst, isApp);
                //放到预先定义好的模板中
                convertedJavascript = componentTemplateBuilder(convertedJavascript, vistors, filePath, isApp, fileType)

                //生成文本并写入到文件
                let codeText = `\r\n${declareStr}\r\n${generate(convertedJavascript).code}\r\n`;
                if(!isJS){
                  codeText = `<script>\r\n${declareStr}\r\n${generate(convertedJavascript).code}\r\n</script>\r\n`;
                }

                resolve(codeText);
            });
        });
    } catch (err) {
        console.log(err);
    }
}



module.exports = scriptHandle;
