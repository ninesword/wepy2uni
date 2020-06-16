# wepy2uni   
   
输入wepy项目路径，输出uni-app项目。
        
## 安装   
   
```js
$ npm install wepy2uni -g
```
   
## 升级版本   
   
```js
$ npm update wepy2uni -g
```
   
## 使用方法

```sh
Usage: im [options]

Options:

  -V, --version     output the version number [版本信息]
  -i, --input       the input path for wepy project [输入目录]
  -o, --output      the output path for uni-app project, which default value is process.cwd() [输出目录]
  -h, --help        output usage information [帮助信息]

```

Examples:

```sh
$ im -i wepyProject
```


## 已完成   
* 完成转换   
* 支持@tap混用   

    
## 报错指引
### ReferenceError: wepy is not defined   
uni-app里并不支持wepy，需要手动替换所使用的wepy.xxx()方法，工具现在还不支持wepy方法转换   

### 文件查找失败： '../../styles/variable'
导入的less或scss文件需要写明后缀名，否则查找不到

### [xmldom error]	element parse error: Error: invalid attribute:xxx   
直接忽略，不影响转换
   
   
## 更新记录   



## 参考资料   
0. [[AST实战]从零开始写一个wepy转VUE的工具](https://juejin.im/post/5c877cd35188257e3b14a1bc#heading-14)   此文获益良多   
1. [https://astexplorer.net/](https://astexplorer.net/)   AST可视化工具   
2. [Babylon-AST初探-代码生成(Create)](https://summerrouxin.github.io/2018/05/22/ast-create/Javascript-Babylon-AST-create/)   系列文章(作者是个程序媛噢~)   
3. [Babel 插件手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md#toc-inserting-into-a-container)  中文版Babel插件手册   
5. [Babel官网](https://babeljs.io/docs/en/babel-types)   有问题直接阅读官方文档哈   
   

## LICENSE
This repo is released under the [MIT](http://opensource.org/licenses/MIT).
