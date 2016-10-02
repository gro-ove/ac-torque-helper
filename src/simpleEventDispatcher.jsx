function SimpleEventDispatcher(){
  var listeners = {};

  function result(eventName, callback, _){
    if (listeners.hasOwnProperty(eventName)){
      listeners[eventName].push({ callback: callback, context: this });
    } else {
      listeners[eventName] = [ { callback: callback, context: this } ];
    }
  }

  result.remove = function (eventName, callback, _){
    if (!listeners.hasOwnProperty(eventName)) return;
    var list = listeners[eventName];
    for (var i = list.length - 1; i >= 0; i--){
      if (list[i].callback === callback) list.splice(i, 1);
    }
  };

  result.dispatch = function (eventName, data){
    if (!listeners.hasOwnProperty(eventName)) return;
    var list = listeners[eventName];
    var eventArgs = { name: eventName, data: data };
    for (var i = 0; i < list.length; i++){;
      list[i].callback.call(list[i].context, eventArgs);
    }
  };

  return result;
}

module.exports = SimpleEventDispatcher;