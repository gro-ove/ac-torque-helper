var AcTurbo = require('src/acTurbo');
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

function get_pointsMode(powerLutParsed, limit, turbos){
  var result = [];

  if (limit != null){
    var baseTorque = AcUtils.interpolateLinear(powerLutParsed, 0);
    result.push([ 0, AcTurbo.considerTurbosPoint(turbos, 0, baseTorque) ]);
  }

  for (var i = 0; i < powerLutParsed.length; i++){
    var p = powerLutParsed[i];
    var pRpm = p[0];
    var pTorque = p[1];

    if (limit != null && pRpm >= limit){
      if (i == 0 || powerLutParsed[i - 1][0] < limit){
        var baseTorque = AcUtils.interpolateLinear(powerLutParsed, limit);
        result.push([ limit, AcTurbo.considerTurbosPoint(turbos, limit, baseTorque) ]);
      }

      return result;
    }

    result.push([ pRpm, AcTurbo.considerTurbosPoint(turbos, pRpm, pTorque) ]);
  }

  if (limit != null){
    var baseTorque = AcUtils.interpolateLinear(powerLutParsed, limit);
    result.push([ limit, AcTurbo.considerTurbosPoint(turbos, limit, baseTorque) ]);
  }

  return result;
}

function get_simpleInterpolationMode(powerLutParsed, limit, turbos, steps){
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
        result.push([ pRpm, AcTurbo.considerTurbosPoint(turbos, pRpm, pTorque) ]);
      }
    }

    var baseTorque = AcUtils.interpolateLinear(powerLutParsed, rpm);
    result.push([ rpm, AcTurbo.considerTurbosPoint(turbos, rpm, baseTorque) ]);

    prevRpm = rpm;
  }

  return result;
}

function get(pointsMode, steps, powerLutParsed, engineIniParsed, ctrlTurboInis){
  var power;

  var turbos = getTurbosList(engineIniParsed, ctrlTurboInis);
  var limit = getLimit(powerLutParsed, engineIniParsed);

  if (pointsMode){
    return get_pointsMode(powerLutParsed, limit, turbos);
  } else {
    return get_simpleInterpolationMode(powerLutParsed, limit, turbos, steps);
  }
}

module.exports = {
  get: get
}