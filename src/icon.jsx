var data = require('res/shared/icon_48.png');

function init(){
  var links = document.getElementsByTagName('link');
  for (var i = 0; i < links.length; i++){
    if (/icon/.test(links[i].rel)){
      links[i].href = data;
    }
  }
}

module.exports = {
  data: data,
  init: init,
};