// usings
var m = require('mithril');

// module itself
var params = {
  onupdated: null
};

function update(){
  for (var n in params){
    if (params.hasOwnProperty(n) && n !== 'onupdated'){
      delete params[n];
    }
  }

  location.hash.replace(/(\w+)(?:=([\w.-]+))?/g, (_, key, value) => {
    params[key] = value == null ? true : value;
  });

  params.onupdated && params.onupdated();
}

update();
window.addEventListener('hashchange', () => {
  m.startComputation();
  update();
  m.endComputation();
}, false);

module.exports = params;