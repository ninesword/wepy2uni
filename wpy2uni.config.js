module.exports  = { 
    "folderIgnore":['store'],  // 要忽略转换的目录
    "fileIgnore":['wepy.config.js','package.json',''],  // 要忽略转换的目录
    "clearTargetFolderIgnore":['node_modules','unpackage','webpackPlugin','beforeHandle','build','config','loaders','dist'], // 忽略每次转换的时候清楚的目录
    "targetProjectName":"uniYaoNew", // 生成 uniapp项目名称
	"static":{
	  img:{
		origin:"images",
		to:"static/images"
	  },
	  style:{
		origin:"style",
		to:"static/style"
	  }
    },
    "styleComplier":"less",
    "rootPath":"src"
}