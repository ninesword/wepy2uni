const tags = ['view','scroll-view','swiper','icon','text','progress','button','form','input','checkbox','radio','picker','slider','switch','label','action-sheet','modal','toast','navigator','audio','image','video','map','canvas'];
module.exports = {
  handleAttr_value_function(attrValue){
    const reg = /(.+\()\s*(.*?)(\))/g;
    let funPre = "";
    let funContent = "";
    let funAfter = "";
    attrValue.replace(reg,function(match,pre,content,after){
      funPre = pre;
      funContent = content;
      funAfter = after;
    })

    if(!funPre){
      return attrValue;
    }
    let matchArr = [],
        nomarlHasQuotIndexArr = [],
        nomarlIndexArr = [],
        variableIndexArr = [];
        separationIndexArr = [];
        funContent.replace(/\s*(['"].*?['"])\s*|\s*([\w\_:\(\);\-\/\=\?\&\.]+)\s*|\s*{{\s*(.*?)\s*}}\s*|(,)/g,function(){
        if(typeof arguments[1] !== "undefined"){
          if((/\s*{{\s*(.*?)\s*}}\s*/g).test(arguments[1])){
            const vari = arguments[1].replace(/^['"](.*)['"]$/g,"$1");;
            variableIndexArr.push(matchArr.length);
            matchArr.push({type:'variable',value:vari});
          }else{
            nomarlHasQuotIndexArr.push(matchArr.length);
            matchArr.push({type:'nomarlHasQuot',value:arguments[1]});
          }
        }if(typeof arguments[2] !== "undefined"){
          nomarlIndexArr.push(matchArr.length);
          matchArr.push({type:'nomarl',value:arguments[2]});
        }if(typeof arguments[3] !== "undefined"){
          variableIndexArr.push(matchArr.length);
          matchArr.push({type:'variable',value:'{{'+arguments[3]+'}}'});
        }else if(typeof arguments[4] !== "undefined"){
          separationIndexArr.push(matchArr.length);
          matchArr.push({type:'comma',value:arguments[4]});
        }

    })

    // 引号 + 普通 不做处理
    // 引号 + 变量{{}} + .. 做处理
    // 普通 + 变量{{}} + .. 做处理
    let index = 0,
        resArr = [];
    separationIndexArr.push(matchArr.length);
    if(separationIndexArr.length > 0){
      separationIndexArr.forEach((item)=>{
        let paramModule =  matchArr.slice(index,item);

        // 处理 下面这种 XXXXXXXXX 无法描述 
        /*
          catchtap="toUrl('/subPackages/activity/pages/specialPrice?project_name={{ item.project.name }}&price={{ item.vendor_coupons.coupon.amount }}&project_time={{ item.vendor_coupons.started_at + '-' + item.vendor_coupons.ended_at }}&project_id={{ item.project.id }}')"
        */
        // paramModule.forEach((item,index)=>{
        //   if(item.type == 'nomarl'){
        //       if(index - 1 > -1 && index + 1 < paramModule.length){
        //         if(paramModule[index - 1].type.indexOf("Quot") > -1 && paramModule[index + 1].type.indexOf("Quot") > -1){
        //           if(paramModule[index - 1].type == "variableQuot"){
        //             item.value = `'` + item.value;
        //           }
        //           if(paramModule[index + 1].type == "variableQuot"){
        //             item.value += `'`;
        //           }
        //       }
        //     }
        //   }
        // })
        let paramModuleStr = paramModule.map(k=>k.value).join("");
        let typeCont = paramModule.map((per)=>{
            return per.type;
        });

        if(typeCont.includes("variable")){
            paramModuleStr = this.handleAttr_value_expression(paramModuleStr);
        }else{
          paramModule.forEach(item=>{
            if(item.type == "nomarl" && (/\/+/g).test(item.value)){
              item.value = `'${item.value}'`;
            }
          })
          paramModuleStr = paramModule.map(k=>k.value).join("");
        }

        resArr.push(paramModuleStr);
        index = item + 1;
      })
    }
    
    return `${funPre}${resArr.join(",")}${funAfter}`;
  },
  handleAttr_value_expression:function(attrValue,callback){
    /* 主要处理三元 或者 算术运算符 
      tab__item {{ index === tabIndex ? 'active' : '' }} => 'tab__item ' + (index === tabIndex ? 'active' : '')
    */
    let matchArr = [],
        nomarlIndexArr = [],
        variableIndexArr = [];
        attrValue.replace(/([^({{)^(}})^'^"]+)|{{\s*(.*?)\s*}}/g,function(){
        if(typeof arguments[1] !== "undefined"){
          nomarlIndexArr.push(matchArr.length);
          matchArr.push(arguments[1]);
        }else if(typeof arguments[2] !== "undefined"){
          variableIndexArr.push(matchArr.length);
          matchArr.push(arguments[2]);
        }
    })
    let index = 0,
        res = "";
    const hasOperation = /[\+\-\*/\?:=]+/;
    if(nomarlIndexArr.length && variableIndexArr.length){
      let strArr = [];
      variableIndexArr.forEach((item)=>{
        // {{}} 里面是不是存在运算或者三元 存在三元需加上（）
        if(hasOperation.test(matchArr[item])){
          if(matchArr.slice(index,item).length > 0){
            strArr.push(`'${matchArr.slice(index,item).join("")}'+(${matchArr[item]})`);
          }else{
            strArr.push(`(${matchArr[item]})`);
          }
        } else {
          if(matchArr.slice(index,item).length > 0){
            strArr.push(`'${matchArr.slice(index,item).join("")}'+${matchArr[item]}`);
          }else{
            strArr.push(`${matchArr[item]}`);
          }
        }
        index = item+1;
      })

      if(index !== matchArr.length){
        strArr.push(`'${matchArr.slice(index,matchArr.length).join("")}'`);
      }
      res = strArr.join("+");
    }else if(nomarlIndexArr.length){
      res = attrValue;
    }else if(variableIndexArr.length){
      res = matchArr.join("");
    }
    if(callback){
      callback(res);
    }else{
      return res;
    }
  },
  handleTag:function(nodeName,callback){
    const tag = {
      'repeat':'block'
    };

    callback(tag[nodeName] || nodeName);
  },
  handleAttr_name_bind:function(attrKey,attrValue,node,callbak){
    // 处理属性中 有{{}} 属性加上：
    const reg = /{{ ?(.*?) ?}}/;
    if(reg.test(attrValue)){
      attrKey = attrKey.replace(/^:?(?!@)(.*?)$/,':$1');

      // 处理属性上面有-连接符
      let temp = "";
      if((/:.*-\S+/).test(attrKey) && !tags.includes(node.name)){
        attrKey.split("-").forEach((item,index)=>{
          if(index > 0){
            temp += item.charAt(0).toUpperCase() + item.substr(1);
          }else{
            temp += item;
          }
        })

        attrKey = temp;
      }
    }
    callbak(attrKey);
  },
  handleAttr_preset:function(attrKey,callback){
     let map = {
      'wx:if': {
        key: 'v-if',
        value: (str) => {
          return str.replace(/{{(.*)}}/g, '$1')
        }
      },
      'wx-if': {
        key: 'v-if',
        value: (str) => {
          return str.replace(/{{(.*)}}/g, '$1')
        }
      },
      'wx:else': {
        key: 'v-else',
        value: (str) => {
          return str.replace(/{{ ?(.*?) ?}}/g, '$1').replace(/\"/g, "'")
        }
      },
      'wx:elif': {
        key: 'v-else-if',
        value: (str) => {
          return str.replace(/{{ ?(.*?) ?}}/g, '$1').replace(/\"/g, "'")
        }
      },
      'wx:for':{
        key: 'for',
        value: (attrKey,node) => {
          return this.handleAttr_wxfor(attrKey,node);
        }
      },
      'for':{
        key: 'for',
        value: (attrKey,node) => {
          return this.handleAttr_for(attrKey,node);
        }
      },
      'scrollX': {
        key: 'scroll-x',
        value: (str) => {
          return str.replace(/{{ ?(.*?) ?}}/g, '$1').replace(/\"/g, "'")
        }
      },
      'scrollY': {
        key: 'scroll-y',
        value: (str) => {
          return str.replace(/{{ ?(.*?) ?}}/g, '$1').replace(/\"/g, "'")
        }
      },
      'bindtap': {
        key: '@tap',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      'bind:tap': {
        key: '@tap',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      '@tap': {
        key: '@tap',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      '@focus': {
        key: '@focus',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },'@input': {
        key: '@input',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      '@longpress':{
        key: '@longpress',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      '@confirm': {
        key: '@confirm',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      'catchtap': {
        key: '@click.stop',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      'bindinput': {
        key: '@input',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      'bindsubmit': {
        key: '@submit',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      'bindgetuserinfo': {
        key: '@getuserinfo',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      },
      'catch:tap': {
        key: '@tap.native.stop',
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      }
    }[attrKey];


    // 存在@的均当做属性方法处理
    if(!map && (/^@/g).test(attrKey)){
      map = {
        key: attrKey,
        value: (str) => {
          return this.handleAttr_value_function(str);
        }
      }
    }
    callback(map);
  },
  handleAttr_wxfor:function(attrKey,node,callback){
    if (attrKey == 'wx:key' || attrKey == 'wx:for' || attrKey == 'wx:for-items' || attrKey == 'wx:for-item' || attrKey == 'wx:for-index') {
          
					let wx_key = node.attribs["wx:key"];
					let wx_for = node.attribs["wx:for"] || node.attribs["for"];
					let wx_forItem = node.attribs["wx:for-item"];
					let wx_index = node.attribs["wx:for-index"];
					let wx_forItems = node.attribs["wx:for-items"];
					//wx:for与wx:for-items互斥
          let value = wx_for ? wx_for : wx_forItems;
          if (value) {
              wx_key && (wx_key = wx_key.trim(),wx_key = wx_key.replace(/{{ ?(.*?) ?}}/, '$1').replace(/\"/g, "'"));
              wx_forItem = wx_forItem ? wx_forItem : "item";
              // 存在 key index、只有key、只有index、撒都没有 
              if(wx_key && wx_index){
                 wx_key = wx_index;
              }else if(wx_key){
                if (wx_key && wx_key.indexOf("*this") > -1){
                    wx_key = `${wx_forItem}`;
                    wx_index = wx_key;
                }
                
                // wx:key="item.id" 
                wx_index = wx_key.indexOf(".") > -1? "index": wx_key;

                if(wx_key == wx_forItem ){
                  wx_index = "index";
                }

                let pIndex = findParentsIndexWithFor(node);
                if (pIndex && pIndex.indexOf("index") > -1) {
                  let count = pIndex.split("index").join("");
                  if (count) {
                    count = parseInt(count);
                  } else {
                    count = 1; 
                  }
                  count++; 
                  wx_index = (wx_index && pIndex != wx_index) ? wx_index : "index" + count;
                } else {
                  wx_index = wx_index ? wx_index : "index";
                }
              }else if(wx_index){
                wx_key = wx_index;
                let pKey = findParentsWithFor(node);
                if (pKey && pKey.indexOf("index") > -1) {
                  let count = pKey.split("index").join("");
                  if (count) {
                    count = parseInt(count);
                  } else {
                    count = 1; 
                  }
                  count++; 
                  wx_key = (wx_key && pKey != wx_key) ? wx_key : "index" + count;
                } else {
                  wx_key = wx_key ? wx_key : "index";
                }
              }else {
                wx_key = "index";
                let pKey = findParentsWithFor(node);
                if (pKey && pKey.indexOf("index") > -1) {
                  let count = pKey.split("index").join("");
                  if (count) {
                    count = parseInt(count);
                  } else {
                    count = 1; 
                  }
                  count++; 
                  wx_key = (wx_key && pKey != wx_key) ? wx_key : "index" + count;
                } else {
                  wx_key = wx_key ? wx_key : "index";
                }

                wx_index = wx_key;
              }
					
						//将双引号转换单引号
						value = value.replace(/\"/g, "'");
						value = value.replace(/{{ ?(.*?) ?}}/, '(' + wx_forItem + ', ' + wx_index + ') in $1');
						if (value == node.attribs[attrKey]) {
							//奇葩!!! 小程序写起来太自由了，相比js有过之而无不及，{{}}可加可不加……我能说什么？
							//这里处理无{{}}的情况
							value = '(' + wx_forItem + ', ' + wx_index + ') in ' + value;
            }
						if (node.attribs.hasOwnProperty("wx:key")) delete node.attribs["wx:key"];
						if (node.attribs.hasOwnProperty("wx:for-index")) delete node.attribs["wx:for-index"];
						if (node.attribs.hasOwnProperty("wx:for-item")) delete node.attribs["wx:for-item"];
            if (node.attribs.hasOwnProperty("wx:for-items")) delete node.attribs["wx:for-items"];
            let res = {'v-for':value,':key':wx_key};
            return res;
					}
    }
  },
  handleAttr_for:function(attrKey,node,callback){
    if (attrKey == 'for') {
          //这里预先设置wx:for是最前面的一个属性，这样会第一个被遍历到
					let wx_key = node.attribs["key"];
					let wx_for = node.attribs["for"];
					let wx_forItem = node.attribs["item"];
					let wx_index = node.attribs["index"]; 
					let value = wx_for;
					if (value) {
            wx_key && (wx_key = wx_key.trim(),wx_key = wx_key.replace(/{{ ?(.*?) ?}}/, '$1').replace(/\"/g, "'"));
            wx_forItem = wx_forItem ? wx_forItem : "item";

            
            // 存在 key index、只有key、只有index、撒都没有 
            if(wx_key && wx_index){
              wx_key = wx_index;
            }else if(wx_key){
              wx_index = wx_key.indexOf(".") > -1? "index": wx_key;
              if(wx_key == wx_forItem ){
                wx_index = "index";
              }
              let pIndex = findParentsIndexWithFor(node);
              if (pIndex && pIndex.indexOf("index") > -1) {
                let count = pIndex.split("index").join("");
                if (count) {
                  count = parseInt(count);
                } else {
                  count = 1; 
                }
                count++; 
                wx_index = (wx_index && pIndex != wx_index) ? wx_index : "index" + count;
              } else {
                wx_index = wx_index ? wx_index : "index";
              }

            }else if(wx_index){
              wx_key = wx_index;
              let pKey = findParentsWithFor(node);
              if (pKey && pKey.indexOf("index") > -1) {
                let count = pKey.split("index").join("");
                if (count) {
                  count = parseInt(count);
                } else {
                  count = 1; 
                }
                count++; 
                wx_key = (wx_key && pKey != wx_key) ? wx_key : "index" + count;
              } else {
                wx_key = wx_key ? wx_key : "index";
              }
            }else {
              wx_key = "index";
              let pKey = findParentsWithFor(node);
              if (pKey && pKey.indexOf("index") > -1) {
                let count = pKey.split("index").join("");
                if (count) {
                  count = parseInt(count);
                } else {
                  count = 1; 
                }
                count++; 
                wx_key = (wx_key && pKey != wx_key) ? wx_key : "index" + count;
              } else {
                wx_key = wx_key ? wx_key : "index";
              }

              wx_index = wx_key;
            }

						//将双引号转换单引号
						value = value.replace(/\"/g, "'");
						value = value.replace(/{{ ?(.*?) ?}}/, '(' + wx_forItem + ', ' + wx_index + ') in $1');
						if (value == node.attribs[attrKey]) {
							//奇葩!!! 小程序写起来太自由了，相比js有过之而无不及，{{}}可加可不加……我能说什么？
							value = '(' + wx_forItem + ', ' + wx_index + ') in ' + value;
            }
            
						if (node.attribs.hasOwnProperty("key")) delete node.attribs["key"];
						if (node.attribs.hasOwnProperty("item")) delete node.attribs["item"];
						if (node.attribs.hasOwnProperty("index")) delete node.attribs["index"];
            if (node.attribs.hasOwnProperty("for")) delete node.attribs["for"];
            let res = {'v-for':value,':key':wx_key};
            return res;
					}
    }
  },
  handleAttr_user_function(attrKey,callback){
    // 如果存在自定义事件 处理成 event-bus
    if((/\S+.user$/g).test(attrKey)){
      callback(attrKey);
    }
  }
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

/**
 * 遍历往上查找祖先，看是否有v-for存在，存在就返回它的index，不存在返回空
 */
function findParentsIndexWithFor(node) {
	if (node.parent) {
		if (node.parent.attribs["v-for"]) {
      let res = '';
			node.parent.attribs["v-for"].replace(/\(\s*.*?,\s*(.*?)\s*\)/g,function(){
        if(typeof arguments[1] != "undefined" ){
          res = arguments[1].trim();
        }
      });

      return res;
		} else {
			return findParentsIndexWithFor(node.parent);
		}
	}
}