// usings
var m = require('mithril');
var v = require('lib/velocity');

var locales = require('src/locales');
require('res/css/dialog');

// module itself
var DialogsList = Array;

class DialogModel {
  constructor(){
    this.dialogs = new DialogsList();
  }

  addDialog(dialog){
    m.startComputation();
    this.dialogs.push(dialog);
    m.endComputation();
  }

  hasSimilarDialog(title){
    return this.dialogs.some(x => x.title == title);
  }

  deleteDialog(dialog){
    m.startComputation();
    var index = this.dialogs.indexOf(dialog);
    this.dialogs.splice(index, 1);
    m.endComputation();
  }

  closeLast(){
    var last = this.dialogs[this.dialogs.length - 1];
    last && last.hide();
  }
}

var dialogModel = new DialogModel();
var id = 0;

class Dialog {
  constructor(title, component){
    this.id = id++;
    this.title = title;
    this.component = component;
  }

  show(){
    dialogModel.addDialog(this);
  }

  showOnce(){
    if (!dialogModel.hasSimilarDialog(this.title)){
      this.show();
    }
  }

  hide(){
    if (this.deleted) return;
    m.startComputation();
    this.deleted = true;
    if (this.onclose) this.onclose();
    m.endComputation();
  }

  delete(){
    dialogModel.deleteDialog(this);
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

Dialog.component = {
  controller: () => {
    return {
      model: dialogModel
    }
  },
  view: ctrl => {
    return <div 
      class={ctrl.model.dialogs.length ? 'dialog_wrapper active' : 'dialog_wrapper'} 
      onclick={function(e){ e.target == this && ctrl.model.closeLast() }}>{
      ctrl.model.dialogs.map(dialog => <div class="dialog" key={dialog.id} config={dialog.deleted ? fadesOut(dialog.delete.bind(dialog)) : fadesIn}>
        <div class="dialog_title">
          <button class="dialog_close_button" onclick={dialog.hide.bind(dialog)}>×</button>
          {locales.current[dialog.title]}
        </div>
        { dialog.component }
      </div>)
    }</div>;
  }
}

module.exports = Dialog;