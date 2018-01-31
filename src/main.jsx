// specially for messed up mithril or webbrowsers or whatever is behind it
// I hate web
if (!('event' in window)){
  window.event = {};
}

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
    callback && callback(store);
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

var AcController = require('src/acTurboController');
var AcTurbo = require('src/acTurbo');
var AcErs = require('src/acErs');
var AcTurboController = require('src/acTurboController');
var AcErsController = require('src/acErsController');
var AcUtils = require('src/acUtils');
var AcMath = require('src/acMath');
var Toast = require('src/toast');
var Dialog = require('src/dialog');

var resultingTorqueCurve = require('src/resultingTorqueCurve');
var hashParams = require('src/hashParams');
var createInput = require('src/main_createInput');
var swipes = require('src/main_swipes');

var TurboControllersList = Array;
var ErsControllersList = Array;
var StateVariablesList = Array;

class TorqueHelperModel {
  constructor(powerLut, engineIni, ersIni){
    this._loading = true;

    this.transmissionLoss = m.propLocal(13, 'transmissionLoss');
    settings.oncurvechanged = this.curveMightChanged.bind(this);

    this.powerLut = m.propCallback(powerLut, this.powerLutChanged.bind(this));
    this.engineIni = m.propCallback(engineIni, this.engineIniChanged.bind(this));
    this.ctrlTurboInis = new TurboControllersList();
    this.ersIni = m.propCallback(ersIni, this.ersIniChanged.bind(this));
    this.ctrlErsInis = new ErsControllersList();
    this.stateVariables = new StateVariablesList();

    this.powerLutParsed = m.prop([]);
    this.engineIniParsed = m.prop({});
    this.turbosCount = m.prop(0);
    this.ersIniParsed = m.prop({});
    this.ersControllersNames = [];
    this.ersSelectedController = m.propLocal(AcErs.ERS_ID_DEFAULT, 'ersId', this.curveMightChanged.bind(this));

    this.powerLutChanged(powerLut);
    this.engineIniChanged(engineIni);
    this.ersIniChanged(ersIni);
    this.changeId = 0;

    this._loading = false;
    this.preventSaving();
  }

  static createDefault(){
    var created = new TorqueHelperModel(defaults.powerLut, defaults.engineIni);
    created.addTurboController(0, defaults.turboControllerIni);
    created.preventSaving();
    return created;
  }

