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
      boost = this.maxBoost * baseLevel;
    }
    return Math.min(this.wastegate, boost);
  }

  // first attempt, apparently wrong
  calculateMultiplerObsolete(rpm){
    var boost = this.maxBoost * Math.min(1.0, Math.pow(rpm / this.referenceRpm, this.gamma));
    for (var i = 0; i < this.controllers.length; i++){
      boost = this.controllers[i].process(rpm, boost);
    }
    return Math.min(this.wastegate, boost);
  }

  static considerTurbos(powerLutParsed, engineIniParsed, ctrlTurboInisParsed){
    var turbos = [];
    for (var i = 0, section; section = engineIniParsed[`TURBO_${i}`]; i++) {
      var controllers = ctrlTurboInisParsed == null ? [] : AcTurboController.getControllers(ctrlTurboInisParsed[i]);
      turbos.push(new AcTurbo(section, controllers, !!ctrlTurboInisParsed[i]));
    }

    return powerLutParsed.map(x => [ x[0], x[1] * (1.0 + turbos.reduce((a, b) => a + b.calculateMultipler(x[0]), 0.0)) ]);
  }
}

module.exports = AcTurbo;