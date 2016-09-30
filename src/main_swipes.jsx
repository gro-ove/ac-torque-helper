var Swipe = require('lib/swipe');
var swipe;
const width = 600;

function update(){
  if (document.body.offsetWidth > width){
    if (swipe){
      swipe.kill();
      swipe = null;
      console.log('swipe mode disabled');
    }
  } else {
    if (swipe == null){
      swipe = Swipe(document.querySelector('.body_main'));
      console.log('swipe mode enabled');
    }
  }
}

function init(){
  update();
  window.addEventListener('resize', update, false);
}

module.exports = {
  init: init
};