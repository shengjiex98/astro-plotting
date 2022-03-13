"use strict";
import { sortStarDuplicates, sortStarid, starData } from "./chart-cluster-utils/chart-gaia-util";
import Chart from "chart.js/auto";
import Handsontable from "handsontable";
import { colors, tableCommonOptions } from "./config";
import {linkInputs, throttle, updateLabels, updateTableHeight, } from "./util";
import zoomPlugin from 'chartjs-plugin-zoom';
import {ChartScaleControl, graphScale, updateScatter } from "./chart-cluster-utils/chart-cluster-scatter";
import { insertClusterControls } from "./chart-cluster-utils/chart-cluster-interface";
import { dummyData } from "./chart-cluster-utils/chart-cluster-dummy";
import { HRrainbow } from "./chart-cluster-utils/chart-cluster-util";
import { updateHRModel } from "./chart-cluster-utils/chart-cluster-model";

Chart.register(zoomPlugin);
/**
 *  This function is for the moon of a planet.
 *  @returns {[Handsontable, Chart, modelForm, graphScale]}:
 */
export function cluster1(): [Handsontable, Chart[], ModelForm, graphScale] {
  insertClusterControls();
  //make graph scaling options visible to users
  document.getElementById('axis-label1').style.display = 'inline';
  document.getElementById('axis-label3').style.display = 'inline';
  document.getElementById('xAxisPrompt').innerHTML = "X Axis";
  document.getElementById('yAxisPrompt').innerHTML = "Y Axis";
  //Declare UX forms. Seperate based on local and server side forms.
  const clusterForm = document.getElementById("cluster-form") as ClusterForm;
  const modelForm = document.getElementById("model-form") as ModelForm;

  // Link each slider with corresponding text box
  linkInputs(clusterForm["d"], clusterForm["d_num"], 0.1, 100, 0.01, 3, true);
  linkInputs(clusterForm["err"], clusterForm["err_num"], 0, 1, 0.01, 1, false, true, 0, 100000000);
  linkInputs(modelForm["age"], modelForm["age_num"], 6.6, 10.3, 0.01, 6.6);
  linkInputs(clusterForm["red"], clusterForm["red_num"], 0, 1, 0.01, 0, false, true, 0, 100000000);
  linkInputs(modelForm["metal"], modelForm["metal_num"], -3.4, 0.2, 0.01, -3.4);
  //default dummy data from util.ts
  const tableData = dummyData;

  //declare graphScale limits
  let graphMinMax = new graphScale();

  // create table
  const container = document.getElementById("table-div");
  const hot = new Handsontable(
    container,
    Object.assign({}, tableCommonOptions, {
      data: tableData,
      colHeaders: ["B Mag", "Berr", "V Mag", "Verr", "R Mag", "Rerr", "I Mag", "Ierr"], // need to change to filter1, filter2
      columns: [
        { data: "B", type: "numeric", numericFormat: { pattern: { mantissa: 2 } }, },
        { data: "Berr", type: "numeric", numericFormat: { pattern: { mantissa: 2 } }, },
        { data: "V", type: "numeric", numericFormat: { pattern: { mantissa: 2 } }, },
        { data: "Verr", type: "numeric", numericFormat: { pattern: { mantissa: 2 } }, },
        { data: "R", type: "numeric", numericFormat: { pattern: { mantissa: 2 } }, },
        { data: "Rerr", type: "numeric", numericFormat: { pattern: { mantissa: 2 } }, },
        { data: "I", type: "numeric", numericFormat: { pattern: { mantissa: 2 } }, },
        { data: "Ierr", type: "numeric", numericFormat: { pattern: { mantissa: 2 } }, },
      ],
      hiddenColumns: { columns: [1, 3, 4, 5, 6, 7] },
    })
  );
  // create chart
  const canvas = document.getElementById("myChart") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");

  const myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Model", "Data"],
      datasets: [
        {
          type: "line",
          label: "Model",
          data: null, // will be generated later
          borderColor: colors["black"],
          backgroundColor: colors["black"],
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
          fill: false,
          immutableLabel: true,
          parsing: {}//This fixes the disappearing issue. Why? What do I look like, a CS major?
        },
        {
          type: "line",
          label: "Model2",
          data: null, // will be generated later
          borderColor: colors["black"],
          backgroundColor: colors["black"],
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
          fill: false,
          immutableLabel: true,
          parsing: {}//This fixes the disappearing issue. Why? What do I look like, a CS major?
        },
        {
          type: "scatter",
          label: "Data",
          data: [{ x: 0, y: 0 }],
          backgroundColor: colors["gray"],
          borderColor: colors["black"],
          borderWidth: 0.2,
          fill: false,
          showLine: false,
          pointRadius: 2,
          pointHoverRadius: 7,
          immutableLabel: false,
          parsing: {}
        },
      ],
    },
    options: {
      hover: { mode: "nearest", },
      scales: {
        x: {
          //label: 'B-V',
          type: "linear",
          position: "bottom",
        },
        y: {
          //label: 'V',
          reverse: true,
          suggestedMin: 0,
        },
      },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            mode: 'x',
          },
        },
        // legend: {
        //   onClick: newLegendClickHandler,
        // }
        legend: {
          labels: {

            filter: function (item) {
              // Logic to remove a particular legend item goes here
              return !item.text.includes('Model2');
            }
          }
        }
      }
    },
  });

  //create graph control buttons and assign onZoom onPan functions to deactivate radio button selections
  let graphControl = new ChartScaleControl([myChart], modelForm, graphMinMax);
  myChart.options.plugins.zoom.zoom.onZoom = ()=>{graphControl.zoompanDeactivate(modelForm)}
  myChart.options.plugins.zoom.pan.onPan = ()=>{graphControl.zoompanDeactivate(modelForm)}

  //Adjust the gradient with the window size
  window.onresize = function () {
    setTimeout(function () {
      myChart.data.datasets[2].backgroundColor = HRrainbow(myChart,
        modelForm["red"].value, modelForm["blue"].value)
      myChart.update()
    }, 10)
  }

  //update table height and scatter plotting
  const update = function () {
    updateTableHeight(hot);
    updateScatter(hot, [myChart], clusterForm, modelForm, [2], graphMinMax);
  };

  // link chart to table
  hot.updateSettings({
    afterChange: update,
    afterRemoveRow: update,
    afterCreateRow: update,
  });

  //update scatter plotting when clusterFrom being updated by user
  const fps = 100;
  const frameTime = Math.floor(1000 / fps);
  clusterForm.oninput = throttle(
    function () {
      updateScatter(hot, [myChart], clusterForm, modelForm, [2], graphMinMax);
    },
    frameTime);

  // link chart to model form (slider + text). BOTH datasets are updated because both are affected by the filters.
  modelForm.oninput = throttle(function () {
    updateHRModel(modelForm, hot, [myChart], (chartNum: number) => {
      updateScatter(hot, [myChart], clusterForm, modelForm, [2], graphMinMax, chartNum);
    });
  }, 100);


  //initializing website
  update();
  updateHRModel(modelForm, hot, [myChart]);
  document.getElementById("extra-options").style.display = "block";
  document.getElementById("standardView").click();

  myChart.options.plugins.title.text = "Title";
  myChart.options.scales["x"].title.text = "x";
  myChart.options.scales["y"].title.text = "y";
  updateLabels(
    myChart,
    document.getElementById("chart-info-form") as ChartInfoForm,
    false,
    false,
    false,
    false
  );
  
  return [hot, [myChart], modelForm, graphMinMax];
}







