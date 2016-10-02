// usings
var m = require('mithril');
var SimpleEventDispatcher = require('src/simpleEventDispatcher');

// module itself
function HashParams(){
  this.onupdated = null;
}

HashParams.prototype.addEventListener = new SimpleEventDispatcher;
HashParams.prototype.removeEventListener = HashParams.prototype.addEventListener.remove;

var params = new HashParams();

function update(){
  for (var n in params){
    if (params.hasOwnProperty(n) && n !== 'onupdated'){
      delete params[n];
    }
  }

  location.hash.replace(/(\w+)(?:=([\w.-]+))?/g, (_, key, value) => {
    if (key === 'onupdated') return;
    params[key] = value == null ? true : value;
  });

  params.onupdated && params.onupdated();
  params.addEventListener.dispatch('updated');
}

update();
window.addEventListener('hashchange', () => {
  m.startComputation();
  update();
  m.endComputation();
}, false);

module.exports = params;