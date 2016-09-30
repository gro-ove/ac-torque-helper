var m = require('mithril');

m.withAceValue = function(callback){
  return function(){
    callback(this.env.editor.getValue());
  };
};

m.propCallback = function(store, callback){
  function prop(){
    if (arguments.length){
      var arg = arguments[0];
      if (arg !== store){
        store = arg;
        callback(store);
      }
    }
    return store;
  }

  prop.toJSON = function(){
    return store;
  }

  return prop;
};

m.propLocal = function(store, storageKey, callback){
  function load(){
    if (localStorage.hasOwnProperty(storageKey)){
      try {
        return JSON.parse(localStorage[storageKey]);
      } catch(e){}
    }
  }

  var loaded = load();
  if (loaded !== undefined){
    store = loaded;
  }

  function prop(){
    if (arguments.length){
      var arg = arguments[0];
      if (arg !== store){
        store = arg;
        localStorage[storageKey] = JSON.stringify(arg);
        callback && callback(store);
      }
    }
    return store;
  }

  prop.toJSON = function(){
    return store;
  }

  return prop;
};

m.pageTitle = function(value){
  document.title = value;
}

function isArraysEqual(a, b){
  if (a == null || b == null) return a === b;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++){
    if (a[i] != b[i]) return false;
  }
  return true;
}

var defaults = require('res/values/defaults');
require('lib/ace/ace');
require('lib/ace/theme-mono_industrial');
require('lib/ace/mode-ini');

require('res/shared/style');
require('res/css/base');
require('res/css/ace');
require('res/css/range');
require('res/css/icons');
require('res/css/scrollbar');

var icon = require('src/icon');
icon.init();

var locales = require('src/locales');
locales.init();

var settings = require('src/settings');
settings.init();

var charts = require('src/charts');
charts.init();

var AcTurbo = require('src/acTurbo');
var AcTurboController = require('src/acTurboController');
var AcUtils = require('src/acUtils');
var AcMath = require('src/acMath');
var Toast = require('src/toast');
var Dialog = require('src/dialog');

var createInput = require('src/main_createInput');
var swipes = require('src/main_swipes');

var TurboControllersList = Array;
var StateVariablesList = Array;

class TorqueHelperModel {
  constructor(powerLut, engineIni){
    this.transmissionLoss = m.propLocal(13, 'transmissionLoss');
    settings.oncurvechanged = this.curveMightChanged.bind(this);

    this.powerLut = m.propCallback(powerLut, this.powerLutChanged.bind(this));
    this.engineIni = m.propCallback(engineIni, this.engineIniChanged.bind(this));
    this.ctrlTurboInis = new TurboControllersList();
    this.stateVariables = new StateVariablesList();

    this.powerLutParsed = m.prop([]);
    this.engineIniParsed = m.prop({});
    this.turbosCount = m.prop(0);

    this.powerLutChanged(powerLut);
    this.engineIniChanged(engineIni);
    this.changeId = 0;

    this.preventSaving();
  }

  static createDefault(){
    var created = new TorqueHelperModel(defaults.powerLut, defaults.engineIni);
    created.addTurboController(0, defaults.controllerIni);
    created.preventSaving();
    return created;
  }

  static load(){
    try {
      var json = localStorage['data'];
      if (!json) return null;

      var data = JSON.parse(json);
      if (!data) return null;

      var loaded = new TorqueHelperModel(data.powerLut, data.engineIni);
      for (var i = 0; i < data.ctrlTurboInis.length; i++){
        var entry = data.ctrlTurboInis[i];
        loaded.addTurboController(entry.index, entry.data);
      }

      loaded.preventSaving();
      return loaded;
    } catch(e){
      return null;
    }
  }

  preventSaving(){
    clearTimeout(this._savingTimeout);
    this._savingTimeout = null;
  }

  curveMightChanged(){
    this.changeId++;
  }

  save(){
    this.curveMightChanged();

    if (this._savingTimeout != null) return;
    this._savingTimeout = setTimeout(() => {
      localStorage['data'] = JSON.stringify({
        powerLut: this.powerLut(),
        engineIni: this.engineIni(),
        ctrlTurboInis: this.ctrlTurboInis.map(x => ({
          index: x.index(),
          data: x.data()
        })),
      });

      this._savingTimeout = null;
    }, 300);
  }

