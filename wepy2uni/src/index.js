const path = require('path');
const fs = require('fs-extra');
var moment = require('moment');
moment.locale('zh-cn');
//
const utils = require('./utils/utils.js');
const pathUtil = require('./utils/pathUtil.js');


const XmlParser = require('./wepy2uni/xml/XmlParser');

////////////////
const styleHandle = require('./wepy2uni/styleHandle');
const scriptHandle = require('./wepy2uni/scriptHandle.js');
const templateHandle = require('./wepy2uni/templateHandle');

const configHandle = require('./wepy2uni/configHandle');
const vueCliHandle = require('./wepy2uni/vueCliHandle');
const uniApi = require('./wepy2uni/platforms/uniApi');


/**
 * 遍历目录
 * @param {*} folder           当前要遍历的目录
 * @param {*} miniprogramRoot  小程序主体所在目录
 * @param {*} targetSrcFolder  生成目录下面的src目录
 * @param {*} callback         回调函数
 */
function traverseFolder(folder, miniprogramRoot, targetSrcFolder, callback) {
	fs.readdir(folder, function (err, files) {
		var count = 0
		var checkEnd = function () {
			++count == files.length && callback()
    }
    
    var tFolder = path.join(targetSrcFolder, path.relative(miniprogramRoot, folder));
    if(global.wpy2uniConfig.static){
      Object.keys(global.wpy2uniConfig.static).forEach((item)=>{
          if(folder.indexOf(path.resolve(miniprogramRoot,global.wpy2uniConfig.rootPath,global.wpy2uniConfig.static[item].origin)) > -1){
            tFolder = folder.replace(path.resolve(miniprogramRoot,global.wpy2uniConfig.rootPath,global.wpy2uniConfig.static[item].origin),path.join(targetSrcFolder,global.wpy2uniConfig.rootPath, global.wpy2uniConfig.static[item].to));
          }
      })
    }

		files.forEach(function (fileName) {
			var fileDir = path.join(folder, fileName);
      let newfileDir = path.join(tFolder, fileName);
			fs.stat(fileDir, function (err, stats) {
				if (stats.isDirectory()) {
					fs.mkdirSync(newfileDir, { recursive: true });
					//继续往下面遍历
					return traverseFolder(fileDir, miniprogramRoot, targetSrcFolder, checkEnd);
				} else {

					/*not use ignore files*/
					if (utils.fileIgnore(fileName)) {
             
					} else {
						let extname = path.extname(fileName).toLowerCase();
						let fileNameNoExt = pathUtil.getFileNameNoExt(fileName);
						//
						switch (extname) {
							case ".js":
								let data_js = fs.readFileSync(fileDir, 'utf8');
                data_js = data_js.replace(/import\s+wepy\s+from\s+['"]wepy['"];?/gm, '');
                
                // 这里还需要对js进行处理，
                if(data_js){
                  // mixins | export default class scanMixins extends wepy.mixin 
                  if((/\s*export\s+default\s+class\s+.*extends\s+wepy.mixin\s*/).test(data_js)){
                    filesHandle("<script>"+data_js+"</script>", fileDir, newfileDir, false,true);
                  }else{
                    data_js = data_js.replace(/([^\w])(wx\.)/g,"$1uni.");
                    fs.writeFile(newfileDir, data_js, () => {
                      console.log(`Convert ${path.relative(global.targetFolder, newfileDir)} success!`);
                   });
                  }
                }
								
								break;
							case ".wpy":
								let isApp = false;
								if (fileName == "app.wpy") {
									isApp = true;
									fileNameNoExt = "App";
								}
								let data_wpy = fs.readFileSync(fileDir, 'utf8');
								let targetFile = path.join(tFolder, fileNameNoExt + ".vue");
								if (data_wpy) {
                  filesHandle(data_wpy, fileDir, targetFile, isApp);
								}
                break;
							case ".wxss":
                  newfileDir = newfileDir.replace(/.wxss/,global.wpy2uniConfig.styleComplier?("."+global.wpy2uniConfig.styleComplier):'.css');
                  fs.copySync(fileDir, newfileDir);
							default:
								fs.copySync(fileDir, newfileDir);
								break;
						}
					}
					checkEnd();
				}
			})
		})

		//为空时直接回调
		files.length === 0 && callback();
	})
}

/**
 * 转换wpy文件
 * @param {*} fileText 
 * @param {*} filePath 
 * @param {*} targetFile 
 * @param {*} isApp 
 */
async function filesHandle(fileText, filePath, targetFile, isApp,isJs) {
	//首先需要完成Xml解析及路径定义：
	//初始化一个Xml解析器

	let targetFilePath = targetFile;
	let xmlParser = new XmlParser();

	/**
	 * 同样使用xmldom来分离wpy文件，而wepy-cli却不用这么麻烦，不清楚什么原因。
	 * 想使用正则来分离，总无法完美解决。
	 * 先就这样先吧
	 */

	//解析代码内容
	xmlParserObj = xmlParser.parse(fileText);

	let fileContent = {
		style: [],
		template: [],
		script: ""
	};

	//最后根据xml解析出来的节点类型进行不同处理
	for (let i = 0; i < xmlParserObj.childNodes.length; i++) {
		let v = xmlParserObj.childNodes[i];
		if (v.nodeName === 'style') {
			let style = await styleHandle(v, filePath, targetFilePath);
			fileContent.style.push(style);
		}
		if (v.nodeName === 'template') {
      global.template.current = {userEvent:[]};
      let template = await templateHandle(v, filePath, targetFilePath);
      global.template[filePath] = global.template.current;

			fileContent.template.push(template);
		}
		if (v.nodeName === 'script') {
      global.script.current = {};
      let script = await scriptHandle(v, filePath, targetFilePath, isApp,isJs);
      script = uniApi.textHandle(script);
      
      if(isJs){
        fs.writeFileSync(targetFile, script.replace(/<\s*script\s*>(.*?)<\/script\s*>/,'$1'), () => {
          console.log(`Convert file ${fileName}.js success!`);
        });
        return false;
      }else{
        fileContent.script = script;
      }
		}
	}
	//
	let content = '\uFEFF'; // BOM
	content = fileContent.template.join("\r\n") + fileContent.script + fileContent.style.join("\r\n");

	fs.writeFileSync(targetFile, content, () => {
		console.log(`Convert file ${fileName}.wpy success!`);
	});
}


/**
 * 转换入口
 * @param {*} sourceFolder    输入目录11
 * @param {*} targetFolder    输出目录
 */
async function transform(sourceFolder, targetFolder,root) {
	fileData = {};
	routerData = {};
	imagesFolderArr = [];

	global.log = []; //记录转换日志，最终生成文件

	let configData = {};
	const wpy2uniConfig = {};
	let wpy2uniPath = path.join(root, "wpy2uni.config.js");
	if (fs.existsSync(wpy2uniPath)) {
		//let wpy2uni =  fs.readFileSync(wpy2uniPath,'utf-8');
		let wpy2uni = require(wpy2uniPath);
		global.wpy2uniConfig = Object.assign(wpy2uniConfig,wpy2uni);
	} else {
		console.log(`Error： 找不到wpy2uniConfig文件`);
	}

	//读取package.json
	let file_package = path.join(sourceFolder, "package.json");
	if (fs.existsSync(file_package)) {
		let packageJson = fs.readJsonSync(file_package);
		//
		configData.name = packageJson.name;
		configData.version = packageJson.version;
		configData.description = packageJson.description;
		configData.author = packageJson.author;
	} else {
		console.log(`Error： 找不到package.json文件`);
	}

	let miniprogramRoot = sourceFolder;
	if (!targetFolder && !wpy2uniConfig.targetProjectName){
		targetFolder = sourceFolder + "_uni";
	} else if(!targetFolder && wpy2uniConfig.targetProjectName){
    targetFolder = path.join(wpy2uniConfig.targetProjectName)
	}

	miniprogramRoot = path.join(sourceFolder);

	if (!fs.existsSync(miniprogramRoot)) {
		console.log("Error: src目录不存在! 可能不是wepy项目");
		return;
	}

	/////////////////////定义全局变量//////////////////////////
	//之前传来传去的，过于麻烦，全局变量的弊端就是过于耦合了。
	global.globalUsingComponents = {};
	global.pageUsingComponents = {};
	global.miniprogramRoot = miniprogramRoot;
	global.sourceFolder = sourceFolder;
	global.targetFolder = targetFolder;

	// wepy 有src这一层 uni 推荐的目录是没有src这一层
	global.targetSrcFolder = path.join(targetFolder, "");
	global.routerData = {};

	//页面配置
	global.appConfig = {};
  global.pageConfigs = {};

  global.template = {};
  global.script = {};
  global.style = {};
  
	utils.log("outputFolder = " + global.targetFolder, "log");
	utils.log("targetFolder = " + global.targetFolder, "log");

	if (fs.existsSync(global.targetFolder)) {
		pathUtil.emptyDirSyncEx(global.targetFolder,wpy2uniConfig.clearTargetFolderIgnore|| "node_modules");
	} else {
		fs.mkdirSync(global.targetFolder);
	}
	utils.sleep(400);
	if (!fs.existsSync(global.targetSrcFolder)) fs.mkdirSync(global.targetSrcFolder);
	traverseFolder(miniprogramRoot, miniprogramRoot, global.targetSrcFolder, () => {
		configHandle(global.appConfig, global.pageConfigs, global.miniprogramRoot, global.targetSrcFolder);
    vueCliHandle(configData, global.targetFolder, global.targetSrcFolder);
	});
}

module.exports = transform;

