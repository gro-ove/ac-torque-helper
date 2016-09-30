// usings
var m = require('mithril');
require('res/css/settings');

var locales = require('src/locales');
var createInput = require('src/main_createInput');
var Dialog = require('src/dialog');

// module itself
function curveMightChanged(){
  settings && settings.oncurvechanged();
}

function init(){}

var opened = null;
function toggle(){
  if (!opened){
    opened = new Dialog('settings', settingsComponent);
    opened.onclose = () => opened = null;
    opened.show();
  } else {
    opened.hide();
    opened = null;
  }
}

var buttonComponent = {
  view: ctrl => {
    return <a href="#" class={opened ? 'settings_toggle active' : 'settings_toggle'} onclick={e => (toggle(), e.preventDefault())}>
      {locales.current.settings}
    </a>;
  }
};

function clearSavedData(){
  function yes(){
    localStorage.clear();
    location.reload();
    d.hide();
  }

  function no(){
    d.hide();
  }

  var d = new Dialog('clearSavedData', {
    view: () => <div class="dialog_content">
      <p>{locales.current.areYouSure}</p>
      <div class="main_section_buttons">
        <button onclick={yes}>{locales.current.yes}</button>
        <button class="secondary" onclick={no}>{locales.current.no}</button>
      </div>
    </div>
  });

  d.show();
}

function aboutDialog(){
  var packageInformation = require('../package');
  new Dialog('acTorqueHelper', {
    view: () => <div class="dialog_content">
      <p style="font-size:13px">{m.trust(`${locales.current.version}: <b>${packageInformation.version}</b>.`)}</p>
      <p style="font-size:13px">{m.trust(locales.current.aboutHtml)}</p>
      <p style="font-size:13px"><a target="_blank" href={packageInformation.homepage}>GitHub ({packageInformation.licenses[0].type})</a>.</p>
    </div>
  }).show();
}

var settingsComponent = {
  view: ctrl => {
    return <div class="dialog_content">
      <h6>{locales.current.general}:</h6>
      <label class="input_label">
        <div>{locales.current.language}:</div>
        { locales.comboBoxComponent }
      </label>

      <h6>{locales.current.appearance}:</h6>
      { createInput.checkbox(locales.current.tabsLayout, settings.tabsLayout) }
      { createInput.checkbox(locales.current.fullScreenMode, settings.fullScreenMode) }
      { createInput.checkbox(locales.current.pictureBackground, settings.pictureBackground) }
      { createInput.prop(locales.current.fontSize, settings.fontSize, 10, 20, 1, ' px') }

      <h6>{locales.current.curves}:</h6>
      { createInput.checkbox(locales.current.engineIniRpmLimit, settings.engineIniRpmLimit) }
      { createInput.checkbox(locales.current.sameY, settings.sameY) }
      { createInput.checkbox(locales.current.curvesByPowerLutPoints, settings.pointsMode) }
      { createInput.prop(locales.current.detalization, settings.steps, 10, 200, 10, null, settings.pointsMode()) }

      <div class="main_section_buttons">
        <button onclick={clearSavedData}>{locales.current.clearSavedData}</button>
        <button class="secondary" onclick={aboutDialog}>{locales.current.about}</button>
      </div>
    </div>;
  }
};

var settings = {
  tabsLayout: m.propLocal(false, 'tabsLayout'),
  fullScreenMode: m.propLocal(false, 'fullScreenMode'),
  pictureBackground: m.propLocal(true, 'pictureBackground'),
  fontSize: m.propLocal(11, 'fontSize'),
  engineIniRpmLimit: m.propLocal(true, 'engineIniRpmLimit', curveMightChanged),
  pointsMode: m.propLocal(false, 'pointsMode', curveMightChanged),
  steps: m.propLocal(100, 'steps', curveMightChanged),
  sameY: m.propLocal(true, 'sameY', curveMightChanged),

  oncurvechanged: null,

  init: init,
  buttonComponent: buttonComponent,
  settingsComponent: settingsComponent
};

module.exports = settings;