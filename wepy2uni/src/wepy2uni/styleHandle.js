const fs = require('fs-extra');
const path = require('path');

const utils = require('../utils/utils.js');
const pathUtil = require('../utils/pathUtil.js');
const helper = require('./style/helper.js');



/**
 * 处理css文件 
 * 1.内部引用的wxss文件修改为css文件
 * 2.修正引用的wxss文件的路径
 * 
 * @param {*} fileContent       css文件内容
 * @param {*} file_wxss         当前处理的文件路径
 */
async function styleHandle(v, filePath, filename, targetFilePath) {

        let styleContent = utils.decode(v.childNodes.toString());
       
        //去掉命名空间及标志
        styleContent = utils.restoreTagAndEventBind(styleContent);
        // 统计 组件样式里面存在 ID selectors
        styleContent = helper.pseudoClass(styleContent);     

        styleContent = utils.decode(styleContent);
        styleContent = utils.staticPathStyle(styleContent);
        
        //wxss文件所在目录
        let fileDir = path.dirname(filePath);
        let reg_import = /@import +['"](.*?\..*?)['"];*/g;  //应该没有写单引号的呗？(服输，还真可能有单引号)
        styleContent = styleContent.replace(reg_import, function (match, pos, orginText) {
                //先转绝对路径，再转相对路径
                let filePath = pos;
                filePath = pathUtil.relativePath(filePath, global.miniprogramRoot, fileDir);

                filePath = filePath.replace(/\.wxss/i, global.wpy2uniConfig.styleComplier?("."+global.wpy2uniConfig.styleComplier):".css");

                //虽可用path.posix.前缀来固定为斜杠，然而改动有点小多，这里只单纯替换一下
                return '@import "' + filePath + '";';
        });
        
        // import 引用 没有后缀的 补上后缀
        let reg_import1 = /@import +['"](.*?)['"];*/g;  //应该没有写单引号的呗？(服输，还真可能有单引号)
        styleContent = styleContent.replace(reg_import1, function (match, pos, orginText) {
                if(!(/\.less|\.scss|\.css/).test(pos)){
                  pos = pos + (global.wpy2uniConfig.styleComplier?("."+global.wpy2uniConfig.styleComplier):".css");
                }   
                
                return '@import "' + pos + '";';
        });

        //修复图片路径
        // background-image: url('../../images/bg_myaccount_top.png');
        // background-image: url('https://www.jxddsx.com/wxImgs/myPage/bg_myaccount_top.png');

        //低版本node不支持零宽断言这种写法，只能换成下面的写法(已测v10+是支持的)
        // let reg_url = /url\(['"](?<filePath>.*?)\.(?<extname>jpg|jpeg|gif|svg|png)['"]\)/gi;
        let reg_url = /url\(['"](.*?)\.(jpg|jpeg|gif|svg|png)['"]\)/gi;
        styleContent = styleContent.replace(reg_url, function (...args) {
                //const groups = args.slice(-1)[0];
                //let src = groups.filePath + "." + groups.extname;

                let src = args[1] + "." + args[2];

                let reg = /\.(jpg|jpeg|gif|svg|png)$/;  //test时不能加/g

                // //image标签，处理src路径
                //忽略网络素材地址，不然会转换出错
                if (src && !utils.isURL(src) && reg.test(src)) {
                        if (global.isVueAppCliMode) {
                                //
                        } else {
                                //static路径
                                let staticPath = path.join(global.miniprogramRoot, "static");

                                //当前处理文件所在目录
                                let wxssFolder = path.dirname(file_wxss);
                                var pFolderName = pathUtil.getParentFolderName(src);
                                // console.log("pFolderName ", pFolderName)
                                var fileName = path.basename(src);
                                // console.log("fileName ", fileName)
                                //
                                let filePath = path.resolve(staticPath, "./" + pFolderName + "/" + fileName);
                                src = path.relative(wxssFolder, filePath);
                                // 修复路径
                                src = src.split("\\").join("/");
                        }
                        if (!/^\//.test(src)) {
                                src = "./" + src;
                        }
                }
                return 'url("' + src + '")';
        });

        //
        let attrList = [];
        let attributes = v.attributes,
            hasLang = false;
        for (let index = 0; index < attributes.length; index++) {
                const obj = attributes[index];
                // 如果配置的是type 统一替换成lang 因为uniapp postcss 不能识别type
                obj.name = obj.name.replace(/type/,'lang');
                attrList.push(obj.name + '="' + obj.value + '"');
                if("lang" == obj.name){
                    hasLang = true;
                }
        }
        
        // 处理没有 配置 lang的情况
        if(attributes.length == 0 && !hasLang){
           attrList.push("lang="+(global.wpy2uniConfig.styleComplier?global.wpy2uniConfig.styleComplier:'less'));
        }

        // console.log(styleContent)
        styleContent = `<style ${attrList.join(" ")}>\r\n${styleContent}\r\n</style>`;
        try {
                return await new Promise((resolve, reject) => {
                        //////////////////////////////////////////////////////////////////////
                        resolve(styleContent);
                });
        } catch (err) {
                console.log(err);
        }
}

module.exports = styleHandle;
