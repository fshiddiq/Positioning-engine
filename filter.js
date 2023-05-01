import fs from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
const createCsvWriter = createObjectCsvWriter;

const results = [];
fs.createReadStream('./2023-04-29_15_55_influxdb_data.csv')
  .pipe(csv({ separator: ';'}))
  .on('data', (data) => results.push(data))
  .on('end', () => {
    // Perform any additional data processing here
    const processedData = processData(results);
  });
  
function processData(data) {
  const rssi = results.map((row) => row['Column5']);
  const timeStamp = results.map((row) => row['Column4']);
  const gateway   = results.map((row) => row['Column7']);

  let dataArray = [[0],[0],[0]];
  let gatewayCounter = 0;
  const limit = 1000;
  //console.log(dataArray);
  dataArray[gatewayCounter].push(parseInt(rssi[0])); 
  // TODO: array kedua perlu dibuat jadi dinamis
 
  for (let i = 1; i < gateway.length; i++) {
    if (gateway[i] == gateway[i-1]){
      if(dataArray[gatewayCounter].length < limit+1){
        dataArray[gatewayCounter].push(parseInt(rssi[i])); 
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

  const windowSize = 10; // set the window size for the moving average
  const maArray = []; // initialize an empty array to store the moving average values
  let index=0;

  // loop through the rssiArray and calculate the moving average
  for(let k=0;k<3;k++){

    index=0;
    for (let i = 0; i < dataArray[k].length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - windowSize + 1; j <= i; j++) {
        if (j < 0) continue; // skip values outside of the array index
        sum += parseInt(dataArray[k][j]);
        count += 1;
      }

      let aRow={};
      if(typeof maArray[index] == "object"){
        aRow=maArray[index];
      }
      
      aRow[k] = sum / count;
      aRow[k+3] = dataArray[k][i];
      maArray[index++] = aRow; // push the moving average value to the maArray
      
    }
  }
  
  // Define the headers for the CSV file
  const csvWriter = createCsvWriter({
      path: 'output3.csv',
      header: [
          {id: '0', title: '0'},
          {id: '1', title: '1'},
          {id: '2', title: '2'},
          {id: '3', title: '3'},
          {id: '4', title: '4'},
          {id: '5', title: '5'}
      ]
  });
  
  // Write the data to the CSV file
  csvWriter.writeRecords(maArray)
      .then(() => {
          console.log('CSV file created successfully');
      });

  //console.log(maArray);
  let obj = maArray[maArray.length-1];
  console.log(obj[0]);
  const position = calculatePosition(obj[0], obj[1], obj[2]);
}

function calculatePosition(rssi1, rssi2, rssi3) {
  const d1 = rssiToDistance(rssi1);
  const d2 = rssiToDistance(rssi2);
  const d3 = rssiToDistance(rssi3);
  console.log(d1, d2, d3);

  // Find the position of the target device using trilateration
  const x1 = 0, y1 = 0; // position of the first reference point
  const x2 = 5, y2 = 0; // position of the second reference point
  const x3 = 2.5, y3 = 5; // position of the third reference point

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

  return { x, y };
}

function rssiToDistance(rssi) {
  // Convert RSSI to distance using a formula such as the one in the previous example
  // For example, the following formula can be used: distance = 10 ^ ((txPower - rssi) / (10 * n))
  const txPower = -60; // transmit power of the beacon (in dBm)
  const n = 2.4; // path loss exponent (varies depending on the environment)
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));
  return distance;
}

// Example usage
//const position = calculatePosition(-70, -80, -90);
//console.log(position); // { x: 2.273684210526316, y: 1.0535087719298245 }
