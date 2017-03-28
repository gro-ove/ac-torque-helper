var AcUtils = require('src/acUtils');

var _stateVariables = [];

function _getStateVariableEntry(key){
  for (var i = 0; i < _stateVariables.length; i++){
    if (_stateVariables[i].key == key) return _stateVariables[i];
  }
}

function _registerStateVariable(key){
  var entry = _getStateVariableEntry(key);
  if (!entry){
    entry = { key: key, value: 0 };
    _stateVariables.push(entry);
  }

  return entry;
}

function _getStateVariable(key){
  var entry = _getStateVariableEntry(key);
  if (entry) return entry.value;
}

function _setStateVariable(key, value){
  var entry = _getStateVariableEntry(key);
  if (entry) entry.value = +value;
}

function _markStateVariables(){
  for (var i = 0; i < _stateVariables.length; i++){
    _stateVariables[i].used = false;
  }
}

function _cleanStateVariables(){
  for (var i = _stateVariables.length - 1; i >= 0; i--){
    if (!_stateVariables[i].used){
      _stateVariables.splice(i, 1);
    }
  }
}

var _combinatorWarned = {};

class AcController {
  constructor(section) {
    this.input = (section['INPUT'] || '').toUpperCase();
    this.combinator = (section['COMBINATOR'] || '').toUpperCase();
    this.lut = AcUtils.parseLutValue(section['LUT']);
    this.filter = +section['FILTER'];
    this.upLimit = +section['UP_LIMIT'];
    this.downLimit = +section['DOWN_LIMIT'];

    if (this.input != 'RPMS'){
      this.inputEntry = _registerStateVariable(this.input);
    }
  }

  process(rpm, current){
    var input = 0;
    switch (this.input){
      case 'RPMS':
        input = rpm;
        break;

      default:
        input = this.inputEntry.value;
    }

    var value = AcUtils.interpolateLinear(this.lut, input);
    switch (this.combinator){
      case 'ADD':
        current += value;
        break;
      case 'MULT':
        current *= value;
        break;
      default:
        if (!_combinatorWarned[this.combinator]){
          console.warn('unsupported combinator: ' + this.combinator);
          _combinatorWarned[this.combinator] = true;
        }
        break;
    }

    if (!Number.isNaN(this.upLimit) && this.upLimit < current){
      current = this.upLimit;
    }

    if (!Number.isNaN(this.downLimit) && this.downLimit > current){
      current = this.downLimit;
    }

    return current;
  }

  static getInputParams(key){
    switch (key){
      case 'GAS':
      case 'BRAKE': 
      case 'OVERSTEER_FACTOR':
        return { min: 0, max: 1, step: 0.01 };

      case 'STEER':
        return { min: -1, max: 1, step: 0.01 };

      case 'GEAR':
        return { min: 0, max: 10, step: 1 };

      case 'SPEED_KMH':
        return { min: 0, max: 500, step: 10 };

      case 'LATG':
      case 'LONG':
        return { min: -10, max: 10, step: 0.1 };

      case 'REAR_SPEED_RATIO':
      case 'SLIPANGLE_FRONT_AVERAGE':
      case 'SLIPANGLE_FRONT_MAX':
      case 'SLIPANGLE_REAR_AVERAGE':
      case 'SLIPANGLE_REAR_MAX':
      case 'SLIPRATIO_MAX':
      case 'RPMS':
      default:
        return { min: null, max: null, step: null };
    }
  }

  static isKnownInputKey(key){
    switch (key){
      case 'BRAKE':
      case 'GAS':
      case 'GEAR':
      case 'LATG':
      case 'LONG':
      case 'OVERSTEER_FACTOR':
      case 'REAR_SPEED_RATIO':
      case 'SLIPANGLE_FRONT_AVERAGE':
      case 'SLIPANGLE_FRONT_MAX':
      case 'SLIPANGLE_REAR_AVERAGE':
      case 'SLIPANGLE_REAR_MAX':
      case 'SLIPRATIO_MAX':
      case 'SPEED_KMH':
      case 'STEER':
        return true;

      case 'RPMS':
      default:
        return false;
    }
  }

  static getControllers(iniParsed){
    if (!iniParsed) return [];

    var controllers = [];
    for (var i = 0, section; section = iniParsed[`CONTROLLER_${i}`]; i++) {
      controllers.push(new AcController(section));
    }

    return controllers;
  }

  static getInputKeys(iniParsed){
    var result = [];
    for (var i = 0, section; section = iniParsed[`CONTROLLER_${i}`]; i++) {
      var value = (section['INPUT'] || '').toUpperCase();
      if (AcController.isKnownInputKey(value)) result.push(value);
    }

    return result;
  }

  static markStateVariables(){
    _markStateVariables();
  }

  static cleanStateVariables(){
    _cleanStateVariables();
  }

  static hasStateVariables(){
    return _stateVariables.length > 0;
  }

  static getStateVariables(){
    return _stateVariables;
  }

  static getStateVariableEntry(key){
    return _registerStateVariable(key);
  }

  static setStateVariable(key, value){
    _setStateVariable(key, value);
  }
}

module.exports = AcController;