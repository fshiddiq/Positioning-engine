import fs from 'fs';
import csv from 'csv-parser';
import { InfluxDB, Point } from '@influxdata/influxdb-client'
import { createObjectCsvWriter } from 'csv-writer';
const createCsvWriter = createObjectCsvWriter;

(async () => {
  async function get() {
    const queryApi = new InfluxDB({ url: 'http://64.226.117.91:8086', token: '32KaIOSNxXgcOzzDenFMfX34DeJlVVbzkGL9Nv0PIhCCJP5T9iIqoX8EaY4hE_LunHRh3f2k25ntm1k6lCHA2w==' }).getQueryApi('zoo');
    const writeApi = new InfluxDB({ url: 'http://64.226.117.91:8086', token: '32KaIOSNxXgcOzzDenFMfX34DeJlVVbzkGL9Nv0PIhCCJP5T9iIqoX8EaY4hE_LunHRh3f2k25ntm1k6lCHA2w==' }).getWriteApi('zoo', 'zoo');

    const fluxQuery = 'from(bucket: "zoo")\
      |> range(start: -2m)\
      |> filter(fn: (r) => r["_measurement"] == "beacon")\
      |> filter(fn: (r) => r["beacon_id"] == "BC5729031381")\
      |> filter(fn: (r) => r["_field"] == "rssi")\
      |> drop(columns: ["_measurement", "_start", "_stop"])'

    const resultQuery = await queryApi.collectRows(fluxQuery)
    const gatewayData0 = []
    const gatewayData1 = []
    const gatewayData2 = []

    for (let allIndex = 0; allIndex < resultQuery.length; allIndex++) {
      if (resultQuery[allIndex].gateway_id == "94A408B2EE24") {
        gatewayData0.push(resultQuery[allIndex])
      } else if (resultQuery[allIndex].gateway_id == "94A408B60B80") {
        gatewayData1.push(resultQuery[allIndex])
      } else if (resultQuery[allIndex].gateway_id == "94A408B60BAC") {
        gatewayData2.push(resultQuery[allIndex])
      }
    }

    //console.log(gatewayData0)
    const rssi0 = processData(gatewayData0)
    const rssi1 = processData(gatewayData1)
    const rssi2 = processData(gatewayData2)

    const position = calculatePosition(rssi0["94A408B2EE24"], rssi1["94A408B60B80"], rssi2["94A408B60BAC"]);

    const point = new Point('position')
    point.floatField('94A408B2EE24', position.d1)
    point.floatField('94A408B60B80', position.d2)
    point.floatField('94A408B60BAC', position.d3)
    point.floatField('x', position.x)
    point.floatField('y', position.y)
    point.tag('beacon_id', 'BC5729031381')
    console.log(point)
    writeApi.writePoint(point)
    await writeApi.close()
  }

  setInterval(get, 4000)
})()


function processData(data) {
  const rssi = data.map((row) => row['_value']);
  const timeStamp = data.map((row) => row['_time']);
  const gateway = data.map((row) => row['gateway_id']);

  let dataArray = [[0], [0], [0]];
  let gatewayCounter = 0;
  let gatewayNo = [];
  const limit = data.length;
  dataArray[gatewayCounter].push(parseInt(rssi[0]));
  // TODO: array kedua perlu dibuat jadi dinamis

  for (let i = 1; i < gateway.length; i++) {
    if (gateway[i] == gateway[i - 1]) {
      if (dataArray[gatewayCounter].length < limit + 1) {
        dataArray[gatewayCounter].push(parseInt(rssi[i]));
        gatewayNo[gatewayCounter] = gateway[i];
      }
    } else {
      gatewayCounter++;
    }
  }
  dataArray[0].shift();
  dataArray[1].shift();
  dataArray[2].shift();
  gatewayCounter = 0;

  //console.log(dataArray);

  const windowSize = 20; // set the window size for the moving average
  const maArray = []; // initialize an empty array to store the moving average values
  let index = 0;

  //console.log(gatewayNo);
  // loop through the rssiArray and calculate the moving average
  for (let k = 0; k < 3; k++) {
    index = 0;
    for (let i = 0; i < dataArray[k].length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - windowSize + 1; j <= i; j++) {
        if (j < 0) continue; // skip values outside of the array index
        sum += parseInt(dataArray[k][j]);
        count += 1;
      }

      let aRow = {};
      if (typeof maArray[index] == "object") {
        aRow = maArray[index];
      }

      aRow[gatewayNo[k]] = sum / count;
      aRow[k] = dataArray[k][i];
      maArray[index++] = aRow; // push the moving average value to the maArray
    }
  }

  return maArray[maArray.length - 1];

}

function calculatePosition(rssi1, rssi2, rssi3) {
  const d1 = rssiToDistance0(rssi1);
  const d2 = rssiToDistance1(rssi2);
  const d3 = rssiToDistance2(rssi3);
  // console.log(d1, d2, d3);

  // Find the position of the target device using trilateration
  const x1 = 2.43, y1 = 0; // position of the first reference point
  const x2 = 0, y2 = 3.82; // position of the second reference point
  const x3 = 7.24, y3 = 5.66; // position of the third reference point

  // Calculate the coefficients of a system of equations to solve for the x and y coordinates of the target device
  const A = 2 * x2 - 2 * x1;
  const B = 2 * y2 - 2 * y1;
  const C = d1 * d1 - d2 * d2 - x1 * x1 + x2 * x2 - y1 * y1 + y2 * y2;
  const D = 2 * x3 - 2 * x2;
  const E = 2 * y3 - 2 * y2;
  const F = d2 * d2 - d3 * d3 - x2 * x2 + x3 * x3 - y2 * y2 + y3 * y3;

  // Solve for the x and y coordinates of the target device
  const x = (C * E - F * B) / (E * A - B * D);
  const y = (C * D - A * F) / (B * D - A * E);

  return { x, y, d1, d2, d3 };
}

function rssiToDistance0(rssi) {
  const txPower = -61.3; // transmit power of the beacon (in dBm)
  const n = 2.3; // path loss exponent (varies depending on the environment)
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));
  return distance;
}

function rssiToDistance1(rssi) {
  const txPower = -65; // transmit power of the beacon (in dBm)
  const n = 2; // path loss exponent (varies depending on the environment)
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));
  return distance;
}

function rssiToDistance2(rssi) {
  const txPower = -59.7; // transmit power of the beacon (in dBm)
  const n = 2.4; // path loss exponent (varies depending on the environment)
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));
  return distance;
}
//const position = calculatePosition(-70, -80, -90);
//console.log(position); // { x: 2.273684210526316, y: 1.0535087719298245 }
