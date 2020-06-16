var fs = require('fs')
var path = require('path')

/**
 * 复制文件
 * @param {*} srcPath  源文件
 * @param {*} tarPath  目标文件
 * @param {*} cb      回调函数
 */
var copyFile = function (srcPath, tarPath, cb) {
	var rs = fs.createReadStream(srcPath)
	rs.on('error', function (err) {
		if (err) {
			console.log('read error', srcPath)
		}
		cb && cb(err)
	})

	var ws = fs.createWriteStream(tarPath)
	ws.on('error', function (err) {
		if (err) {
			console.log('write error', tarPath)
		}
		cb && cb(err)
	})
	ws.on('close', function (ex) {
		cb && cb(ex)
	})

	rs.pipe(ws)
}

/**
 * 复制目录
 * @param {*} srcDir  源目录
 * @param {*} tarDir  目标目录
 * @param {*} cb      回调函数
 */
var copyFolder = function (srcDir, tarDir, cb) {
	fs.readdir(srcDir, function (err, files) {
		var count = 0
		var checkEnd = function () {
			++count == files.length && cb && cb()
		}

		if (err) {
			checkEnd()
			return
		}

		files.forEach(function (file) {
			var srcPath = path.join(srcDir, file)
			var tarPath = path.join(tarDir, file)

			fs.stat(srcPath, function (err, stats) {
				if (stats.isDirectory()) {
					console.log('mkdir', tarPath)
					fs.mkdir(tarPath, function (err) {
						if (err) {
							console.log(err)
							return
						}

						copyFolder(srcPath, tarPath, checkEnd)
					})
				} else {
					copyFile(srcPath, tarPath, checkEnd)
				}
			})
		})

		//为空时直接回调
		files.length === 0 && cb && cb()
	})
}

/**
 * 删除文件夹
 * @param {*} path  文件夹路径
 */
function delDir(path) {
	let files = [];
	if (fs.existsSync(path)) {
		files = fs.readdirSync(path);
		files.forEach((file, index) => {
			let curPath = path + "/" + file;
			if (fs.statSync(curPath).isDirectory()) {
				delDir(curPath); //递归删除文件夹
			} else {
				fs.unlinkSync(curPath); //删除文件
			}
		});
		fs.rmdirSync(path,{recursive :true});
	} else {
	}
}

/**
 * 清空目录，支持忽略指定目录或文件名，只处理一级目录，忽略子目录
 * @param {*} path   要搜索的目录
 * @param {*} ignore 忽略的目录名或文件名，暂只支持全字匹配，有需求再改为正则匹配
 */
function emptyDirSyncEx(folder, ignore) {
	fs.readdir(folder, function (err, files) {
		files.forEach(function (fileName) {
			var fileDir = path.join(folder, fileName);
			fs.stat(fileDir, function (err, stats) {
				if (stats.isDirectory()) {
					if (ignore.indexOf(fileName) === -1) delDir(fileDir);
				} else {
					fs.unlinkSync(fileDir);
				}
			})
		})
	})
}

/**
 * 获取无后缀名的文件名
 * @param {*} filePath  文件路径
 */
function getFileNameNoExt(filePath) {
	let extname = path.extname(filePath);
	return path.basename(filePath, extname);
}


/**
 * 粗暴获取父级目录的目录名
 * @param {*} filePath  文件路径
 */
function getParentFolderName(filePath) {
	//当前文件上层目录
	let pFolder = path.dirname(filePath);
	//粗暴获取上层目录的名称~~~
	return path.basename(pFolder);
}


/**
 * 同步创建多重目录
 * @param {*} dirname  目录路径
 */
function mkdirsSync(dirname) {
	if (fs.existsSync(dirname))
		return true;
	if (mkdirsSync(path.dirname(dirname))) {
		fs.mkdirSync(dirname);
		return true;
	}
	return false;
}

/**
 * 同步删除目录下所有文件
 * @param {*} dirname  目录路径
 */
function rmdirsSync(dirname) {
	if (!fs.existsSync(dirname))
		return true;
	var files = fs.readdirSync(dirname);
	if (!files)
		return true;
	files.forEach(function (file, index) {
		var curPath = path.join(dirname, file);
		if (fs.statSync(curPath).isFile())
			fs.unlinkSync(curPath);
	});
	return true;
}


/**
 * 判断文件是否包含在指定目录路径下
 * @param {*} folderArr  目录路径数组
 * @param {*} filePath   要查找的文件
 */
function isInFolder(folderArr, filePath) {
	var result = false;
	for (let index = 0; index < folderArr.length; index++) {
		const folder = folderArr[index];
		if (folder && filePath.indexOf(folder) > -1) {
			result = true;
			break;
		}
	}
	return result;
}
/**
 * 路径转换，转换根路径(路径前面为/)和当前路径(无/开头)为相对路径
 * @param {*} filePath  文件路径
 * @param {*} root      根目录
 * @param {*} fileDir   当前文件所在目录 
 */
function relativePath(filePath, root, fileDir) {
	if (!filePath) return filePath;
	if (/^\//.test(filePath)) {
		//如果是以/开头的，表示根目录
		filePath = path.join(root, filePath);
	} else {
		filePath = path.join(fileDir, filePath);
	}

	filePath = path.relative(fileDir, filePath);
	if (!/^[\.\/]/.test(filePath)) {
		filePath = "./" + filePath;
	}
	return filePath.split("\\").join("/");
}

module.exports = {
	copyFile,
	copyFolder,
	getFileNameNoExt,
	delDir,
	mkdirsSync,
	rmdirsSync,
	getParentFolderName,
	isInFolder,
	relativePath,
	emptyDirSyncEx,
};
