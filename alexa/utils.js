/* eslint-disable func-names */
/* eslint-disable no-console */
const axios = require('axios');
const timezoner = require('timezoner');
const geocoder = require('node-geocoder')({ provider: 'google' });
const _ = require('lodash');

const getTimeZoneId = async handlerInput => {
  const getTimeZoneFromLatLong = (lat, long) => {
    return new Promise((resolve, reject) => {
      timezoner.getTimeZone(lat, long, (err, data) => {
        if (err) {
          reject(err);
        } else {
          console.log('timeZone: ', data);
          resolve(data);
        }
      });
    });
  };

  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  
  if (sessionAttributes.timeZoneId !== undefined) {
    return sessionAttributes.timeZoneId;
  } else {
    const accessToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
    const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;

    try {
      const addressResponse = await axios.get(`https://api.amazonalexa.com/v1/devices/${deviceId}/settings/address`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
        
      console.log('Device Address: ', addressResponse.data);
      const geoCodedAddresses = await geocoder.geocode(addressResponse.data.postalCode);

      console.log('addresses: ', geoCodedAddresses);
      const timeZone = await getTimeZoneFromLatLong(geoCodedAddresses[0].latitude, geoCodedAddresses[0].longitude);

      sessionAttributes.timeZoneId = timeZone.timeZoneId;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      return timeZone.timeZoneId;
    } catch(err) {
      console.log('Could not obtain actual timezone, defaulting to America/New_York: ', err);
      return 'America/New_York';
    }
  }
};

const generateBellCurve = async (courseName, data) => {
  const normalY = (x, mean, stdDev) => Math.exp((-0.5) * Math.pow((x - mean) / stdDev, 2));

  const average = (values) => {
    const sum = values.reduce((sum, value) => {
      return sum + value;
    }, 0);

    const avg = sum / values.length;
    return avg;
  };

  const standardDeviation = (values) => {
    const avg = average(values);
    
    const squareDiffs = values.map((value) => {
      const diff = value - avg;
      const sqrDiff = diff * diff;
      return sqrDiff;
    });
    
    const avgSquareDiff = average(squareDiffs);

    const stdDev = Math.sqrt(avgSquareDiff);
    return stdDev;
  };

  const generatePoints = (values) => {
    console.log('values: ', values);
    const stdDev = standardDeviation(values);
    console.log('stdDev: ', stdDev);
    const min = Math.min(...values) - 2 * stdDev;
    console.log('points min', min);
    const max = Math.max(...values) + 2 * stdDev;
    console.log('points max', max);
    const unit = (max - min) / 100;
    console.log('points unit', unit);
    return _.range(min, max, unit);
  }

  const mean = average(data);
  console.log('mean: ', mean);
  const stdDev = standardDeviation(data);
  console.log('stdDev: ', stdDev);
  const points = generatePoints(data);
  console.log('points: ', points);


  const seriesData = points.map(x => ({ x, y: normalY(x, mean, stdDev)}));
  console.log('seriesData: ', seriesData);

  const options = {
    exporting: {
      url: 'https://export.highcharts.com/'
    },
    title: {
      text: `${courseName} Student Grades`
    },
    chart: {
      type: 'area',
    },
    xAxis: {
      title: {
        enabled: true,
        text: 'Score'
      }
    },
    yAxis: {
      labels: {
        enabled: false,   
      },
      gridLineWidth: 0,
      title: ''
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      area: {
        enableMouseTracking: false,
      },
      scatter: {
        marker: {
          radius: 8
        }
      }
    },
    series: [{
      data: seriesData,
      marker: {
        radius: 0
      }
    }, 
    {
      name: 'Data',
      type: 'scatter',
      data: data.map( x => [x, 0.6] ),
      color: 'green',
      marker: {
        symbol: 'circle',
        radius: 4
      }
    }]
  };

  console.log('Calling highcharts API with params: ', options);
  const highChartResponse = await axios.post('https://export.highcharts.com/', {
    options: options,
    type: 'image/png',
    scale: false,
    styledMode: false,
    width: false,
    async: true
  });

  const bellCurveUrl = 'https://export.highcharts.com/' + highChartResponse.data;
  console.log('BellCurve URL: ', bellCurveUrl);
  return bellCurveUrl;
};

var exports = module.exports;
exports.getTimeZoneId = getTimeZoneId;
exports.generateBellCurve = generateBellCurve;
