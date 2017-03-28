var AcUtils = require('src/acUtils');
var AcController = require('src/acController');

var _multiplerMode = true;

class AcErs {
  constructor(iniParsed, ctrlErsInisParsed, selectedController){
    var section = iniParsed['KINETIC'] || {};
    this.torque = AcUtils.parseLutValue(section['TORQUE_CURVE']);
    this.coast = AcUtils.parseLutValue(section['COAST_CURVE']);
    this.selectedController = selectedController == AcErs.ERS_ID_DEFAULT ? 
        section['DEFAULT_CONTROLLER'] | 0 : selectedController;

    var controllers = {};
    for (var n in ctrlErsInisParsed){
      if (ctrlErsInisParsed.hasOwnProperty(n)){
        controllers[n] = AcController.getControllers(ctrlErsInisParsed[n]);
      }
    }

    this.controllers = controllers;
    this.inputGas = AcController.getStateVariableEntry('GAS');
  }

  // not affected by controllers
  getBaseValue(rpm){
    var gas = this.inputGas.value;
    if (gas <= 0.0001){
      return AcUtils.interpolateLinear(this.coast, rpm);
    } else if (gas >= 0.9999){
      return AcUtils.interpolateLinear(this.torque, rpm);
    } else {
      var coast = AcUtils.interpolateLinear(this.coast, rpm);
      var torque = AcUtils.interpolateLinear(this.torque, rpm);
      return coast * (1 - gas) + torque * gas;
    }
  }

  adjustValue(value, rpm){
    var controllers = this.controllers[this.selectedController] || this.controllers[0];
    if (!controllers) return 0.0;

    if (_multiplerMode){
      var multipler = 0.0;
      for (var i = 0; i < controllers.length; i++){
        multipler = controllers[i].process(rpm, multipler);
      }

      return value * multipler;
    } else {
      for (var i = 0; i < controllers.length; i++){
        value = controllers[i].process(rpm, value);
      }

      return value;
    }
  }

  getTorque(rpm){
    if (this.selectedController == AcErs.ERS_ID_DISABLED){
      return 0;
    }

    var baseValue = this.getBaseValue(rpm);
    return this.adjustValue(baseValue, rpm);
  }
}

AcErs.ERS_ID_DISABLED = -2;
AcErs.ERS_ID_DEFAULT = -1;

module.exports = AcErs;