// usings
var m = require('mithril');
require('res/css/settings');

var locales = require('src/locales');
var createInput = require('src/main_createInput');
var hashParams = require('src/hashParams');
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

var editorDarkThemes = [
  { theme: 'ace/theme/mono_industrial', id: 5, name: 'themeMonoIndustrial', builtIn: true },
  { theme: 'ace/theme/ambiance', id: 0, name: 'themeAmbiance' },
  { theme: 'ace/theme/clouds_midnight', id: 8, name: 'themeCloudsMidnight' },
  { theme: 'ace/theme/cobalt', id: 10, name: 'themeCobalt' },
  { theme: 'ace/theme/idle_fingers', id: 22, name: 'themeIdleFingers' },
  { theme: 'ace/theme/kr_theme', id: 28, name: 'themeKrTheme' },
  { theme: 'ace/theme/merbivore', id: 32, name: 'themeMerbivore' },
  { theme: 'ace/theme/merbivore_soft', id: 1, name: 'themeMerbivoreSoft' },
  { theme: 'ace/theme/monokai', id: 3, name: 'themeMonokai' },
  { theme: 'ace/theme/pastel_on_dark', id: 7, name: 'themePastelOnDark' },
  { theme: 'ace/theme/solarized_dark', id: 9, name: 'themeSolarizedDark' },
  { theme: 'ace/theme/terminal', id: 15, name: 'themeTerminal' },
  { theme: 'ace/theme/tomorrow_night', id: 21, name: 'themeTomorrowNight' },
  { theme: 'ace/theme/tomorrow_night_blue', id: 23, name: 'themeTomorrowNightBlue' },
  { theme: 'ace/theme/tomorrow_night_bright', id: 25, name: 'themeTomorrowNightBright' },
  { theme: 'ace/theme/tomorrow_night_eighties', id: 27, name: 'themeTomorrowNightEighties' },
  { theme: 'ace/theme/twilight', id: 29, name: 'themeTwilight' },
  { theme: 'ace/theme/vibrant_ink', id: 31, name: 'themeVibrantInk' },
];

var editorBrightThemes = [
  { theme: 'ace/theme/chaos', id: 2, name: 'themeChaos' },
  { theme: 'ace/theme/chrome', id: 4, name: 'themeChrome' },
  { theme: 'ace/theme/clouds', id: 6, name: 'themeClouds' },
  { theme: 'ace/theme/crimson_editor', id: 12, name: 'themeCrimsonEditor' },
  { theme: 'ace/theme/dawn', id: 14, name: 'themeDawn' },
  { theme: 'ace/theme/dreamweaver', id: 16, name: 'themeDreamweaver' },
  { theme: 'ace/theme/eclipse', id: 18, name: 'themeEclipse' },
  { theme: 'ace/theme/github', id: 20, name: 'themeGithub' },
  { theme: 'ace/theme/iplastic', id: 24, name: 'themeIplastic' },
  { theme: 'ace/theme/katzenmilch', id: 26, name: 'themeKatzenmilch' },
  { theme: 'ace/theme/kuroir', id: 30, name: 'themeKuroir' },
  { theme: 'ace/theme/solarized_light', id: 11, name: 'themeSolarizedLight' },
  { theme: 'ace/theme/sqlserver', id: 13, name: 'themeSqlserver' },
  { theme: 'ace/theme/textmate', id: 17, name: 'themeTextmate' },
  { theme: 'ace/theme/tomorrow', id: 19, name: 'themeTomorrow' },
  { theme: 'ace/theme/xcode', id: 33, name: 'themeXcode' },
];

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
      <label class="input_label">
        <div>{locales.current.editorTheme}:</div>
        <select value={settings.editorTheme()} onchange={m.withAttr('value', settings.editorTheme)}>
          <optgroup label={locales.current.darkThemes}>
            { editorDarkThemes.map(theme => <option value={theme.theme} key={theme.id}>{locales.current[theme.name]}</option>) }
          </optgroup>
          <optgroup label={locales.current.brightThemes}>
            { editorBrightThemes.map(theme => <option value={theme.theme} key={theme.id}>{locales.current[theme.name]}</option>) }
          </optgroup>
        </select>
      </label>

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

var darkTheme;
var settings = {
  tabsLayout: m.propLocal(false, 'tabsLayout'),
  fullScreenMode: m.propLocal(false, 'fullScreenMode'),
  pictureBackground: m.propLocal(true, 'pictureBackground'),
  fontSize: m.propLocal(11, 'fontSize'),
  editorTheme: m.propLocal('ace/theme/mono_industrial', 'editorTheme', updateDarkTheme),
  engineIniRpmLimit: m.propLocal(true, 'engineIniRpmLimit', curveMightChanged),
  pointsMode: m.propLocal(false, 'pointsMode', curveMightChanged),
  steps: m.propLocal(100, 'steps', curveMightChanged),
  sameY: m.propLocal(true, 'sameY', curveMightChanged),
  optimize: m.propLocal(true, 'optimize', curveMightChanged),

  oncurvechanged: null,

  init: init,
  buttonComponent: buttonComponent,
  settingsComponent: settingsComponent,

  isThemeDark: () => darkTheme,
  whenEditorThemeIsReady: callback => {
    var theme = getCurrentTheme();
    if (theme == null || theme.builtIn){
      callback();
      return;
    }

    ace.require([ theme.theme ], e => {
      setTimeout(callback, 10);
    });
  }
};

function themeFromParams(){
  if (hashParams.theme){
    settings.editorTheme(`ace/theme/${hashParams.theme}`);
  }
}

function getCurrentTheme(){
  var theme = settings.editorTheme();
  for (var i = 0; i < editorDarkThemes.length; i++){
    if (editorDarkThemes[i].theme === theme) return editorDarkThemes[i];
  }

  for (var i = 0; i < editorBrightThemes.length; i++){
    if (editorBrightThemes[i].theme === theme) return editorBrightThemes[i];
  }
}

function updateDarkTheme(){
  var theme = settings.editorTheme();
  for (var i = 0; i < editorBrightThemes.length; i++){
    if (editorBrightThemes[i].theme === theme){
      darkTheme = false;
      return;
    }
  }

  darkTheme = true;
}

hashParams.onupdated = themeFromParams;
themeFromParams();
updateDarkTheme();

module.exports = settings;