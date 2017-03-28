var AcTurbo = require('src/acTurbo');
var AcErs = require('src/acErs');
var AcUtils = require('src/acUtils');
var settings = require('src/settings');

function getLimit(powerLutParsed, engineIniParsed){
  var limit = settings.engineIniRpmLimit() && engineIniParsed['ENGINE_DATA'] ? +engineIniParsed['ENGINE_DATA']['LIMITER'] : Number.NaN;
  return !limit || Number.isNaN(limit) ? null : limit;
}

function getTurbosList(engineIniParsed, ctrlTurboInis){
  var ctrlTurboInisParsed = ctrlTurboInis.reduce((a, b) => (a[b.index()] = b.dataParsed(), a), {});
  return AcTurbo.getTurbosList(engineIniParsed, ctrlTurboInisParsed);
}

function getErs(ersIni, ctrlErsInis, selectedId){
  var ctrlErsInisParsed = ctrlErsInis.reduce((a, b) => (a[b.index()] = b.dataParsed(), a), {});
  return new AcErs(ersIni, ctrlErsInisParsed, selectedId);
}

function getTorqueFn(turbos, ers){  
  return (baseValue, rpm) => {
    var withTurbos = AcTurbo.considerTurbosPoint(turbos, rpm, baseValue);
    if (ers != null){
      return withTurbos + ers.getTorque(rpm);
    } else {
      return withTurbos;
    }
  };
}

function getSplittedTorqueFn(turbos, ers){  
  return (baseValue, rpm) => {
    var withTurbos = AcTurbo.considerTurbosPoint(turbos, rpm, baseValue);
    return { base: baseValue, turbo: withTurbos - baseValue, ers: ers != null ? ers.getTorque(rpm) : 0.0 };
  };
}

function get_pointsMode(powerLutParsed, limit, torqueFn){
  var result = [];

  if (limit != null){
    var baseTorque = AcUtils.interpolateLinear(powerLutParsed, 0);
    result.push([ 0, torqueFn(baseTorque, 0) ]);
  }  

  for (var i = 0; i < powerLutParsed.length; i++){
    var p = powerLutParsed[i];
    var pRpm = p[0];
    var pTorque = p[1];

    if (limit != null && pRpm >= limit){
      if (i == 0 || powerLutParsed[i - 1][0] < limit){
        var baseTorque = AcUtils.interpolateLinear(powerLutParsed, limit);
        result.push([ limit, torqueFn(baseTorque, limit) ]);
      }

      return result;
    }

    result.push([ pRpm, torqueFn(pTorque, pRpm) ]);
  }

  if (limit != null){
    var baseTorque = AcUtils.interpolateLinear(powerLutParsed, limit);
    result.push([ limit, torqueFn(baseTorque, limit) ]);
  }

  return result;
}

function get_simpleInterpolationMode(powerLutParsed, limit, torqueFn, steps){
  if (powerLutParsed.length == 0) return [];

  var startFrom = 0;
  if (limit == null){
    limit = powerLutParsed[powerLutParsed.length - 1][0];
    startFrom = powerLutParsed[0][0];
  }

  var result = [];

  var prevRpm = 0, prevJ = 0;
  for (var i = 0; i <= steps; i ++){
    var rpm = (limit - startFrom) * i / steps + startFrom;

    for (var j = prevJ; j < powerLutParsed.length; j++){
      var p = powerLutParsed[j];
      var pRpm = p[0];
      var pTorque = p[1];

      if (pRpm > rpm){
        prevJ = j > 0 ? j - 1 : 0;
        break;
      } else if (pRpm > prevRpm && pRpm < rpm){
        result.push([ pRpm, torqueFn(pTorque, pRpm) ]);
      }
    }

    var baseTorque = AcUtils.interpolateLinear(powerLutParsed, rpm);
    result.push([ rpm, torqueFn(baseTorque, rpm) ]);

    prevRpm = rpm;
  }

  return result;
}

/* data: {
  powerLutParsed,
  engineIniParsed,
  ersIniParsed,
  ctrlTurboInis,
  ctrlErsInis,
  ersSelectedController,
} */

function _get(pointsMode, steps, data, torqueFnFn){
  var power;

  var turbos = getTurbosList(data.engineIniParsed, data.ctrlTurboInis);
  var ers = data.ersIniParsed && data.ersSelectedController != AcErs.ERS_ID_DISABLED ? 
      getErs(data.ersIniParsed, data.ctrlErsInis, data.ersSelectedController) : null;
  var limit = getLimit(data.powerLutParsed, data.engineIniParsed);
  var torqueFn = torqueFnFn(turbos, ers);

  if (pointsMode){
    return get_pointsMode(data.powerLutParsed, limit, torqueFn);
  } else {
    return get_simpleInterpolationMode(data.powerLutParsed, limit, torqueFn, steps);
  }
}

function get(pointsMode, steps, data){
  return _get(pointsMode, steps, data, getTorqueFn);
}

function getSplitted(pointsMode, steps, data){
  return _get(pointsMode, steps, data, getSplittedTorqueFn);
}

module.exports = {
  get: get,
  getSplitted: getSplitted,
}