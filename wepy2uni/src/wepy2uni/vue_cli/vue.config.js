const path = require('path')
const cityConfig = require('./beforeHandle/cityConfig')
const isWin = /^win/.test(process.platform)
process.env.UNI_INPUT_DIR = path.join(__dirname, './src')

const strReplaceArr = [];
cityConfig.forEach((item)=>{
	if(item.search !== "__TABBAR_CONF__"){
		strReplaceArr.push(item); 
	}
})
const jsonReplaceArr = [];
cityConfig.map((item)=>{
	if(item.search === "__TABBAR_CONF__"){
		jsonReplaceArr.push({
			key:'tabBar',
			value:Object.prototype.toString.call(item.replace) === "[object Object]"?item.replace:JSON.parse(item.replace)
		}); 
	}
})

module.exports = {
	configureWebpack: {
		resolveLoader:{
		      modules:[
		        path.resolve(__dirname,'./loaders/rules'),
		        'node_modules'
		      ]
		},
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './'),
				'assets': path.resolve(__dirname, './')
			}
    },
    module:{
      rules:[{
        test: /(\.vue|\.js|\.json)$/,
        loader: 'webpack-replace-loader',
        options: {
            arr: strReplaceArr
        }
      },
	  {
		  test: /(pages\.json)$/,
		  loader: 'hjt-replace-json-loader',
		  options: {
			 arr:jsonReplaceArr
		  }
		}
      ]
    }
	}
}
