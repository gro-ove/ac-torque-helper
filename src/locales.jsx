// usings
var m = require('mithril');
require('res/css/locales');

// module itself
var locales = [
  { id: 1, localeId: 'en', active: false, name: 'English', load: () => require('res/strings/en') },
  { id: 2, localeId: 'ru', active: false, name: 'Русский', load: () => require('res/strings/ru') },
];

function getByLocaleId(id){
  for (var i = 0; i < locales.length; i++){
    if (locales[i].localeId == id) return locales[i];
  }
}

var current, currentLocaleId;
function changeLocale(locale, save){
  locales.forEach(m => m.active = false);
  if (locale.localeId == currentLocaleId) return;

  currentLocaleId = locale.localeId;
  current = locale.load();
  locale.active = true;

  if (save !== false){
    localStorage['locale'] = locale.localeId;
  }

  var event = document.createEvent('Event');
  event.initEvent('langchanged', true, true);
  document.body.dispatchEvent(event);
}

function changeLocaleId(id){
  var locale = getByLocaleId(id);
  if (locale) changeLocale(locale);
}

function detectBrowserLocale(){
  var language = navigator.languages && navigator.languages[0] || // Chrome / Firefox
      navigator.language ||   // All browsers
      navigator.userLanguage; // IE <= 10
  return /(\w+)/.test(language || '') ? RegExp.$1.toLowerCase() : null;
}

function init(){
  changeLocale(getByLocaleId(localStorage['locale']) || 
      getByLocaleId(detectBrowserLocale()) ||
      locales[0], false);
}

var component = {
  view: ctrl => {
    return <ul class="locales_list">
      { locales.map(locale => <li class={locale.active ? 'active' : ''} key={locale.id}>
        <a href="#" onclick={e => (changeLocale(locale), e.preventDefault())}>{locale.name}</a>
      </li>) }
    </ul>
  }
};

var comboBoxComponent = {
  view: ctrl => {
    return <select value={currentLocaleId} onchange={m.withAttr('value', changeLocaleId)}>{ 
      locales.map(locale => <option value={locale.localeId} key={locale.id}>{locale.name}</option>) 
    }</select>
  }
};

module.exports = {
  init: init,
  component: component,
  comboBoxComponent: comboBoxComponent,
  get current(){
    return current;
  }
};