  powerLutChanged(newValue){
    var parsed = AcUtils.parseLut(newValue);
    this.powerLutParsed(parsed);
    this.save();
  }

  engineIniChanged(newValue){
    var parsed = AcUtils.parseIni(newValue);
    this.engineIniParsed(parsed);

    var count = 0;
    for (var n in parsed) count++;
    this.turbosCount(count);

    this.save();
  }

  addTurboController(index = -1, data = ''){
    if (index == -1){
      index = this.ctrlTurboInis.length > 0 ?
          +this.ctrlTurboInis[this.ctrlTurboInis.length - 1].index() + 1 :
          0;
    }

    var created = new TurboControllerModel(index, data, this);
    this.ctrlTurboInis.push(created);
    created.init();
    return created;
  }

  getTurboController(index = 0){
    var list = this.ctrlTurboInis;
    for (var i = 0; i < list.length; i++){
      if (list[i].index() == index) return list[i];
    }
  }

  getTurboControllerById(id = 0){
    var list = this.ctrlTurboInis;
    for (var i = 0; i < list.length; i++){
      if (list[i].id == id) return list[i];
    }
  }

  deleteTurboController(turboController){
    var index = this.ctrlTurboInis.indexOf(turboController);
    this.ctrlTurboInis.splice(index, 1);
    this.save();
    this.checkTurboControllersIndexes();
    this.updateStateVariables();

    new Toast('turboControllerDeleted', () => {
      this.ctrlTurboInis.splice(index, 0, turboController);
      this.save();
      this.checkTurboControllersIndexes();
      this.updateStateVariables();
    }).show();
  }

  checkTurboControllersIndexes(){
    var existing = {};
    var dublicates = {};

    var list = this.ctrlTurboInis;
    for (var i = 0; i < list.length; i++){
      var x = list[i].index();
      if (existing[x]){
        dublicates[x] = true;
      } else {
        existing[x] = true;
      }
    }

    for (var i = 0; i < list.length; i++){
      list[i].dublicateIndex = !!dublicates[list[i].index()];
    }
  }

  updateStateVariables(){
    var stateVariables = this.stateVariables;
    stateVariables.length = 0;

    var list = this.ctrlTurboInis;
    var added = {};

    for (var i = 0; i < list.length; i++){
      var keys = list[i].stateVariablesKeys;
      for (var j = 0; j < keys.length; j++){
        var entry = AcTurboController.getStateVariableEntry(keys[j]);
        var key = entry.key;

        if (added[key]) continue;
        added[key] = true;

        stateVariables.push({
          key: key,
          value: m.propLocal(entry.value, 'input' + key, v => {
            entry.value = v;
            this.curveMightChanged();
          })
        });
      }
    }
  }

