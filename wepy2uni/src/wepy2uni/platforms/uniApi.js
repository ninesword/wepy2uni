const t = require('@babel/types');

const unSupport = {
  appUnsupport:["getUpdateManager","getSetting","onUserCaptureScreen","authorize","navigateToMiniProgram","hideNavigationBarLoading","hideNavigationBarLoading","hideShareMenu","showNavigationBarLoading"],
  alipayUnsupport:["saveImageToPhotosAlbum"],
  uniUnsupport:["nextTick","reportAnalytics","getLaunchOptionsSync"]
}

function strat(path){
}

strat.default = function(path){
  path.node.object = t.identifier("uni");
}
strat.appUnsupport = function (path){
  if(path.parentPath.parentPath.type !== "ExpressionStatement"){
    if(typeof global.script.wxArr === "undefined"){
      global.script.wxArr = [];
      global.script.wxArr.push(path.node.property.name);
    }else{
      global.script.wxArr.push(path.node.property.name);
    }
    return ;
  }
  const before = t.expressionStatement(t.stringLiteral("// #ifndef APP-PLUS"));
  const after = t.expressionStatement(t.stringLiteral("// #endif"));
  path.parentPath.insertAfter(after);
  path.parentPath.insertBefore(before);
}

strat.alipayUnsupport = function (path){
  if(path.parentPath.parentPath.type !== "ExpressionStatement"){
    if(typeof global.script.wxArr === "undefined"){
      global.script.wxArr = [];
      global.script.wxArr.push(path.node.property.name);
    }else{
      global.script.wxArr.push(path.node.property.name);
    }
    return ;
  }
  const before = t.expressionStatement(t.stringLiteral("// #ifndef MP-ALIPAY"));
  const after = t.expressionStatement(t.stringLiteral("// #endif"));
  path.parentPath.insertAfter(after);
  path.parentPath.insertBefore(before);
}

strat.uniUnsupport = function (path){
  if(path.parentPath.parentPath.type !== "ExpressionStatement"){
    path.node.object = t.identifier("wx");
    if(typeof global.script.wxArr === "undefined"){
      global.script.wxArr = [];
      global.script.wxArr.push(path.node.property.name);
    }else{
      global.script.wxArr.push(path.node.property.name);
    }
    return ;
  }

  const before = t.expressionStatement(t.stringLiteral("// #ifdef MP-WEIXIN"));
  const after = t.expressionStatement(t.stringLiteral("// #endif"));
  path.parentPath.insertAfter(after);
  path.parentPath.insertBefore(before);
  path.node.object = t.identifier("wx");
}

module.exports = {
  handle(path,apiName){
    strat["default"](path);
    Object.keys(unSupport).forEach((item)=>{
      if(unSupport[item].includes(apiName)){
          strat[item]?strat[item](path):strat["default"](path);
      }
    })
  },
  textHandle(content){
    content = content.replace(/"\/\/ #ifndef APP-PLUS";/g,"\/\/ #ifndef APP-PLUS")
    .replace(/"\/\/ #ifndef MP-ALIPAY";/g,"\/\/ #ifndef MP-ALIPAY")
    .replace(/"\/\/ #ifdef MP-WEIXIN";/g,"\/\/ #ifdef MP-WEIXIN")
    .replace(/"\/\/ #endif";/g,"\/\/ #endif");
    return content;
  }
}