  static load(){
    try {
      var json = localStorage['data'];
      if (!json) return null;

      var data = JSON.parse(json);
      if (!data) return null;

      // model with main pieces of data
      var loaded = new TorqueHelperModel(data.powerLut, data.engineIni, data.ersIni);
      loaded._loading = true;

      // turbo controllers
      for (var i = 0; i < data.ctrlTurboInis.length; i++){
        var entry = data.ctrlTurboInis[i];
        loaded.addTurboController(entry.index, entry.data);
      }

      // ers controllers
      for (var i = 0; i < data.ctrlErsInis.length; i++){
        var entry = data.ctrlErsInis[i];
        loaded.addErsController(entry.index, entry.data);
      }

      loaded._loading = false;

      loaded.updateStateVariables();
      loaded.updateErsControllersNames();
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
        ersIni: this.ersIni(),
        ctrlTurboInis: this.ctrlTurboInis.map(x => ({
          index: x.index(),
          data: x.data()
        })),
        ctrlErsInis: this.ctrlErsInis.map(x => ({
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

  ersIniChanged(newValue){
    var parsed = newValue == null ? null : AcUtils.parseIni(newValue);
    this.ersIniParsed(parsed);
    this.save();
  }

  updateErsControllersNames(){
    this.ersControllersNames = this.ctrlErsInis.map((x, i) => (x.dataParsed()['HEADER'] || {})['NAME'] || `Controller #${i + 1}`);
    if (!this._loading && this.ersSelectedController() > this.ersControllersNames.length){
      this.ersSelectedController(AcErs.ERS_ID_DEFAULT);
    }
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
    turboIdFix++;
    return created;
  }

  addErsController(index = -1, data = ''){
    if (index == -1){
      index = this.ctrlErsInis.length > 0 ?
          +this.ctrlErsInis[this.ctrlErsInis.length - 1].index() + 1 :
          0;
    }

    var created = new ErsControllerModel(index, data, this);
    this.ctrlErsInis.push(created);
    created.init();
    return created;
  }

  addErs(data = ''){
    this.ersIni(data);
  }

  deleteErs(){
    this.ersIni(null);
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

  getErsController(index = 0){
    var list = this.ctrlErsInis;
    for (var i = 0; i < list.length; i++){
      if (list[i].index() == index) return list[i];
    }
  }

  getErsControllerById(id = 0){
    var list = this.ctrlErsInis;
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
    turboIdFix++;

    new Toast('turboControllerDeleted', () => {
      this.ctrlTurboInis.splice(index, 0, turboController);
      this.save();
      this.checkTurboControllersIndexes();
      this.updateStateVariables();
    }).show();
  }

  deleteErsController(ersController){
    var index = this.ctrlErsInis.indexOf(ersController);
    this.ctrlErsInis.splice(index, 1);
    this.save();
    this.checkErsControllersIndexes();
    this.updateStateVariables();
    this.updateErsControllersNames();

    new Toast('ersControllerDeleted', () => {
      this.ctrlErsInis.splice(index, 0, ersController);
      this.save();
      this.checkErsControllersIndexes();
      this.updateStateVariables();
      this.updateErsControllersNames();
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

  checkErsControllersIndexes(){
    var existing = {};
    var dublicates = {};

    var list = this.ctrlErsInis;
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

    var added = {};

    var _this = this;
    function add(keys){
      for (var j = 0; j < keys.length; j++){
        var entry = AcController.getStateVariableEntry(keys[j]);
        var key = entry.key;

        if (added[key]) continue;
        added[key] = true;

        stateVariables.push({
          key: key,
          value: m.propLocal(entry.value, 'input' + key, (function (t, e, v){
            e.value = +v;
            t.curveMightChanged();
          }).bind(null, _this, entry))
        });
      }
    }

    var turboList = this.ctrlTurboInis;
    for (var i = 0; i < turboList.length; i++){
      add(turboList[i].stateVariablesKeys);
    }

    if (this.ersIni()){
      add([ 'GAS' ]);

      var ersList = this.ctrlErsInis;
      for (var i = 0; i < ersList.length; i++){
        add(ersList[i].stateVariablesKeys);
      }
    }
  }

  includeLutsCallback(data, callback){
    return data.replace(/(\b(?:[A-Z_]+_CURVE|LUT)\s*=\s*)(?![\(\[|=])([\.\w-() ]+\.lut)/g, 
      (_, prefix, name) => {
        name = name.toLowerCase();

        var data = callback(name);
        if (data != null){
          return prefix + '(|' + AcUtils.parseLut(data).map(x => x.join('=')).join('|') + '|)';
        }

        console.warn('not found: ' + name);
        return prefix + name;
      });
  }

  includeLuts(data, allFiles){
    if (allFiles == null) return data;
    return this.includeLutsCallback(data, name => {
      for (var i = 0; i < allFiles.length; i++){
        var file = allFiles[i];
        if (file.name.toLowerCase() == name){
          return file.data;
        }
      }
    });
  }

  handleFile(name, data, single, allFiles){
    if (/\bpower\b/.test(name) || single && /^\d+(?:\.\d*)?\|\d+/.test(data)){
      this.powerLut(data);
    } else if (/\bengine\b/.test(name) || single && /\[TURBO_|\[ENGINE_/.test(data)){
      this.engineIni(data);
    } else if (/\bers\b/.test(name) || single && /\[KINETIC/.test(data)){
      this.ersIni(this.includeLuts(data, allFiles));
    } else if (/ctrl_turbo(\d+)/.test(name)){
      var index = RegExp.$1;

      var c = this.getTurboController(index);
      if (c != null){
        c.data(data);
        this.save();
      } else {
        this.addTurboController(index, data);
      }
    } else if (/ctrl_ers_(\d+)/.test(name)){
      var index = RegExp.$1;

      var c = this.getErsController(index);
      if (c != null){
        c.data(this.includeLuts(data, allFiles));
        this.save();
      } else {
        this.addErsController(index, this.includeLuts(data, allFiles));
      }
    } else if (single && /\[CONTROLLER_/.test(data)){
      if (/\[HEADER_/.test(data) && /\bNAME\s*=/.test(data)){
        this.addErsController(-1, this.includeLuts(data, allFiles));
      } else {
        this.addTurboController(-1, data);
      }
    } else if (/ers(?![a-z]).*\.lut/.test(name)){
      var ers = this.ctrlErsInis;
      for (var i = 0; i < ers.length; i++){
        var original = ers[i].data();
        var updated = this.includeLutsCallback(original, n => {
          if (name.toLowerCase() == n){
            return data;
          }
        });
        
        if (updated != original){
          ers[i].data(updated);
        }
      }
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
      var notRecognized = [].filter.call(all, f => !this.handleFile(f.name, f.data, all.length == 1, all));
      m.endComputation();

      if (notRecognized.length < all.length){        
        this.updateStateVariables();
        this.updateErsControllersNames();
      }else {
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

  toObject(){
    return {
      powerLutParsed: this.powerLutParsed(),
      engineIniParsed: this.engineIniParsed(),
      ersIniParsed: this.ersIniParsed(),
      ctrlTurboInis: this.ctrlTurboInis,
      ctrlErsInis: this.ctrlErsInis,
      ersSelectedController: this.ersSelectedController()
    };
  }

  copyUiData(){
    var transmissionLoss = 1.0 - +this.transmissionLoss() / 100.0;
    if (isNaN(transmissionLoss)){
      console.warn('transmissionLoss is invalid');
      return;
    }

    var power = resultingTorqueCurve.get(settings.pointsMode(), settings.steps(), this.toObject());
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

      var lutNames = [];
      function extractLut(entryData, lutFinderFn){
        var iniParsed = AcUtils.parseIni(entryData);

        lutFinderFn(iniParsed).forEach(pair => {
          var sectionLut = pair.value;
          var lutNameBase = pair.lutName;

          if (!/\.lut\s*$/i.test(sectionLut)){
            var lutName = lutNameBase;
            for (var j = 2; j < 999; j++){
              if (lutNames.indexOf(lutName) !== -1){
                lutName = lutName.replace(/\.lut/, `_${j}.lut`);
              }
            }

            zip.file(lutName, sectionLut.replace(/^\(\|?|\|?\)$/g, '').replace(/\|/g, '\n').replace(/=/g, '|'));
            entryData = entryData.replace(sectionLut, lutName);
          }
        });

        return entryData;
      }

      if (this.ersIni()){
        zip.file('ers.ini', extractLut(this.ersIni(), iniParsed => {
          var section = iniParsed['KINETIC'];
          if (!section) return [];

          return [
            { value: section['TORQUE_CURVE'], lutName: 'kers_torque.lut' },
            { value: section['COAST_CURVE'], lutName: 'kers_torque_coast.lut' },
          ];
        }));

        for (var i = 0; i < this.ctrlErsInis.length; i++){
          var entry = this.ctrlErsInis[i];

          var entryData = extractLut(entry.data(), iniParsed => {
            var found = [];
            for (var k = 0, section; section = iniParsed[`CONTROLLER_${k}`]; k++) {
              found.push({
                value: section['LUT'],
                lutName: `ers${entry.index()}_${section['INPUT'].replace(/\W+/g, '_').replace(/^_|_$|_KMH/g, '').toLowerCase()}.lut`
              });
            }
            return found;
          });

          zip.file(`ctrl_ers_${entry.index()}.ini`, entryData);
        }
      }

      function dateId() {
        return new Date().toISOString().replace(/\W/g, '').replace(/[A-Z]/g, '-').replace(/\D$/, '');
      }

      zip.generateAsync({ type: 'blob' }).then(content => {
        saveAs(content, 'actorquehelper_data_' + dateId() + '.zip');
        new Toast('savedAsZipArchive').show();
      });
    });
  }

  toImage(){
    var values = settings.splitGraph() ? 
        resultingTorqueCurve.getSplitted(settings.pointsMode(), 400, this.toObject()) :
        resultingTorqueCurve.get(settings.pointsMode(), 400, this.toObject());
    charts.export(values, null, 1024, 768, e => {
      if (e == null){
        new Toast('imageExported').show();
      } else {        
        new Toast('imageExportFailed').show();
      }
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

    var keys = AcController.getInputKeys(parsed);
    if (!isArraysEqual(keys, this.stateVariablesKeys)){
      this.stateVariablesKeys = keys;
      this.parent && this.parent.updateStateVariables();
    }

    if (this.parent){
      this.parent.save();
    }
  }
}

class ErsModel {
  constructor(data, torqueHelperModel){
    this.parent = torqueHelperModel;
    this.data = m.propCallback(data, this.dataChanged.bind(this));
    this.dataParsed = m.prop({});
  }

  init(){
    this.dataChanged(this.data());
  }

  getFilename(){
    return `ers.ini`;
  }

  dataChanged(newValue){
    var parsed = AcUtils.parseIni(newValue);
    this.dataParsed(parsed);

    if (this.parent){
      this.parent.save();
    }
  }
}

var ersControllerId = 0;

class ErsControllerModel {
  constructor(index, data, torqueHelperModel){
    this.id = ersControllerId++;
    this.parent = torqueHelperModel;

    this.index = m.propCallback(index, this.indexChanged.bind(this));
    this.data = m.propCallback(data, this.dataChanged.bind(this));
    this.dataParsed = m.prop({});
    this.stateVariablesKeys = [];
    this.name = null;
  }

  init(){
    this.indexChanged(this.index());
    this.dataChanged(this.data());
  }

  getFilename(){
    return `ctrl_ers_${this.index()}.ini`;
  }

  indexChanged(newValue){
    if (this.parent){
      this.parent.save();
      this.parent.checkErsControllersIndexes();
    }
  }

  dataChanged(newValue){
    var parsed = AcUtils.parseIni(newValue);
    this.dataParsed(parsed);

    var keys = AcController.getInputKeys(parsed);
    if (!isArraysEqual(keys, this.stateVariablesKeys)){
      this.stateVariablesKeys = keys;
      if (this.parent){
        this.parent.updateStateVariables();
      }
    }

    var name = (parsed['HEADER'] || {})['NAME'];
    if (name != this.name){
      this.name = name;
      this.parent.updateErsControllersNames();
    }

    if (this.parent){
      this.parent.save();
    }
  }
}

var interpolateDebug = null;
// interpolateDebug = require('src/acUtils_interpolateDebug');

var turboIdFix = 0;
var torqueHelper = {
  controller: () => {
    var model = TorqueHelperModel.load() || TorqueHelperModel.createDefault();
    model.listenForDrops();

    var chart, changeId = -1;
    function plotter(){
      if (interpolateDebug) return interpolateDebug;
      return (element, isInitialized) => {
        if (isInitialized && changeId == model.changeId && !chart.updateRequired()) return;

        var values = settings.splitGraph() ? 
            resultingTorqueCurve.getSplitted(settings.pointsMode(), settings.steps(), model.toObject()) :
            resultingTorqueCurve.get(settings.pointsMode(), settings.steps(), model.toObject());

        if (isInitialized){
          chart.update(values);
        } else {
          if (chart != null){
            chart.dispose();
          }

          chart = charts.render(element, values);
        }

        changeId = model.changeId;
      };
    }

    function highlighter(property, mode /* = 'ace/mode/ini'*/){
      return (element, isInitialized) => {
        element.style.fontSize = settings.fontSize() + 'px';
        element.classList[settings.isThemeDark() ? 'add' : 'remove']('editor_dark');
        if (!isInitialized){
          var editor = ace.edit(element);
          editor.$blockScrolling = Infinity;
          editor.setTheme(settings.editorTheme());
          editor.getSession().setMode(mode || 'ace/mode/ini');
          editor.getSession().setUseWrapMode(true);
          editor.setValue(property(), 1);
          editor.on('input', () => element.onchange());
        } else {
          var value = property();
          var editor = element.env.editor;
          if (value != editor.getValue()){
            editor.setValue(value, 1);
          }

          if (editor.getTheme() != settings.editorTheme()){
            editor.setTheme(settings.editorTheme());
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

    function addTurboController(){
      selectTab(model.addTurboController(-1, defaults.turboControllerIni).id);
    }

    function addErsController(){
      selectTab(model.addErsController(-1, defaults.ersControllerHotlapIni).id);
    }

    function addErs(){
      model.addErs(defaults.ersIni);
      selectTab('ers.ini');

      if (model.ctrlErsInis.length == 0){
        model.addErsController(-1, defaults.ersControllerChargingIni);
        model.addErsController(-1, defaults.ersControllerHotlapIni);
      } else {
        model.updateStateVariables();
      }
    }

    function deleteErs(){
      model.deleteErs();
      model.updateStateVariables();
    }

    return {
      model: model,
      addErs: addErs,
      deleteErs: deleteErs,
      deleteTurboController: c => model.deleteTurboController(c),
      deleteErsController: c => model.deleteErsController(c),
      plotter: plotter,
      highlighter: highlighter,
      handleDrop: handleDrop,

      /* tabs mode */
      selectedTab: selectedTab,
      previousTab: previousTab,
      tabClick: tabClick,
      addTurboController: addTurboController,
      addErsController: addErsController,
    }
  },

  viewTurboControllerDisplayName: (ctrl, turboController, index) => {
    var warning = turboController.dublicateIndex ? locales.current.dublicateIndex : 
        !ctrl.model.engineIniParsed()[`TURBO_${turboController.index()}`] ? locales.current.noTurboForController : null;
    return [
      warning ? <i class="icon icon-warning" style="float:left;margin-right:2px" title={warning} /> : null,
      <span>ctrl_turbo<input type="number" min="0" max="10" oninput={m.withAttr('value', turboController.index)} value={turboController.index()} style="width:40px" />.ini</span>
    ];
  },

  viewErsControllerDisplayName: (ctrl, ersController, index) => {
    var warning = ersController.dublicateIndex ? locales.current.dublicateIndex : null;
    return [
      warning ? <i class="icon icon-warning" style="float:left;margin-right:2px" title={warning} /> : null,
      <span>ctrl_ers_<input type="number" min="0" max="10" oninput={m.withAttr('value', ersController.index)} value={ersController.index()} style="width:40px" />.ini</span>
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
        <div class="file_section">
          <button class="h6_button" onclick={ctrl.deleteTurboController.bind(this, turboController)}>{locales.current.delete}</button>
          <h6>{
            turboController.dublicateIndex ?
                <i class="icon icon-warning" key="dublicate-warning" style="float:left;margin-right:4px" title={locales.current.dublicateIndex} /> :
            !ctrl.model.engineIniParsed()[`TURBO_${turboController.index()}`] ? 
                <i class="icon icon-warning" key="no-turbo-warning" style="float:left;margin-right:4px" title={locales.current.noTurboForController} /> : 
              null }ctrl_turbo<input type="number" min="0" max="10" oninput={m.withAttr('value', turboController.index)} value={turboController.index()} style="width:40px" />.ini:</h6>
          <div 
            config={ctrl.highlighter(turboController.data)} 
            onchange={m.withAceValue(turboController.data)} />
        </div>
      )}

      {ctrl.model.ersIni() ? <div class="file_section" key='ers_base'>
        <button class="h6_button" onclick={ctrl.deleteErs}>{locales.current.delete}</button>
        <h6>ers.ini:</h6>
        <div 
          config={ctrl.highlighter(ctrl.model.ersIni)} 
          onchange={m.withAceValue(ctrl.model.ersIni)} />
      </div> : null}

      {ctrl.model.ersIni() ? ctrl.model.ctrlErsInis.map((ersController, index) => 
        <div class="file_section" key={`ers_${ersController.id}`}>
          <button class="h6_button" onclick={ctrl.deleteErsController.bind(this, ersController)}>{locales.current.delete}</button>
          <h6>{
            ersController.dublicateIndex ?
                <i class="icon icon-warning" style="float:left;margin-right:4px" title={locales.current.dublicateIndex} /> :
                null }ctrl_ers_<input type="number" min="0" max="10" oninput={m.withAttr('value', ersController.index)} value={ersController.index()} style="width:40px" />.ini:</h6>
          <div 
            config={ctrl.highlighter(ersController.data)} 
            onchange={m.withAceValue(ersController.data)} />
        </div>
      ) : null}

      <div class="main_section_buttons">
        {ctrl.model.ersIni() ?
            <button class="secondary" onclick={ctrl.addErsController}>{locales.current.addErsController}</button> :
            <button class="secondary" onclick={ctrl.addErs}>{locales.current.addErs}</button>}
        <button class="secondary" onclick={ctrl.addTurboController}>{locales.current.addTurboController}</button>
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
          {ctrl.model.ersIni() ? <a 
            href="#" 
            data-key="ers.ini"
            class={ctrl.selectedTab() == 'ers.ini' ? 'ghost_complex active' : 'ghost_complex'} 
            onclick={ctrl.tabClick}>
            <span class="actual">
              <span>ers.ini</span>
              <button onclick={e => {
                ctrl.deleteErs();
                e.preventDefault();
                e.stopPropagation();
              }}>×</button>
            </span>
            <span class="ghost">
              <span>ers.ini</span>
              <button onclick={e => {
                ctrl.deleteErs();
                e.preventDefault();
                e.stopPropagation();
              }}>×</button>
            </span>
          </a> : null}
          {ctrl.model.ersIni() ? ctrl.model.ctrlErsInis.map((ersController, index) => <a 
            href="#" 
            data-key={ersController.id} 
            class={ctrl.selectedTab() == ersController.id ? 'ghost_complex active' : 'ghost_complex'} 
            onclick={ctrl.tabClick} 
            key={`ers_${ersController.id}`}>
            <span class="actual">
              { torqueHelper.viewErsControllerDisplayName(ctrl, ersController, index) }
              <button onclick={e => {
                ctrl.deleteErsController(ersController);
                e.preventDefault();
                e.stopPropagation();
              }}>×</button>
            </span>
            <span class="ghost">
              { torqueHelper.viewErsControllerDisplayName(ctrl, ersController, index) }
              <button onclick={e => {
                ctrl.deleteErsController(ersController);
                e.preventDefault();
                e.stopPropagation();
              }}>×</button>
            </span>
          </a> ) : null}
        </div>
      </td></tr><tr><td style="height:100%;width:100%;position:relative">
        <div 
          style={ctrl.selectedTab() == 'power.lut' ? null : 'display:none'}
          title={locales.current.dontForgetTransmissionLoss}
          config={ctrl.highlighter(ctrl.model.powerLut)}
          onchange={m.withAceValue(ctrl.model.powerLut)} />
        <div 
          style={ctrl.selectedTab() == 'engine.ini' ? null : 'display:none'}
          title={locales.current.turboSectionsOnlyNeeded}
          config={ctrl.highlighter(ctrl.model.engineIni)} 
          onchange={m.withAceValue(ctrl.model.engineIni)} />
        {ctrl.model.ctrlTurboInis.map((turboController, index) => 
          <div 
            style={ctrl.selectedTab() == turboController.id ? null : 'display:none'}
            key={turboController.id}
            config={ctrl.highlighter(turboController.data)} 
            onchange={m.withAceValue(turboController.data)} />
        )}
        {ctrl.model.ersIni() ? <div 
          style={ctrl.selectedTab() == 'ers.ini' ? null : 'display:none'}
          config={ctrl.highlighter(ctrl.model.ersIni)} 
          onchange={m.withAceValue(ctrl.model.ersIni)} /> : null}
        {ctrl.model.ersIni() ? ctrl.model.ctrlErsInis.map((ersController, index) => 
          <div 
            style={ctrl.selectedTab() == ersController.id ? null : 'display:none'}
            key={`ers_${ersController.id}`}
            config={ctrl.highlighter(ersController.data)} 
            onchange={m.withAceValue(ersController.data)} />
        ) : null}
      </td></tr><tr><td style="height:auto">
        <div class="main_section_buttons">
        {ctrl.model.ersIni() ?
            <button class="secondary" onclick={ctrl.addErsController}>{locales.current.addErsController}</button> :
            <button class="secondary" onclick={ctrl.addErs}>{locales.current.addErs}</button>}
        <button class="secondary" onclick={ctrl.addTurboController}>{locales.current.addTurboController}</button>
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

  viewDev: () => {
    return hashParams.dev ? <div>
      { createInput.checkbox('dev:engineIniRpmLimit', settings.engineIniRpmLimit) }
      { createInput.checkbox('dev:sameY', settings.sameY) }
      { createInput.checkbox('dev:pointsMode', settings.pointsMode) }
      { createInput.checkbox('dev:optimize', settings.optimize) }
    </div> : null;
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
                    var params = AcController.getInputParams(x.key);
                    return createInput.prop(locales.current['input' + x.key] || x.key, x.value, params.min, params.max, params.step);
                  })
                }{
                  ctrl.model.ersIni() && ctrl.model.ersControllersNames.length > 1 ?
                    createInput.select(locales.current.ersSelectedController, ctrl.model.ersSelectedController, 
                      [
                        { title: locales.current.ersDisabledController, value: AcErs.ERS_ID_DISABLED },
                        { title: locales.current.ersDefaultController, value: AcErs.ERS_ID_DEFAULT }
                      ].concat(ctrl.model.ersControllersNames.map((n, i) => ({ title: n, value: i })))) :
                    null
                }</div> : null }

            <div
              style="height:400px"
              config={ctrl.plotter()} />
            {torqueHelper.viewDev()}

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
      <div class="drag">{locales.current.dropHere}</div>,
      Dialog.component,
      Toast.component,
    ];
  }
};

settings.whenEditorThemeIsReady(() => {
  m.mount(document.body, torqueHelper);
  swipes.init();
});
