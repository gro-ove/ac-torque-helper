var AcUtils = require('src/acUtils');
var charts = require('src/charts');

module.exports = (element, isIn) => {
  var lut = AcUtils.parseLutValue('(|0=0.0|4000=0.0|4500=1.5|5500=2.0|6000=2.5|6500=2.7|7000=3.0|8000=3.0|8500=2.9|9000=2.74|9500=2.65|10000=2.47|10500=2.4|11000=2.1|11500=2|)');
  var linear = [], cubic = [];
  for (var i = 0; i < 12000; i += 100){
    linear.push([ i, AcUtils.interpolateLinear(lut, i) ]);
    cubic.push([ i, AcUtils.interpolateCubic(lut, i) ]);
  }

  if (isIn){
    chart.update(linear, cubic);
  } else {
    chart = charts.render(element, linear, cubic);
  }
};