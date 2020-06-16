const fs = require('fs-extra');
const path = require('path');
const t = require('@babel/types');
const generate = require('@babel/generator').default;

const utils = require('../utils/utils.js');
const pathUtil = require('../utils/pathUtil.js');


/**
 * 处理配置文件
 * 生成配置文件: pages.json、manifest.json、main.js
 * @param {*} configData        小程序配置数据
 * @param {*} routerData        所有的路由页面数据
 * @param {*} miniprogramRoot   小程序主体所在目录
 * @param {*} targetFolder      最终要生成的目录
 */
async function configHandle(appConfig, pageConfigs, miniprogramRoot, targetSrcFolder) {
	try {
    targetSrcFolder = targetSrcFolder+"/src";
		await new Promise((resolve, reject) => {
			//将pages节点里的数据，提取routerData对应的标题，写入到pages节点里
			let pages = [];
			for (const key in appConfig.pages) {
				let pagePath = appConfig.pages[key];
				let pageInfo = {};
				Object.keys(pageConfigs).forEach((item)=>{
					if(path.join(item).replace(/\.wpy$/,"") == path.join(miniprogramRoot, wpy2uniConfig.rootPath?wpy2uniConfig.rootPath:'src',pagePath)+""){
						pageInfo = pageConfigs[item];
					}
				});
				let obj = {
					"path": pagePath,
					"style": pageInfo
				}
				pages.push(obj);
			}

      appConfig.pages = pages;
      
      //将subpackages节点里的数据，写入到subpackages节点里
			for (const key in appConfig.subPackages) {
        let subItem = appConfig.subPackages[key];
        let pages = [];
        subItem.pages && subItem.pages.forEach(subPath => {
            let pageInfo = {};
            Object.keys(pageConfigs).forEach((item)=>{
              if(path.join(item).replace(/\.wpy$/,"") == 
              path.join(miniprogramRoot, wpy2uniConfig.rootPath?wpy2uniConfig.rootPath:'src',subItem.root,subPath)){
                pageInfo = pageConfigs[item];
              }
            });
            pages.push({
              "path": subPath,
              "style": pageInfo
            });
        });
        subItem.pages = pages;
			}

			//替换window节点为globalStyle
			appConfig["globalStyle"] = appConfig["window"];
			delete appConfig["window"];

			//usingComponents节点，上面删除缓存，这里删除
			delete appConfig["usingComponents"];

			//workers处理，简单处理一下
			if (appConfig["workers"]) appConfig["workers"] = appConfig["workers"];

			//写入pages.json
			let file_pages = path.join(targetSrcFolder, "pages.json");
			fs.writeFile(file_pages, JSON.stringify(appConfig, null, '\t'), () => {
				console.log(`write ${path.relative(global.targetFolder, file_pages)} success!`);
			});
			////////////////////////////write manifest.json/////////////////////////////
			//这里还需要研究一下下~~~~
			let file_package = path.join(global.sourceFolder, "package.json");
			let packageJson = {};
			if (fs.existsSync(file_package)) {
				packageJson = fs.readJsonSync(file_package);
			}else{
				console.log("找不到package.json");
			}

			//注：因json里不能含有注释，因些template/manifest.json文件里的注释已经被删除。
			let file_manifest = path.join(__dirname, "./manifest.json");
			let manifestJson = {};
			if (fs.existsSync(file_manifest)) {
				manifestJson = fs.readJsonSync(file_manifest);
				manifestJson.name = packageJson.name || "";
				manifestJson.description = packageJson.description || "";
				manifestJson.versionName = packageJson.version || "1.0.0";
				manifestJson["mp-weixin"].appid = packageJson.appid || "";
			}else{
				console.log("找不到manifest.json");
			}

			//manifest.json
			file_manifest = path.join(targetSrcFolder, "manifest.json");
			fs.writeFile(file_manifest, JSON.stringify(manifestJson, null, '\t'), () => {
				console.log(`write ${path.relative(global.targetFolder, file_manifest)} success!`);
			});

			////////////////////////////write main.js/////////////////////////////
			let mainContent = "import Vue from 'vue';\r\n";
			mainContent += "import App from './App';\r\n\r\n";
			mainContent += "Vue.config.productionTip = false;\r\n\r\n";
			mainContent += "App.mpType = 'app';\r\n\r\n";
			mainContent += "Vue.prototype.$eventBus = new Vue();\r\n\r\n";
			mainContent += "const app = new Vue({\r\n";
			mainContent += "    ...App\r\n";
			mainContent += "});\r\n";
			mainContent += "app.$mount();\r\n";
			//
			let file_main = path.join(targetSrcFolder, "main.js");
			fs.writeFile(file_main, mainContent, () => {
				console.log(`write ${path.relative(global.targetFolder, file_main)} success!`);
			});

			//////////////////////////////////////////////////////////////////////
			resolve();
		});
	} catch (err) {
		console.log(err);
	}
}

module.exports = configHandle;
