// usings
var Highcharts = require('lib/highcharts');
var AcMath = require('src/acMath');

var locales = require('src/locales');
var settings = require('src/settings');
var hashParams = require('src/hashParams');

// module itself
var torqueColor = '#ffff00';
var powerColor = '#ff0000';
var fontFamily = 'Segoe UI, sans-serif';

var theme = {
  colors: [ torqueColor, powerColor ],
  chart: {
    backgroundColor: {
      linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
      stops: [ [0, '#2a2a2b'], [1, '#3e3e40'] ]
    },
    style: { fontFamily: fontFamily },
    plotBorderColor: '#606063'
  },
  title: {
    style: {
      color: '#E0E0E3',
      textTransform: 'uppercase',
      fontSize: '20px'
    }
  },
  subtitle: {
    style: {
      color: '#E0E0E3',
      textTransform: 'uppercase'
    }
  },
  xAxis: {
    gridLineColor: '#707073',
    labels: { style: { color: '#E0E0E3' } },
    lineColor: '#707073',
    minorGridLineColor: '#505053',
    tickColor: '#707073',
    title: { style: { color: '#A0A0A3' } }
  },
  yAxis: {
    gridLineColor: '#707073',
    labels: { style: { color: '#E0E0E3' } },
    lineColor: '#707073',
    minorGridLineColor: '#505053',
    tickColor: '#707073',
    tickWidth: 1,
    title: { style: { color: '#A0A0A3' } }
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    style: { color: '#F0F0F0' }
  },
  plotOptions: {
    series: {
      dataLabels: { color: '#B0B0B3' },
      marker: { lineColor: '#333' }
    },
    boxplot: { fillColor: '#505053' },
    candlestick: { lineColor: 'white' },
    errorbar: { color: 'white' }
  },
  legend: {
    itemStyle: { color: '#E0E0E3' },
    itemHoverStyle: { color: '#FFF' },
    itemHiddenStyle: { color: '#606063' },
    maxWidth: 160 * 3,
    itemWidth: 160
  },
  credits: { style: { color: '#666' } },
  labels: { style: { color: '#707073' } },
  drilldown: {
    activeAxisLabelStyle: { color: '#F0F0F3' },
    activeDataLabelStyle: { color: '#F0F0F3' }
  },
  navigation: {
    buttonOptions: {
      symbolStroke: '#DDDDDD',
      theme: { fill: '#505053' }
    }
  },

  // scroll charts
  rangeSelector: {
    buttonTheme: {
      fill: '#505053',
      stroke: '#000000',
      style: { color: '#CCC' },
      states: {
        hover: {
          fill: '#707073',
          stroke: '#000000',
          style: { color: 'white' }
        },
        select: {
          fill: '#000003',
          stroke: '#000000',
          style: { color: 'white' }
        }
      }
    },
    inputBoxBorderColor: '#505053',
    inputStyle: {
      backgroundColor: '#333',
      color: 'silver'
    },
    labelStyle: { color: 'silver' }
  },

  navigator: {
    handles: {
      backgroundColor: '#666',
      borderColor: '#AAA'
    },
    outlineColor: '#CCC',
    maskFill: 'rgba(255,255,255,0.1)',
    series: {
      color: '#7798BF',
      lineColor: '#A6C7ED'
    },
    xAxis: { gridLineColor: '#505053' }
  },

  scrollbar: {
    barBackgroundColor: '#808083',
    barBorderColor: '#808083',
    buttonArrowColor: '#CCC',
    buttonBackgroundColor: '#606063',
    buttonBorderColor: '#606063',
    rifleColor: '#FFF',
    trackBackgroundColor: '#404043',
    trackBorderColor: '#404043'
  },

  // special colors for some of the
  legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
  background2: '#505053',
  dataLabelsColor: '#B0B0B3',
  textColor: '#C0C0C0',
  contrastTextColor: '#F0F0F3',
  maskColor: 'rgba(255,255,255,0.3)'
};

var langChanged = 0;

function init(){
  Highcharts.theme = theme;
  Highcharts.setOptions(Highcharts.theme);

  document.body.addEventListener('langchanged', e => {
    langChanged++;
  }, false);
}

function getTangent(p0, p1){
  return (p1[1] - p0[1]) / Math.abs(p1[0] - p0[0]);
}

function isFinite(value) {
  return typeof value === 'number' && value === value && value !== Infinity && 
      value !== -Infinity;
};

function getBaseCurve(curve, key){
  var result = new Array(curve.length);
  for (var i = 0; i < curve.length; i++){
    var c = curve[i];
    result[i] = [ c[0], c[1].base ];
  }

  return result;
}

