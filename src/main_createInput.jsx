var m = require('mithril');

function checkInput(type) {
  var input = document.createElement('input');
  input.setAttribute('type', type);
  return input.type == type;
}

var rangeSupported = checkInput('range');

function createInput(title, value, oninput, min, max, step, postfix, disabled){
  if (min === undefined) min = 0;
  if (max === undefined) max = 100;
  if (step === undefined) step = null;

  return <label class="input_label">
    <div>{title}:</div>
    <input type="number" min={min} max={max} step={step} value={value} disabled={disabled} oninput={oninput} />{postfix}
    { rangeSupported ? <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} oninput={oninput} /> : null }
  </label>;
}

createInput.prop = function (title, prop, min, max, step, postfix, disabled){
  return createInput(title, prop(), m.withAttr('value', prop), min, max, step, postfix, disabled);
};

createInput.select = function (title, prop, values, disabled){
  return <label class="input_label">
    <div>{title}:</div>
    <select value={prop()} disabled={disabled} oninput={m.withAttr('value', prop)}>{ 
      values.map(x => <option value={x.value}>{x.title}</option>)
    }</select>
  </label>;
};

createInput.checkbox = function (title, prop, disabled){
  return <label style="display:block">
    <input
      type="checkbox"
      checked={prop()}
      disabled={disabled}
      onchange={m.withAttr('checked', prop)} />
    {title}
  </label>;
};

module.exports = createInput;