var AcController = require('src/acController');
var AcTurboController = require('src/acTurboController');

class AcTurbo {
  constructor(section, controllers, hasControllers) {
    this.maxBoost = +section['MAX_BOOST'];
    this.wastegate = +section['WASTEGATE'];
    this.gamma = +section['GAMMA'];
    this.referenceRpm = +section['REFERENCE_RPM'];
    this.controllers = controllers || [];
    this.hasControllers = hasControllers;
  }

  // second attempt, should be more accurate
  calculateMultipler(rpm){
    var baseLevel = Math.min(1.0, Math.pow(rpm / this.referenceRpm, this.gamma));
    var boost;
    if (this.hasControllers){
      boost = 0;
      for (var i = 0; i < this.controllers.length; i++){
        boost = this.controllers[i].process(rpm, boost);
      }
    } else {
      boost = this.maxBoost;
    }

    var result = boost * baseLevel;
    return this.wastegate == 0 ? result : Math.min(this.wastegate, result);
  }

  // first attempt, apparently wrong
  calculateMultiplerObsolete(rpm){
    var boost = this.maxBoost * Math.min(1.0, Math.pow(rpm / this.referenceRpm, this.gamma));
    for (var i = 0; i < this.controllers.length; i++){
      boost = this.controllers[i].process(rpm, boost);
    }
    return this.wastegate == 0 ? boost : Math.min(this.wastegate, boost);
  }

  static getTurbosList(engineIniParsed, ctrlTurboInisParsed){
    var turbos = [];
    for (var i = 0, section; section = engineIniParsed[`TURBO_${i}`]; i++) {
      var controllers = ctrlTurboInisParsed == null ? [] : AcController.getControllers(ctrlTurboInisParsed[i]);
      turbos.push(new AcTurbo(section, controllers, !!ctrlTurboInisParsed[i]));
    }

    return turbos;
  }

  static considerTurbos(powerLutParsed, engineIniParsed, ctrlTurboInisParsed){
    var turbosList = getTurbosList(engineIniParsed, ctrlTurboInisParsed);
    return powerLutParsed.map(x => [ x[0], AcTurbo.considerTurbosPoint(turbosList, x[0], x[1]) ]);
  }

  static considerTurbosPoint(turbosList, rpm, baseTorque){
    var boost = 0;
    for (var i = 0; i < turbosList.length; i++){
      boost += turbosList[i].calculateMultipler(rpm);
    }

    return baseTorque * (1.0 + boost);
  }
}

module.exports = AcTurbo;