const t = require('@babel/types');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const parse = require('@babel/parser').parse;
const uniApi = require('../platforms/uniApi');

const tmpOut = {
  expressionStatement(path){
    const parent = path.parentPath.parent;
    let res = "";
    if (t.isFile(parent)) {
        res += `${generate(path.node).code}\r\n`;
    }
    return res;
  }
}

const memberExp = {
  // wepy.$instance 替换成 getApp()
  wepy_$instance_2_getApp(path){
    let node = path.node;
    let object = node.object;
    let property = node.property;
    if (t.isIdentifier(object, { name: "wepy" }) && t.isIdentifier(property, { name: "$instance" })) {
      path.parent.init = t.CallExpression({
                                "type": "Identifier",
                                "name": "getApp"
                              },[])
    }
  },
  wx_2_uni(path){
    let node = path.node;
    let object = node.object;
    let property = node.property;
    if (t.isIdentifier(object, { name: "wx" }) && property) {
        uniApi.handle(path,property.name);
    }
  }
}
const modifyExp = {
  lifecycle_ArrowFun_2_normalFun(path){
    if(["watch","computed"].includes(path.node.key.name)){
        traverse(path.node,{
          noScope: true,
          ArrowFunctionExpression(p){
           if(p.parent.type === "ObjectProperty"){
              p.parent.value = t.FunctionExpression(null,p.node.params,p.node.body,p.node.generator,p.node.async);
           }
          }
        })
    }   
  },
  $broadcast_2_emit(path){
    let node = path.node;
    if(t.isMemberExpression(node.callee)){
      if(t.isIdentifier(node.callee.property,{name:'$broadcast'}) || t.isIdentifier(node.callee.property,{name:'$emit'})){
        node.callee = t.MemberExpression( t.MemberExpression(t.identifier("this"),t.identifier("$eventBus")),t.identifier("$emit"));
      }
    }  
  },
  event_2_on(events,inner){
      let expressionStatementArr = [];
      let callee = t.MemberExpression( t.MemberExpression(t.identifier("this"),t.identifier("$eventBus")),t.identifier("$on"));
      for(var i = 0;i < events.length;i++){
        let per = events[i];
          //两种情况 {go(){}} {go:funciton(){}}
         if(per.type == "ObjectMethod"){
            expressionStatementArr.push(t.ExpressionStatement(t.CallExpression(callee,[t.stringLiteral(per.key.name),t.arrowFunctionExpression(per.params,per.body,per.async)])));
         }else {
            expressionStatementArr.push(t.ExpressionStatement(t.CallExpression(callee,[t.stringLiteral(per.key.name || per.key.value),t.arrowFunctionExpression(per.value.params,per.value.body,per.value.async)])))
         }
      }
      if(!inner){
          inner = t.classMethod('method', t.identifier("created"),[],t.blockStatement([]));
      }
      inner.body.body = inner.body.body.concat(expressionStatementArr);
      return inner;
  },
  event_2_on_destoryed(events,inner){
      let expressionStatementArr = [];
      let callee = t.MemberExpression( t.MemberExpression(t.identifier("this"),t.identifier("$eventBus")),t.identifier("$off"));
      for(var i = 0;i < events.length;i++){
        let per = events[i];
        if(per.type == "ObjectMethod"){
          expressionStatementArr.push(t.ExpressionStatement(t.CallExpression(callee,[t.stringLiteral(per.key.name)])));
        }else {
            expressionStatementArr.push(t.ExpressionStatement(t.CallExpression(callee,[t.stringLiteral(per.key.name || per.key.value)])))
        }
      }
      if(!inner){
          inner = t.classMethod('method', t.identifier("destroyed"),[],t.blockStatement([]));
      }

      inner.body.body = inner.body.body.concat(expressionStatementArr);
      return inner;
  },
  onLoad_2_mounted(node){
    if(node.key.name == "onLoad"){
       node.key = t.identifier("mounted");
    }
  },
  onUnload_2_destoryed(node){
    if(node.key.name == "onUnload"){
       node.key = t.identifier("destroyed");
    }
  }
}

const addExp = {
  useComponent_2_require(conigs,ast,callback){
    let requireArr = [],
        components = [];
    const componentPrefix = "comp_";
      conigs && conigs.forEach((item)=>{
        if(item.key.name == 'usingComponents'){
            item.value.properties && item.value.properties.forEach((item)=>{
            requireArr.push(t.importDeclaration([t.ImportDefaultSpecifier(t.identifier(`${componentPrefix}_${item.key.name || item.key.value}`))], item.value));
            components.push(t.ObjectProperty(item.key,t.identifier(`${componentPrefix}_${item.key.name || item.key.value}`)))
          })
        }
      })
      if(components.length){
        let hasComponents = false;
        traverse(ast,{
          noScope: true,
          ObjectProperty(path){
            if(path.node.key.name == "components"){
              generate(path.node) 
               path.node.value.properties = path.node.value.properties.concat(components);
               hasComponents = true;
            }
          }
        })
  
        if(!hasComponents){
          traverse(ast,{
            noScope: true,
            ObjectMethod(path){
              if(path.node.key.name == "data"){
                path.insertAfter(t.ObjectProperty(t.identifier("components"),t.ObjectExpression(components)));
              }
            }
          })
        }
      }
  
      if(requireArr.length > 0){
        let requireText = "";
        requireArr.map((item)=>{
          requireText += generate(item).code + '\n';
        })
        ast = parse( requireText + generate(ast).code, {
          sourceType: 'module',
          plugins: [
            'jsx',
            'classProperties', 
          ],
        })
      }
   callback(ast);
  },
  createMapContext_add_this(path){
      if(path.node.object.name === "uni" && path  .node.property.name == "createMapContext"){
         path.parent.type == "CallExpression" && (path.parent.arguments = path.parent.arguments.concat(t.thisExpression()));
      }
  }
} 

const rmExp = {
  this_methods_remove(path){
    let node = path.node;
    let property = node.property;
    if( t.isIdentifier(property, { name: "methods" }) && path.parent.property){
      if(path.parent.object){
         path.parent.object = path.node.object;
      }
    }
  },
  $apply_remove(path){
    let node = path.node;
    let property = node.property;
    if( t.isIdentifier(property, { name: "$apply" })){
       path.parentPath.remove();
    }
  }
}
module.exports = {
  tmpOut,
  memberExp,
  addExp,
  rmExp,
  modifyExp
}