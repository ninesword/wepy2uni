const t = require('@babel/types');
const nodePath = require('path');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const Vistor = require("./Vistor");
const astHelpers  = require("./astHelpers");
const clone = require('clone');
const template = require('@babel/template').default;

const lifeCycleFunction = {
	onLoad: true,
	onReady: true,
	onShow: true,
	onHide: true,
	onUnload: true,
	onPullDownRefresh: true,
	onReachBottom: true,
	onShareAppMessage: true,
	onLaunch: true,
	methods: true,
	loaded: true,
	globalData:true,
}

var vistors = {
	props: new Vistor(),
	mixins: new Vistor(),
	data: new Vistor(),
	events: new Vistor(),
	computed: new Vistor(),
	components: new Vistor(),
	watch: new Vistor(),
	methods: new Vistor(),
	lifeCycle: new Vistor(),
	config: new Vistor(),
}

//外部定义的变量
let declareStr = '';
//data对象
let dataValue = {};
//computed对象
let computedValue = {};
//wacth对象
let watchValue = {};
//判断当前文件类型，true表示页面，false表示组件
let isPage = true;

//工作目录
let miniprogramRoot = "";
//当前处理的js文件路径
let file_js = "";


/**
 * 转换ClassMethod为ObjectMethod
 */
function transformClassMethodToObjectMethod(pathNode) {
	let node = t.objectMethod("method", pathNode.key, pathNode.params, pathNode.body, pathNode.computed);
	node.async = pathNode.async;
	return node;
}
/**
 * 转换ClassProperty为ObjectProperty
 */
function transformClassPropertyToObjectProperty(pathNode) {
	let node = t.objectProperty(pathNode.key, pathNode.value);
	return node;
}

/*
 *
 * 注：为防止深层遍历，将直接路过子级遍历，所以使用enter进行全遍历时，孙级节点将跳过
 * 
 */
const componentVistor = {
	ImportDeclaration(path) {
		//处理导入的是wxss的情况，替换.wxss为.css即可。
		var str = `${generate(path.node).code}\r\n`;
		str = str.split(".wxss").join(".css").split(".wpy").join("");
		declareStr += str;
	},
	VariableDeclaration(path) {
		const parent = path.parentPath.parent;
		if (t.isFile(parent)) {
			//定义的外部变量
			declareStr += `${generate(path.node).code}\r\n`;
		}
  },
  ExpressionStatement(path){
    // 处理 export defalut 外部 的表达式语句
    declareStr += astHelpers.tmpOut.expressionStatement(path);
  },
	FunctionDeclaration(path) {
		const parent = path.parentPath.parent;
		if (t.isFile(parent)) {
			//定义的外部函数
			declareStr += `${generate(path.node).code}\r\n`;
		}
  },
	enter(path) {
		//判断如果是类属性
		if (t.isClassProperty(path)) {
			//根据不同类属性进行不同处理，把wepy的类属性写法提取出来，放到VUE模板中
			const key = path.node.key.name;
			switch (key) {
				case 'props':
					vistors.props.handle(path.node.value);
					break;
				case 'data':
					let dataArr = vistors.data.getData();
					if (dataArr.length == 0) {
						  vistors.data.handle(path.node.value);
					}
					break;
				case 'events':
          			vistors.events.handle(path.node.value);
					break;
				case 'computed':
					vistors.computed.handle(path.node.value);
					break;
				case 'components':
					vistors.components.handle(path.node.value);
					break;
				case 'watch':
					vistors.watch.handle(path.node.value);
					break;
				case 'methods':
					vistors.methods.handle(path.node.value);
					break;
				case 'mixins':
					//单独处理
					vistors.mixins.handle(path.node.value);
					break;
				case 'config':
					//处理页面的配置
          vistors.config.handle(path.node.value);
					break;
				default:
					if (key == "def") {
						//如果为def时，就把data的内容给替换了
						vistors.data.clear();
						vistors.data.handle(path.node.value);
					}else if (key == "globalData") {
						let node = transformClassPropertyToObjectProperty(path.node);
						vistors.lifeCycle.handle(node);
					}
					break;
			}
    }
   
		//判断如果是类方法
		if (t.isClassMethod(path)) {
				let key = path.node.key.name;
			if (lifeCycleFunction.hasOwnProperty(key) && lifeCycleFunction[key]) {
				//将classMethod转换objectMethod
				let node = transformClassMethodToObjectMethod(path.node);
				vistors.lifeCycle.handle(node);
			} else {
				let node = transformClassMethodToObjectMethod(path.node);
				vistors.methods.handle(node);
			}
		}
  }
}

const componentConverter = function (ast, _miniprogramRoot, _file_js) {
	//清空上次的缓存
	declareStr = '';
	//data对象
	dataValue = {};
	//computed对象
	computedValue = {};
	//wacth对象
	watchValue = {};
	//
	isPage = true;
	//
	miniprogramRoot = _miniprogramRoot;
	file_js = _file_js;
	//
	vistors = {
		props: new Vistor(),
		mixins: new Vistor(),
		data: new Vistor(),
		events: new Vistor(),
		computed: new Vistor(),
		components: new Vistor(),
		watch: new Vistor(),
		methods: new Vistor(),
		lifeCycle: new Vistor(),
		config: new Vistor(),
	}

	return {
		convertedJavascript: traverse(ast, componentVistor),
		vistors: vistors,
		declareStr, //定义的变量和导入的模块声明
	}
}

module.exports = componentConverter;