  handleFile(name, data, single){
    if (/power/.test(name) || single && /^\d+(?:\.\d*)?\|\d+/.test(data)){
      this.powerLut(data);
    } else if (/engine/.test(name) || single && /\[TURBO_|\[ENGINE_/.test(data)){
      this.engineIni(data);
    } else if (/ctrl_turbo(\d+)/.test(name)){
      var index = RegExp.$1;

      var c = this.getTurboController(index);
      if (c != null){
        c.data(data);
        this.save();
      } else {
        this.addTurboController(index, data);
      }
    } else if (single && /\[CONTROLLER_/.test(data)){
      this.addTurboController(-1, data);
    } else {
      return false;
    }

    return true;
  }

  handleFiles(files){
    if (!files || !files.length) return;
    Promise.all(
      [].map.call(files, f => new Promise((r, j) => {
        var reader = new FileReader();
        reader.onload = e => {
          r({ name: f.name, data: e.target.result });
        };
        reader.readAsText(f);
      }))
    ).then(all => {
      m.startComputation();
      var notRecognized = [].filter.call(all, f => !this.handleFile(f.name, f.data, all.length == 1));
      m.endComputation();

      if (notRecognized.length && all.length < 4){
        console.warn(notRecognized);
        new Toast('cannotRecognizeType').showOnce();
      }
    });
  }

  listenForDrops(){
    var dragActive;
    function setDragActive(){
      if (!dragActive){
        document.querySelector('.drag').classList.add('active');
        dragActive = true;
      }
    }

    function unsetDragActive(){
      if (dragActive){
        document.querySelector('.drag').classList.remove('active');
        dragActive = false;
      }
    }

    var leaveTimeout;
    document.body.ondragover = e => {
      clearTimeout(leaveTimeout);
      setDragActive();

      e.dataTransfer.dropEffect = 'copy';
      e.preventDefault();
    };

    document.body.ondragleave = e => {
      clearTimeout(leaveTimeout);
      leaveTimeout = setTimeout(unsetDragActive, 300);
    };

    document.body.ondrop = e => {
      unsetDragActive();
      e.preventDefault();

      if (!e.handled){
        this.handleFiles(e.dataTransfer.files);
      }
    };
  }

  copyUiData(){
    var transmissionLoss = 1.0 - +this.transmissionLoss() / 100.0;
    if (Number.isNaN(transmissionLoss)){
      console.warn('transmissionLoss is invalid');
      return;
    }

    var power = getTorqueValues(settings.pointsMode(), settings.steps(), this.powerLutParsed(), this.engineIniParsed(), this.ctrlTurboInis);
    var value = JSON.stringify({
      torqueCurve: power.map(x => [ x[0], +(x[1] * transmissionLoss).toFixed(1) ]),
      powerCurve: power.map(x => [ x[0], +AcMath.torqueToPower(x[1] * transmissionLoss, x[0]).toFixed(1) ])
    }).slice(1, -1).replace(/(?="p)/, '\n');

    var textarea = document.createElement('textarea');
    textarea.setAttribute('style', 'position:fixed;top:-9999px');
    document.body.appendChild(textarea);
    textarea.value = value;
    textarea.select();

    try {
      if (document.execCommand('copy')) {
        new Toast('copiedToClipboard').show();
      } else {
        prompt(locales.current.copyToClipboard, value);
      }
    } catch (e) {
      prompt(locales.current.copyToClipboard, value);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  toZipArchive(){
    Promise.all([
      new Promise((r, j) => {
        require([ 'lib/fileSaver' ], require => r(require('lib/fileSaver')));
      }),
      new Promise((r, j) => {
        require([ 'JSZip' ], require => r(require('JSZip')));
      })
    ]).then(all => {
      var JSZip = all[1];
      var saveAs = all[0];

      var zip = new JSZip();
      zip.file('power.lut', this.powerLut());
      zip.file('engine.ini', this.engineIni());

      for (var i = 0; i < this.ctrlTurboInis.length; i++){
        var entry = this.ctrlTurboInis[i];
        zip.file(`ctrl_turbo${entry.index()}.ini`, entry.data());
      }

      zip.generateAsync({ type: 'blob' }).then(content => {
        saveAs(content, 'actorquehelper_data.zip');
        new Toast('savedAsZipArchive').show();
      });
    });
  }

  toImage(){
    var values = getTorqueValues(settings.pointsMode(), 400, this.powerLutParsed(), 
        this.engineIniParsed(), this.ctrlTurboInis);
    charts.export(values, null, 1024, 768, () => {
      new Toast('imageExported').show();
    });
  }
}

var turboControllerId = 0;

class TurboControllerModel {
  constructor(index, data, torqueHelperModel){
    this.id = turboControllerId++;
    this.parent = torqueHelperModel;

    this.index = m.propCallback(index, this.indexChanged.bind(this));
    this.data = m.propCallback(data, this.dataChanged.bind(this));
    this.dataParsed = m.prop({});
    this.stateVariablesKeys = [];
  }

  init(){
    this.indexChanged(this.index());
    this.dataChanged(this.data());
  }

  getFilename(){
    return `ctrl_turbo${this.index()}.ini`;
  }

  indexChanged(newValue){
    if (this.parent){
      this.parent.save();
      this.parent.checkTurboControllersIndexes();
    }
  }

  dataChanged(newValue){
    var parsed = AcUtils.parseIni(newValue);
    this.dataParsed(parsed);

    var keys = AcTurboController.getInputKeys(parsed);
    if (!isArraysEqual(keys, this.stateVariablesKeys)){
      this.stateVariablesKeys = keys;
      this.parent && this.parent.updateStateVariables();
    }

    if (this.parent){
      this.parent.save();
    }
  }
}

var interpolateDebug = null;
// interpolateDebug = require('src/acUtils_interpolateDebug');

function getTorqueValues(pointsMode, steps, powerLutParsed, engineIniParsed, ctrlTurboInis){
  var ctrlTurboInisParsed = ctrlTurboInis.reduce((a, b) => (a[b.index()] = b.dataParsed(), a), {});
  var power;

  var limit = settings.engineIniRpmLimit() && engineIniParsed['ENGINE_DATA'] ? +engineIniParsed['ENGINE_DATA']['LIMITER'] : Number.NaN;
  if (!limit || Number.isNaN(limit)){
    limit = +((powerLutParsed[powerLutParsed.length - 1] || {})[0] || 0);
  }

  if (pointsMode){
    power = powerLutParsed.filter(x => x[0] <= limit);
  } else {
    power = [];

    var prev = 0, prevJ = 0;
    for (var i = 0; i <= steps; i ++){
      var rpm = limit * i / steps
      for (var j = prevJ; j < powerLutParsed.length; j++){
        var p = powerLutParsed[j];
        if (p[0] > rpm){
          prevJ = j - 1;
          break;
        } else if (p[0] > prev && p[0] < rpm){
          power.push(p);
        }
      }

      power.push([ rpm, AcUtils.interpolateLinear(powerLutParsed, rpm) ]);
      prev = rpm;
    }
  }

  return AcTurbo.considerTurbos(power, engineIniParsed, ctrlTurboInisParsed);
}

var torqueHelper = {
  controller: () => {
    var model = TorqueHelperModel.load() || TorqueHelperModel.createDefault();
    model.listenForDrops();

    var chart, changeId = -1;
    function plotter(){
      if (interpolateDebug) return interpolateDebug;
      return (element, isInitialized) => {
        if (isInitialized && changeId == model.changeId && !chart.updateRequired()) return;

        var values = getTorqueValues(settings.pointsMode(), settings.steps(), model.powerLutParsed(), 
            model.engineIniParsed(), model.ctrlTurboInis);

        if (isInitialized){
          chart.update(values);
        } else {
          chart = charts.render(element, values);
        }

        changeId = model.changeId;
      };
    }

    function highlighter(property, mode /* = 'ace/mode/ini'*/){
      return (element, isInitialized) => {
        element.style.fontSize = settings.fontSize() + 'px';
        if (!isInitialized){
          var editor = ace.edit(element);
          editor.$blockScrolling = Infinity;
          editor.setTheme(/theme=(\w+)/.test(location.hash) ? `ace/theme/${RegExp.$1}` : 'ace/theme/mono_industrial');
          editor.getSession().setMode(mode || 'ace/mode/ini');
          editor.getSession().setUseWrapMode(true);
          editor.setValue(property(), 1);
          editor.on('input', () => element.onchange());
        } else {
          var value = property();
          var editor = element.env.editor;
          if (value != editor.getValue()){
            element.env.editor.setValue(value, 1);
          }
        }
      };
    }

    function handleDrop(property){
      return e => {
        var files = e.dataTransfer.files;
        if (files.length != 1) return;

        var reader = new FileReader();
        reader.onload = function(e) {
          if (e.target.result != property()){
            m.startComputation();
            property(e.target.result);
            m.endComputation();
          }
        };
        reader.readAsText(files[0]);

        e.preventDefault();
        e.handled = true;
      };
    }

    var selectedTab = m.propLocal('power.lut', 'selectedTab');
    var previousTab = m.prop(null);

    function selectTab(tabName){
      if (tabName == selectedTab()) return;
      previousTab(selectedTab());
      selectedTab(tabName);
    }

    function tabClick(e){
      selectTab(this.getAttribute('data-key'));
      e.preventDefault();
    }

    function addController(){
      selectTab(model.addTurboController(-1, defaults.controllerIni).id);
    }

    return {
      model: model,
      addTurboController: () => model.addTurboController(-1, defaults.controllerIni),
      deleteTurboController: c => model.deleteTurboController(c),
      plotter: plotter,
      highlighter: highlighter,
      handleDrop: handleDrop,

      /* tabs mode */
      selectedTab: selectedTab,
      previousTab: previousTab,
      tabClick: tabClick,
      addController: addController,
    }
  },

  viewTurboControllerDisplayName: (ctrl, turboController, index) => {
    var warning = turboController.dublicateIndex ? locales.current.dublicateIndex : 
        !ctrl.model.engineIniParsed()[`TURBO_${turboController.index()}`] ? locales.current.noTurboForController : null;
    return [
      warning ? <i class="icon icon-warning" style="float:left;margin-right:2px" title={locales.current.dublicateIndex} /> : null,
      <span>ctrl_turbo<input type="number" min="0" max="10" oninput={m.withAttr('value', turboController.index)} value={turboController.index()} style="width:40px" />.ini</span>
    ];
  },

  viewEditSectionStackMode: ctrl => {
    return <div class="main_section stack_section">
      <div class="file_section">
        <h6>power.lut:</h6>
        <div 
          title={locales.current.dontForgetTransmissionLoss}
          config={ctrl.highlighter(ctrl.model.powerLut)}
          onchange={m.withAceValue(ctrl.model.powerLut)} />
      </div>

      <div class="file_section">
        <h6>engine.ini:</h6>
        <div 
          title={locales.current.turboSectionsOnlyNeeded}
          config={ctrl.highlighter(ctrl.model.engineIni)} 
          onchange={m.withAceValue(ctrl.model.engineIni)} />
      </div>

      {ctrl.model.ctrlTurboInis.map((turboController, index) => 
        <div class="file_section" key={turboController.id}>
          <button class="h6_button" onclick={ctrl.deleteTurboController.bind(this, turboController)}>{locales.current.delete}</button>
          <h6>{
            turboController.dublicateIndex ?
                <i class="icon icon-warning" style="float:left;margin-right:4px" title={locales.current.dublicateIndex} /> :
            !ctrl.model.engineIniParsed()[`TURBO_${turboController.index()}`] ? 
                <i class="icon icon-warning" style="float:left;margin-right:4px" title={locales.current.noTurboForController} /> : 
              null }ctrl_turbo<input type="number" min="0" max="10" oninput={m.withAttr('value', turboController.index)} value={turboController.index()} style="width:40px" />.ini:</h6>
          <div 
            config={ctrl.highlighter(turboController.data)} 
            onchange={m.withAceValue(turboController.data)} />
        </div>
      )}

      <div class="main_section_buttons">
        <button class="secondary" onclick={ctrl.addTurboController}>{locales.current.addController}</button>
        <button class="secondary" onclick={ctrl.model.toZipArchive.bind(ctrl.model)}>{locales.current.getZipped}</button>
      </div>

      <div class="commentary" style="position:relative">
        {locales.current.pasteDataOfSpecificFiles}
        <form id="file_form">
          <input 
            type="file"
            multiple 
            style="position:absolute;top:0;left:0;margin:0;padding:0;opacity:0;width:100%;height:100%;cursor:pointer"
            title="Select one or several files"
            onchange={e => {
              ctrl.model.handleFiles(e.target.files);
              e.target.parentNode.reset();
            }} />
        </form>
      </div>
    </div>;
  },

  viewEditSectionTabsMode: ctrl => {
    function getEditorBlock(){
      switch (ctrl.selectedTab()){
        case 'power.lut':
          return <div 
              title={locales.current.dontForgetTransmissionLoss}
              config={ctrl.highlighter(ctrl.model.powerLut)}
              onchange={m.withAceValue(ctrl.model.powerLut)} />;

        case 'engine.ini':
          return <div 
              title={locales.current.turboSectionsOnlyNeeded}
              config={ctrl.highlighter(ctrl.model.engineIni)} 
              onchange={m.withAceValue(ctrl.model.engineIni)} />;

        default:
          var turboController = ctrl.model.getTurboControllerById(ctrl.selectedTab());
          if (!turboController){
            ctrl.selectedTab(ctrl.previousTab() || 'power.lut');
            ctrl.previousTab(null);
            return getEditorBlock();
          }

          return turboController ? <div 
              config={ctrl.highlighter(turboController.data)} 
              onchange={m.withAceValue(turboController.data)} /> : null
      }
    }

    return <div class="main_section tabs_section">
      <table style="width:100%;height:100%"><tr><td style="height:auto">
        <div class="tabs">
          <a 
            href="#" 
            data-key="power.lut" 
            class={ctrl.selectedTab() == 'power.lut' ? 'ghost_simple active' : 'ghost_simple'} 
            onclick={ctrl.tabClick} />
          <a 
            href="#" 
            data-key="engine.ini" 
            class={ctrl.selectedTab() == 'engine.ini' ? 'ghost_simple active' : 'ghost_simple'} 
            onclick={ctrl.tabClick} />
          {ctrl.model.ctrlTurboInis.map((turboController, index) => <a 
            href="#" 
            data-key={turboController.id} 
            class={ctrl.selectedTab() == turboController.id ? 'ghost_complex active' : 'ghost_complex'} 
            onclick={ctrl.tabClick} 
            key={turboController.id}>
            <span class="actual">
              { torqueHelper.viewTurboControllerDisplayName(ctrl, turboController, index) }
              <button onclick={e => {
                ctrl.deleteTurboController(turboController);
                e.preventDefault();
                e.stopPropagation();
              }}>×</button>
            </span>
            <span class="ghost">
              { torqueHelper.viewTurboControllerDisplayName(ctrl, turboController, index) }
              <button onclick={e => {
                ctrl.deleteTurboController(turboController);
                e.preventDefault();
                e.stopPropagation();
              }}>×</button>
            </span>
          </a> )}
        </div>
      </td></tr><tr><td style="height:100%;width:100%;position:relative">
        {getEditorBlock()}
      </td></tr><tr><td style="height:auto">
        <div class="main_section_buttons">
          <button class="secondary" onclick={ctrl.addController}>{locales.current.addController}</button>
          <button class="secondary" onclick={ctrl.model.toZipArchive.bind(ctrl.model)}>{locales.current.getZipped}</button>
        </div>

        <div class="commentary" style="position:relative">
          {locales.current.pasteDataOfSpecificFiles}
          <form id="file_form">
            <input 
              type="file"
              multiple 
              style="position:absolute;top:0;left:0;margin:0;padding:0;opacity:0;width:100%;height:100%;cursor:pointer"
              title="Select one or several files"
              onchange={e => {
                ctrl.model.handleFiles(e.target.files);
                e.target.parentNode.reset();
              }} />
          </form>
        </div>
       </td></tr></table>
    </div>;
  },

  view: ctrl => {
    return [
      m.pageTitle(locales.current.acTorqueHelper),
      settings.pictureBackground() ? <div class="background" /> : null,
      settings.fullScreenMode() ? <div class="header_inline">
        {settings.buttonComponent}
      </div> : <div class="header">
        {settings.buttonComponent}
        {locales.component}
        <a href="/">
          <img src={icon.data} />
          <span class="title">{locales.current.acTorqueHelper}</span>
        </a>
      </div>,
      <div class="body_main swipe">
        <div class="main_sections_wrapper swipe-wrap">

          {settings.tabsLayout() ? torqueHelper.viewEditSectionTabsMode(ctrl) : torqueHelper.viewEditSectionStackMode(ctrl)}

          <div class="main_section">
            <h1>{locales.current.result}</h1>
            {ctrl.model.stateVariables.length ? 
              <div class="file_section additional_padding" style="margin-bottom:16px">
                {
                  ctrl.model.stateVariables.map(x => {
                    var params = AcTurboController.getInputParams(x.key);
                    return createInput.prop(locales.current['input' + x.key] || x.key, x.value, params.min, params.max, params.step);
                  })
                }</div> : null }

            <div
              style="height:400px"
              config={ctrl.plotter()} />

            <div class="file_section additional_padding">
              <h6>ui_car.json:</h6>
              { createInput.prop(locales.current.transmissionLoss, ctrl.model.transmissionLoss, 0, 100, 1, '%') }
            </div>

            <div class="main_section_buttons">
              <button class="secondary" onclick={ctrl.model.copyUiData.bind(ctrl.model)}>{locales.current.copyToClipboard}</button>
              <button class="secondary" onclick={ctrl.model.toImage.bind(ctrl.model)}>{locales.current.saveCurves}</button>
            </div>
          </div>

        </div>
      </div>,
      // settings.settingsComponent,
      <div class="drag">{locales.current.dropHere}</div>,
      Dialog.component,
      Toast.component,
    ];
  }
};

m.mount(document.body, torqueHelper);
swipes.init();