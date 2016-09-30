// usings
var m = require('mithril');
var v = require('lib/velocity');

var locales = require('src/locales');
require('res/css/toast');

// module itself
var ToastsList = Array;

class ToastModel {
  constructor(){
    this.toasts = new ToastsList();
  }

  addToast(toast){
    m.startComputation();
    this.toasts.push(toast);
    m.endComputation();
  }

  hasSimilarToast(message){
    return this.toasts.some(x => x.message == message);
  }

  deleteToast(toast){
    m.startComputation();
    var index = this.toasts.indexOf(toast);
    this.toasts.splice(index, 1);
    m.endComputation();
  }
}

var toastModel = new ToastModel();
var id = 0;

class Toast {
  constructor(message, undoCallback){
    this.id = id++;
    this.message = message;
    this.undoCallback = undoCallback;
  }

  undo(){
    this.undoCallback();
    this.hide();
  }

  show(timeout){
    toastModel.addToast(this);
    setTimeout(this.hide.bind(this), timeout || 3000);
  }

  showOnce(timeout){
    if (!toastModel.hasSimilarToast(this.message)){
      this.show(timeout);
    }
  }

  hide(){
    if (this.deleted) return;
    m.startComputation();
    this.deleted = true;
    m.endComputation();
  }

  delete(){
    toastModel.deleteToast(this);
  }
}

var fadesIn = function(element, isInitialized, context) {
  if (!isInitialized) {
    element.style.opacity = 0;
    v(element, { opacity: 1 }, 150)
  }
};

var fadesOut = function(callback) {
  return function(element, isInitialized, context) {
    if (!isInitialized){
      callback();
      return;
    }

    m.redraw.strategy('none');
    v(element, { opacity: 0, translateY: '10px' }, {
      complete: function() {
        m.startComputation();
        callback();
        m.endComputation();
      },
      duration: 150
    });
  };
};

Toast.component = {
  controller: () => {
    return {
      model: toastModel
    }
  },
  view: ctrl => {
    return <div class="toast_wrapper">
      {
        ctrl.model.toasts.map(toast => <div class="toast" key={toast.id} config={toast.deleted ? fadesOut(toast.delete.bind(toast)) : fadesIn}>
          <span>{locales.current[toast.message]}</span>
          { toast.undoCallback ? <button onclick={toast.undo.bind(toast)}>{locales.current.undo}</button> : null }
        </div>)
      }
    </div>;
  }
}

module.exports = Toast;