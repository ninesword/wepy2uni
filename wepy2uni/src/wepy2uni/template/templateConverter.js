const helpers = require('./helpers.js');
//html标签替换规则，可以添加更多
const tagConverterConfig = {
	// 'view': 'div',
	// 'image': 'img'
	'repeat':'block'
}

/**
 * 1. 替换bind为@，有两种情况：bindtap="" 和 bind:tap=""，
 * 2. 转换@tap.user=""为@tap
 */
function replaceBindToAt(attr) {
	return attr.replace(/^bind:*/, "@").replace(/(@.*?).user/, "$1");
}

/**
 * 替换wx:abc为:abc
 */
function replaceWxBind(attr) {
	return attr.replace(/^wx:*/, ":");
}

/**
 * 遍历往上查找祖先，看是否有v-for存在，存在就返回它的:key，不存在返回空
 */
function findParentsWithFor(node) {
	if (node.parent) {
		if (node.parent.attribs["v-for"]) {
			return node.parent.attribs[":key"];
		} else {
			return findParentsWithFor(node.parent);
		}
	}
}

//表达式列表
const expArr = [" + ", " - ", " * ", " / ", "?"];
/**
 * 查找字符串里是否包含加减乘除以及？等表达式
 * @param {*} str 
 */
function checkExp(str) {
	return expArr.some(function (exp) {
		return str.indexOf(exp) > -1;
	});
}

//替换入口方法
const templateConverter = function (ast) {
	let reg_tag = /{{.*?}}/; //注：连续test时，这里不能加/g，因为会被记录上次index位置
	for (let i = 0; i < ast.length; i++) {
		let node = ast[i];
		//检测到是html节点
		if (node.type === 'tag') {
			// 进行标签替换  
			helpers.handleTag(node.name,function(tag){
				node.name = tag;
			});
			
			//进行属性替换                                                             
			let attrs = {}
			for (let attrKey in node.attribs) {
				let attrValue = node.attribs[attrKey];
				helpers.handleAttr_preset(attrKey,function(map){
					if(map){
						if(attrKey == 'wx:for' || attrKey == 'for'){
							Object.assign(attrs,map['value'] && map['value'](attrKey,node));
						}else{
							attrs[map["key"]] = map['value'] ? map['value'](attrValue) : node.attribs[attrKey];
						}
					}else{
						helpers.handleAttr_name_bind(attrKey,attrValue,node,function(attrKey){
                helpers.handleAttr_value_expression(attrValue,function(attrValue){
                  if(attrValue){
                    attrs[attrKey] = attrValue;
                  }else{
                   // console.log('属性不合法'+attrKey+"="+attrValue)
                  }
                  
                });
						});
          }
				})
        
        //  处理自定义事件
        helpers.handleAttr_user_function(attrKey,(res)=>{
          if(res){
              global.template.current.userEvent.push({
              value:attrValue,
              key:res.replace(/@(.*?).user/,'$1')
              });
          }
        });
        
			}

			node.attribs = attrs;
		}
		//因为是树状结构，所以需要进行递归
		if (node.children) {
			templateConverter(node.children);
		}
	}
	return ast;
}


module.exports = templateConverter;
