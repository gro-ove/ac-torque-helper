// usings
var Highcharts = require('lib/highcharts');
var AcMath = require('src/acMath');

var locales = require('src/locales');
var settings = require('src/settings');

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
    itemHiddenStyle: { color: '#606063' }
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

function optimizeCurve(curve){
  if (curve.length < 3 || !settings.optimize()) return curve;

  var optimized = [ curve[0] ];
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
  return optimized;
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

function areCurvesSame(a, b){
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++){
    var ap = a[i], bp = b[i];
    if (ap[0] !== bp[0] || ap[1] !== bp[1]) return false;
  }
  return true;
}

function createChart(destination, torque, power){
  var max = settings.sameY() ? Math.max(findMaxValue(power), findMaxValue(torque)) : null;
  return new Highcharts.Chart({
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      renderTo: destination,
      style: { fontFamily: fontFamily }
    },
    title: { text: '' },
    xAxis: {
      title: { text: locales.current.rpm }
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
      headerFormat: `<b>{point.x:.0f}</b> ${locales.current.rpm}<br>`,
      pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y:.1f}</b> {series.tooltipOptions.valueSuffix}<br>',
      shared: true
    },
    plotOptions: {
      line: { marker: { enabled: false } },
      series: { animation: false }
    },
    series: [{
      name: locales.current.torque,
      data: torque,
      tooltip: { valueSuffix: ` ${locales.current.nm}` }
    }, {
      name: locales.current.power,
      yAxis: 1,
      data: power,
      tooltip: { valueSuffix: ` ${locales.current.bhp}` }
    }]
  });
}

function renderChart(destination, torque, power /*= null*/){
  torque = optimizeCurve(torque);

  if (power == null) power = torqueToPower(torque);
  power = optimizeCurve(power);

  var chart = createChart(destination, torque, power);
  var localLang = langChanged;

  function update(newTorque, newPower /*= null*/){
    newTorque = optimizeCurve(newTorque);

    if (areCurvesSame(torque, newTorque) && localLang == langChanged) return;
    torque = newTorque;

    if (newPower == null) newPower = torqueToPower(newTorque);
    newPower = optimizeCurve(newPower);

    console.log(`update chart (${newTorque.length + newPower.length} points in total)`);

    if (localLang != langChanged){
      chart = createChart(destination, newTorque, newPower);
      localLang = langChanged;
    } else {
      if (settings.sameY()){
        var max = Math.max(findMaxValue(newPower), findMaxValue(newTorque));
        chart.yAxis[0].update({ max: max });
        chart.yAxis[1].update({ max: max });
      } else {
        if (chart.yAxis[0].max != null){
          chart.yAxis[0].update({ max: null });
          chart.yAxis[1].update({ max: null });
        }
      }

      chart.series[0].update({ data: newTorque }, true);
      chart.series[1].update({ data: newPower }, true);
    }
  }

  function updateRequired(){
    return localLang != langChanged;
  }

  return {
    update: update,
    updateRequired: updateRequired
  };
}

function exportChart(torque, power, width, height, callback){
  if (power == null) power = torqueToPower(torque);

  try {
    var node = document.createElement('div');
    node.setAttribute('style', `width:${width}px;height:${height}px;position:fixed;top:-9999px`);

    var chart = createChart(node, torque, power);

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
    document.body.removeChild(canvas);
  }
}

module.exports = {
  init: init,
  render: renderChart,
  export: exportChart,
};