function getTurboCurve(curve, key){
  var result = new Array(curve.length);
  var notNull = false;
  for (var i = 0; i < curve.length; i++){
    var c = curve[i];
    var v = c[1].turbo;
    result[i] = [ c[0], v ];
    if (v != 0){
      notNull = true;
    }
  }

  return notNull ? result : null;
}

function getErsCurve(curve, key){
  var result = new Array(curve.length);
  var notNull = false;
  for (var i = 0; i < curve.length; i++){
    var c = curve[i];
    var v = c[1].ers;
    result[i] = [ c[0], v ];
    if (v != 0){
      notNull = true;
    }
  }

  return notNull ? result : null;
}

function optimizeCurve(curve){
  if (curve.length < 3 || !settings.optimize()) return curve;
  return curve;

  /*var optimized = [ curve[0] ];
  var offset = 1;

  for (var i = 1; i < curve.length - 1; i++){
    var prev = curve[i - offset];
    var current = curve[i];
    var next = curve[i + 1];

    var prevTangent = getTangent(prev, current);
    var nextTangent = getTangent(current, next);
    var finalCoefficient = Math.abs(1 - nextTangent / prevTangent);

    if (isFinite(finalCoefficient) && finalCoefficient < 0.07){
      offset++;
    } else {
      optimized.push(current);
      offset = 1;
    }
  }

  optimized.push(curve[curve.length - 1]);
  return optimized;*/
}

function torqueToPower(torque){
  return torque.map(x => [ x[0], AcMath.torqueToPower(x[1], x[0]) ]);
}

function findMaxValue(data){
  var result = 10;
  for (var i = 0; i < data.length; i++){
    var v = data[i][1];
    if (v > result) result = v;
  }
  return result;
}

/*function findSummaryMaxValue(data){
  var base = Math.max(findMaxValue(data.base.power), findMaxValue(data.base.torque));
  if (data.turbo){
    base = Math.max(base, Math.max(findMaxValue(data.turbo.power), findMaxValue(data.turbo.torque)));
  }
  if (data.ers){
    base = Math.max(base, Math.max(findMaxValue(data.ers.power), findMaxValue(data.ers.torque)));
  }
  return base;
}*/

function findSummaryMaxValue(data){
  var base = Math.max(findMaxValue(data.base.power), findMaxValue(data.base.torque));
  if (data.turbo){
    base += Math.max(findMaxValue(data.turbo.power), findMaxValue(data.turbo.torque));
  }
  if (data.ers){
    base += Math.max(findMaxValue(data.ers.power), findMaxValue(data.ers.torque));
  }
  return base;
}

function areCurvesSame(a, b){
  if (a == null || b == null) return a == b;
  if (a.length !== b.length) return false;

  if (a[0][1].hasOwnProperty('base')){
    for (var i = 0; i < a.length; i++){
      var ap = a[i], bp = b[i];
      var av = ap[1];
      var bv = bp[1];
      if (ap[0] !== bp[0] || av.base !== bv.base || av.turbo !== bv.turbo || av.ers !== bv.ers) return false;
    }
    return true;
  } else {
    for (var i = 0; i < a.length; i++){
      var ap = a[i], bp = b[i];
      if (ap[0] !== bp[0] || ap[1] !== bp[1]) return false;
    }
    return true;
  }
}

