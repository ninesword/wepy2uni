module.exports = {
  pseudoClass:function(styleContent){
    styleContent = styleContent.replace(/([};]\s*)(?=(:before))\s*/g,"$1&")
    .replace(/([};]\s*)(?=(:after))\s*/g,"$1&")
    .replace(/([};]\s*)(?=(:nth-child))\s*/g,"$1&");
    return styleContent;
  }

}
