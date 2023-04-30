import fs from 'fs';
import csv from 'csv-parser';
import { Chart } from 'chart.js/auto';

const results = [];
fs.createReadStream('D:/Work/ATERI/WIT/SCBD Habitat/Positioning engine/2023-04-29_15_55_influxdb_data.csv')
  .pipe(csv({ separator: ';'}))
  .on('data', (data) => results.push(data))
  .on('end', () => {
    // Perform any additional data processing here
    const processedData = processData(results);
    //processData(results);

    // Create the chart outside of the createReadStream() method
    const labels = "test";
    createChart(labels, processedData);
  });

  
function processData(data) {
    // Process the data here
    // ...
    const processedData = results.map((row) => row['Column5']);
    console.log(processedData);

    return processedData;
  }

function createChart(labels, data) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Data',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true
            }
          }]
        }
      }
    });
  }