function createChart(destination, data){
  // max value by Y
  var max = settings.sameY() ? findSummaryMaxValue(data) : null;

  // styles
  var baseStyle = data.turbo ? 'Dash' : data.ers ? 'Dot' : 'Solid';
  var turboStyle = data.ers ? 'Dot' : 'Solid';
  var baseMarker = data.turbo ? 'triangle' : data.ers ? 'diamond' : 'circle';
  var turboMarker = data.ers ? 'diamond' : 'circle';

  // set of series
  var series = [];

  // torque
  if (data.ers){
    series.push({
      name: `${locales.current.torque} (${locales.current.seriesErs})`,
      data: data.ers.torque,
      tooltip: { valueSuffix: ` ${locales.current.nm}` },
      color: torqueColor,
      symbol: 'circle',
    });
  }

  if (data.turbo){
    series.push({
      name: `${locales.current.torque} (${locales.current.seriesTurbo})`,
      data: data.turbo.torque,
      tooltip: { valueSuffix: ` ${locales.current.nm}` },
      color: torqueColor,
      dashStyle: turboStyle,
      marker: { symbol: turboMarker }
    });
  }

  series.push({
    name: data.turbo || data.ers ? `${locales.current.torque} (${locales.current.seriesBase})` : locales.current.torque,
    data: data.base.torque,
    tooltip: { valueSuffix: ` ${locales.current.nm}` },
    color: torqueColor,
    dashStyle: baseStyle,
    marker: { symbol: baseMarker }
  });

  // power
  if (data.ers){
    series.push({
      name: `${locales.current.power} (${locales.current.seriesErs})`,
      yAxis: 1,
      data: data.ers.power,
      tooltip: { valueSuffix: ` ${locales.current.bhp}` },
      color: powerColor,
      marker: { symbol: 'circle' }
    });
  }

  if (data.turbo){
    series.push({
      name: `${locales.current.power} (${locales.current.seriesTurbo})`,
      yAxis: 1,
      data: data.turbo.power,
      tooltip: { valueSuffix: ` ${locales.current.bhp}` },
      color: powerColor,
      dashStyle: turboStyle,
      marker: { symbol: turboMarker }
    });
  }

  series.push({
    name: data.turbo || data.ers ? `${locales.current.power} (${locales.current.seriesBase})` : locales.current.power,
    yAxis: 1,
    data: data.base.power,
    tooltip: { valueSuffix: ` ${locales.current.bhp}` },
    color: powerColor,
    dashStyle: baseStyle,
    marker: { symbol: baseMarker }
  });

  // rounding for tooltips
  function r(v, p){
    return p == 1.0 || !p ? Math.round(v) : Math.round(v * p) / p;
  }

  return new Highcharts.Chart({
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      renderTo: destination,
      style: { fontFamily: fontFamily }
    },
    title: { text: '' },
    xAxis: {
      title: { text: locales.current.rpm },
      min: 0.0
    },
    yAxis: [{
      title: { text: `${locales.current.torque} (${locales.current.nm})` },
      min: 0.0,
      max: max,
      labels: { format: `{value} ${locales.current.nm}` }
    }, {
      title: { text: `${locales.current.power} (${locales.current.bhp})` },
      min: 0.0,
      max: max,
      labels: { format: `{value} ${locales.current.bhp}` },
      opposite: true
    }],
    tooltip: {
      formatter: function (){
        var index = 0;
        var detailsTorque = [];
        var detailsPower = [];

        // torque
        if (data.ers){
          var ersTorque = this.points[index++];
          if (!ersTorque) return null;
          detailsTorque.unshift(`<b>${r(ersTorque.y, 10)}</b> ${locales.current.nm} ${locales.current.seriesFromErs}`);
        }

        if (data.turbo){
          var turboTorque = this.points[index++];
          if (!turboTorque) return null;
          detailsTorque.unshift(`<b>${r(turboTorque.y, 10)}</b> ${locales.current.nm} ${locales.current.seriesFromTurbo}`);
        }

        var baseTorque = this.points[index++];
        if (!baseTorque) return null;

        // power
        if (data.ers){
          var ersPower = this.points[index++];
          if (!ersPower) return null;
          detailsPower.unshift(`<b>${r(ersPower.y, 10)}</b> ${locales.current.bhp} ${locales.current.seriesFromErs}`);
        }

        if (data.turbo){
          var turboPower = this.points[index++];
          if (!turboPower) return null;
          detailsPower.unshift(`<b>${r(turboPower.y, 10)}</b> ${locales.current.bhp} ${locales.current.seriesFromTurbo}`);
        }

        var basePower = this.points[index++];
        if (!basePower) return null;

        // details if needed
        var detailsTorqueStr, detailsPowerStr;
        if (detailsTorque.length){
          detailsTorque.unshift(`<b>${r(baseTorque.y, 10)}</b> ${locales.current.nm} ${locales.current.seriesFromBase}`);
          detailsPower.unshift(`<b>${r(basePower.y, 10)}</b> ${locales.current.bhp} ${locales.current.seriesFromBase}`);
          detailsTorqueStr = ` (${detailsTorque.join(', ')})`;
          detailsPowerStr = ` (${detailsPower.join(', ')})`;
        } else {
          detailsPowerStr = detailsTorqueStr = '';
        }

        // result
        var torque = `<span style="color:${baseTorque.color}">\u25CF</span> ${locales.current.torque}: <b>${r(baseTorque.total, 10)}</b> ${locales.current.nm}${detailsTorqueStr}<br>`;
        var power = `<span style="color:${basePower.color}">\u25CF</span> ${locales.current.power}: <b>${r(basePower.total, 10)}</b> ${locales.current.bhp}${detailsPowerStr}<br>`;
        return `<b>${r(this.x)}</b> ${locales.current.rpm}<br>${torque}${power}`
      },
      shared: true
    },
    plotOptions: {
      line: { marker: { enabled: !!hashParams.markers } },
      series: { animation: false, stacking: 'normal' }
    },
    series: series
  });
}

function getPair(torque, readyPower /*= null*/){
  return {
    torque: optimizeCurve(torque),
    power: optimizeCurve(readyPower || torqueToPower(torque))
  };
}

function getData(originalTorque, originalPower /*= null*/){
  if (originalTorque.length == 0){
    return {
      base: getPair([])
    };
  }

  if (originalTorque[0][1].hasOwnProperty('base')){
    var base = getBaseCurve(originalTorque);
    var turbo = getTurboCurve(originalTorque);
    var ers = getErsCurve(originalTorque);
    return {
      base: getPair(base),
      turbo: turbo == null ? null : getPair(turbo),
      ers: ers == null ? null : getPair(ers),
    };
  }

  return {
    base: getPair(originalTorque, originalPower)
  };
}

function renderChart(destination, originalTorque, originalPower /*= null*/){
  var data = getData(originalTorque, originalPower);
  var originalDataWithoutTurbo = data.turbo == null;
  var originalDataWithoutErs = data.ers == null;

  var chart = createChart(destination, data);
  var localLang = langChanged;

  var timeout = null;

  function update(newTorque, newPower /*= null*/){
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (settings.optimize()){
        if (areCurvesSame(originalTorque, newTorque) && localLang == langChanged) return;
        originalTorque = newTorque;
      } else {
        originalTorque = null;
      }

      data = getData(originalTorque, originalPower);
      console.log(`update chart (${data.base.torque.length * 2} points in total)`);

      if (localLang != langChanged || (data.turbo == null) != originalDataWithoutTurbo || (data.ers == null) != originalDataWithoutErs){
        chart = createChart(destination, data);
        localLang = langChanged;
        originalDataWithoutTurbo = data.turbo == null;
        originalDataWithoutErs = data.ers == null;
      } else {
        if (settings.sameY()){
          var max = findSummaryMaxValue(data);
          chart.yAxis[0].update({ max: max });
          chart.yAxis[1].update({ max: max });
        } else {
          if (chart.yAxis[0].max != null){
            chart.yAxis[0].update({ max: null });
            chart.yAxis[1].update({ max: null });
          }
        }

        var index = 0;
        if (data.ers) chart.series[index++].setData(data.ers.torque);
        if (data.turbo) chart.series[index++].setData(data.turbo.torque);  
        chart.series[index++].setData(data.base.torque);

        if (data.ers) chart.series[index++].setData(data.ers.power);
        if (data.turbo) chart.series[index++].setData(data.turbo.power);  
        chart.series[index++].setData(data.base.power);
      }

      timeout = null;
    }, 200);
  }

  function updateRequired(){
    return localLang != langChanged;
  }

  function hashParamsUpdated(){
    if (chart.options.plotOptions.line.marker.enabled != !!hashParams.markers){
      chart = createChart(destination, data);
    }
  }

  hashParams.addEventListener('updated', hashParamsUpdated);

  function dispose(){
    hashParams.removeEventListener('updated', hashParamsUpdated);
  }

  return {
    update: update,
    updateRequired: updateRequired,
    dispose: dispose,
  };
}

function exportChart(torque, power, width, height, callback){
  var data = getData(torque, power);

  try {
    var node = document.createElement('div');
    node.setAttribute('style', `width:${width}px;height:${height}px;position:fixed;top:-9999px`);

    var chart = createChart(node, data);

    var imgSrc = 'data:image/svg+xml;utf8,' + node.querySelector('svg').outerHTML;
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d');

    document.body.appendChild(canvas);
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);

    var image = new Image;
    image.src = imgSrc;
    image.onload = function () {
      context.drawImage(image, 0, 0);
      Promise.all([
        new Promise((r, j) => {
          require([ 'lib/fileSaver' ], require => r(require('lib/fileSaver')));
        }),
        new Promise((r, j) => {
          canvas.toBlob(r, 'image/png');
        })
      ]).then(all => {
        var fileSaver = all[0];
        var blob = all[1];
        fileSaver(blob, `actorquehelper_${Date.now()}.png`);
        callback && callback();
      });
    };
  } finally {
    try {
      document.body.removeChild(canvas);
    } catch (e){}
  }
}

module.exports = {
  init: init,
  render: renderChart,
  export: exportChart,
};
