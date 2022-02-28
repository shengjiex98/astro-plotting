"use strict";

import Chart from "chart.js/auto";
import Handsontable from "handsontable";
import { ScatterDataPoint } from "chart.js";
import {
  calculateLambda,
  dummyData,
  filterMags,
  filterWavelength,
  HRModelRounding,
  HRrainbow,
  httpGetAsync,
  pointMinMax,
  graphScale,
  ChartScaleControl
} from "./chart-cluster-util";
import { colors, tableCommonOptions } from "./config";
import { changeOptions, linkInputs, throttle, updateLabels, updateTableHeight, } from "./util";
import zoomPlugin from 'chartjs-plugin-zoom';
import { median } from "./my-math";

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
            onPan: () => { ChartScaleControl.zoompanDeactivate() },
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

/**
 * This function handles the uploaded file to the variable chart. Specifically, it parse the file
 * and load related information into the table.
 * DATA FLOW: file -> table
 * @param {Event} evt The uploadig event
 * @param {Handsontable} table The table to be updated
 * @param {Chartjs} myCharts The chart to be plotted
 * @param {graphScale} graphMaxMin the graphScale object that includes chart bounding information
 */
export function clusterFileUpload(
  evt: Event,
  table: Handsontable,
  myCharts: Chart[],
  graphMaxMin: graphScale,
) {
  // console.log("clusterFileUpload called");
  const file = (evt.target as HTMLInputElement).files[0];

  if (file === undefined) {
    return;
  }

  // File type validation
  if (
    !file.type.match("(text/csv|application/vnd.ms-excel)") &&
    !file.name.match(".*.csv")
  ) {
    console.log("Uploaded file type is: ", file.type);
    console.log("Uploaded file name is: ", file.name);
    alert("Please upload a CSV file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const clusterForm = document.getElementById("cluster-form") as ClusterForm;
    const modelForm = document.getElementById("model-form") as ModelForm;
    clusterForm["d"].value = Math.log(3).toString();
    clusterForm["err"].value = "1";
    clusterForm["err"].value = "1";
    clusterForm["err_num"].value = "1";
    modelForm["age"].value = "6.6";
    clusterForm["red"].value = "0";
    modelForm["metal"].value = "-3.4";
    clusterForm["err_num"].value = "1";
    clusterForm["d_num"].value = "3";
    modelForm["age_num"].value = "6.6";
    clusterForm["red_num"].value = "0";
    modelForm["metal_num"].value = "-3.4";
    const data: string[] = (reader.result as string)
        .split("\n")
        .filter((str) => str !== null && str !== undefined && str !== "");
    const datadict = new Map<string, Map<string, number>>(); // initializes a dictionary for the data
    let filters: string[] = [];
    data.splice(0, 1);
    //fills the dictionary datadict with objects for each source, having attributes of each filter magnitude
    for (const row of data) {
      let items = row.trim().split(",");
      let src = items[1];
      let filter = items[10] === "K" ? "Ks" : items[10];//interpret K as Ks
      let mag = parseFloat((items.length >= 24 && items[23] != '') ? items[23] : items[12]);//if no calibrated mag, return mag
      // let mag = parseFloat(items[12]);
      let err = parseFloat(items[13]);
      if (!datadict.has(src)) {
        datadict.set(src, new Map<string, number>());
      }
      if (items[12] !== "") {
        datadict.get(src).set(filter, isNaN(mag) ? null : mag);
        datadict.get(src).set(filter + "err", isNaN(err) ? 0 : err);
        if (!filters.includes(filter)) {
          filters.push(filter);
        }
      }
    }
    //add null values for sources that didn't show up under each filter
    for (const src of datadict.keys()) {
      for (const f of filters) {
        if (!datadict.get(src).has(f)) {
          datadict.get(src).set(f, null);
          datadict.get(src).set(f + "err", null);
        }
      }
    }

    let blue = modelForm[modelFormKey(0, 'blue')];
    let red = modelForm[modelFormKey(0, 'red')];
    let lum = modelForm[modelFormKey(0, 'lum')];

    //order filters by temperature
    const knownFilters = ["U", "uprime", "B", "gprime", "V", "vprime", "rprime", "R", "iprime", "I", "zprime", "Y", "J", "H", "Ks", "K",];
    //knownFilters is ordered by temperature; this cuts filters not in the file from knownFilters, leaving the filters in the file in order.
    filters = knownFilters.filter((f) => filters.indexOf(f) >= 0);
    //if it ain't known ignore it

    const optionList = [];
    const headers: any[] = [];
    const columns: any[] = [];
    let hiddenColumns: any[] = [];
    for (let i = 0; i < filters.length; i++) {
      //makes a list of options for each filter
      optionList.push({
        value: filters[i],
        title: filters[i] + " Mag",
        text: filters[i],
      });
      hiddenColumns[i] = i;
      hiddenColumns[i + filters.length] = i + filters.length; //we have to double up the length for the error data
      headers.push(filters[i] + " Mag"); //every other column is err
      headers.push(filters[i] + "err");
      columns.push({
        data: filters[i],
        type: "numeric",
        numericFormat: {pattern: {mantissa: 2}},
      });
      columns.push({
        data: filters[i] + "err",
        type: "numeric",
        numericFormat: {pattern: {mantissa: 2}},
      });
    }
    hiddenColumns = hiddenColumns.filter((c) => [0, 2].indexOf(c) < 0); //get rid of the columns we want revealed

    //convrt datadict from dictionary to nested number array tableData
    const tableData: { [key: string]: number }[] = [];
    datadict.forEach((src) => {
      const row: { [key: string]: number } = {};
      for (let filterIndex in filters) {
        row[filters[filterIndex]] = src.get(filters[filterIndex]);
        row[filters[filterIndex] + "err"] = src.get(
            filters[filterIndex] + "err"
        );
      }
      tableData.push(row);
    });
    for (let c = 0; c < myCharts.length; c++) {
      let myChart = myCharts[c] as Chart<'line'>;
      myChart.options.plugins.title.text = "Title";
      myChart.data.datasets[2].label = "Data";
      myChart.options.scales['x'].title.text = ('x' + (c+1).toString());
      myChart.options.scales['y'].title.text = ('y' + (c+1).toString());
      updateLabels(myChart, document.getElementById("chart-info-form") as ChartInfoForm, false, false, false, false, c);

      //Change filter options to match file
      blue = modelForm[modelFormKey(c, 'blue')];
      red = modelForm[modelFormKey(c, 'red')];
      lum = modelForm[modelFormKey(c, 'lum')];

      //Change the options in the drop downs to the file's filters
      //blue and lum are most blue by default, red is set to most red
      changeOptions(blue, optionList);
      changeOptions(red, optionList);
      //red.value = red.options[red.options.length-1].value;
      changeOptions(lum, optionList);

      blue.value = filters[0];
      red.value = filters[1];
      lum.value = filters[1];

      updateHRModel(modelForm, table, [myChart],
          () => {
            table.updateSettings({
              data: tableData,
              colHeaders: headers,
              columns: columns,
              hiddenColumns: {columns: hiddenColumns},
            }); //hide all but the first 3 columns
            updateTableHeight(table);
            graphMaxMin.updateMode('auto', c);
            updateScatter(table, [myChart], clusterForm, modelForm, [2], graphMaxMin);
            document.getElementById("standardView").click();
          });
    }
  };
  reader.readAsText(file);
}

/**
 *  This function takes a form to obtain the 5 parameters (age, metallicity, red, blue, and lum filter)
 *  request HR diagram model from server and plot on the graph.
 *  @param table:     A table used to determine the max and min value for the range
 *  @param form:      A form containing the 5 parameters (age, metallicity, red, blue, and lum filter)
 *  @param chart:     The Chartjs object to be updated.
 *  @param callback:  callback function asynchronously execute stuff after model is updated
 */
export function updateHRModel(modelForm: ModelForm, hot: Handsontable, charts: Chart[], callback: Function = () => { }) {
  function modelFilter(dataArray: number[][]): [ScatterDataPoint[], ScatterDataPoint[], { [key: string]: number }] {
    let form: ScatterDataPoint[] = [] //the array containing all model points
    let scaleLimits: { [key: string]: number } = {minX: NaN, minY: NaN, maxX: NaN, maxY: NaN,};
    let deltas: number[] = [NaN];
    let deltaXs: number [] = [NaN];
    let deltaYs: number [] = [NaN];
    let maxDeltaIndex: number = 0;
    let count: number[] = [0];
    for (let i = 0; i < dataArray.length; i++) {
      let x_i: number = dataArray[i][0];
      let y_i: number = dataArray[i][1];
      let row: ScatterDataPoint = {x: x_i, y: y_i};
      scaleLimits = pointMinMax(scaleLimits, dataArray[i][0], dataArray[i][1]);
      form.push(row);
      if (i > 0) {
        let deltaX: number = Math.abs(x_i - dataArray[i - 1][0]);
        let deltaY: number = Math.abs(y_i - dataArray[i - 1][1]);
        deltaXs.push(deltaX);
        deltaYs.push(deltaY);
      }
    }
    let xMedianValue: number = median(deltaXs);
    let yMedianValue: number = median(deltaYs);
    //From the beginning of delta_i, find the nth = 1st i such that delta_i < sqrt(2).
    // Call it iBeg. KEEP all points before iBeg.
    let N = deltaXs.length
    let c1: number = 0;
    let c2: number = 0;
    let c3: number = 0;
    for (let i = 0; i < N; i++) {
      let delta = 0
      if (i > 0) {
        delta = ((deltaXs[i] / xMedianValue) ** 2 + (deltaYs[i] / yMedianValue) ** 2) ** 0.5
        if (delta < (2 ** 0.5)) {
          count.push(count[i-1] - 1)
        } else {
          count.push(count[i-1] + 1)
        }
      }
      let sqaure: number = (i ** 2) - N*i
      c1 += count[i] * sqaure;
      c2 += i * sqaure;
      c3 += sqaure ** 2;
      deltas.push(delta);
    }
    let countN = count[N-1]
    c2 *= countN/N;
    let c = (c1 - c2) / c3
    let b = countN/N - c*N

    // let a: number = 0;
    // let y: number[] = [0];
    // for (let i = 1; i <= N; i++) {
    //   y.push((a + b * i + c * i ** 2))
    // }
    // console.log(y)

    //From the end of delta_i, find the nth = 1st i such that delta_i < sqrt(2).
    // Call it iEnd. REMOVE all points after iEnd.
    let iBeg: number = 0; //init iBeg to be 0
    let iEnd: number = N; //init iEnd as the last the last count
    let min = 0;
    let max = 0;
    deltas.shift();
    for (let i = 1; i <= N; i++) {
      // let temp = count[i] - i/N*count[N+1]
      let temp = count[i] - (b * i + c * (i ** 2));
      if (temp < min) {
        min = temp;
        iEnd = i;
      } else if (temp >= max) {
        max = temp;
        iBeg = i;
      }
    }
    if (iBeg > iEnd) {
      iBeg = 0;
      max = 0;
      for (let i = 1; i < iEnd; i++) {
        let temp = count[i] - i/(N)*count[N-1]
        if (temp >= max) {
          max = temp;
          iBeg = i;
        }
      }
    }
    maxDeltaIndex = deltas.indexOf(Math.max.apply(null, deltas.slice(iBeg-1, iEnd+1)));
    return [form.slice(0, maxDeltaIndex), form.slice(maxDeltaIndex, iEnd), scaleLimits]
  }

  function generateURL(form: ModelForm, chartNum: number) {
    let blueKey = modelFormKey(chartNum, 'blue')
    let redKey = modelFormKey(chartNum, 'red')
    let lumKey = modelFormKey(chartNum, 'lum')
    return "http://localhost:5000/isochrone?" //local testing url
    //return "http://152.2.18.8:8080/isochrone?" //testing server url
    // return "https://skynet.unc.edu/graph-api/isochrone?" //production url
        + "age=" + HRModelRounding(form['age_num'].value)
        + "&metallicity=" + HRModelRounding(form['metal_num'].value)
        + "&filters=[%22" + form[blueKey].value
        + "%22,%22" + form[redKey].value
        + "%22,%22" + form[lumKey].value + "%22]"
  }

  let reveal: string[] = [];
  for (let c = 0; c < charts.length; c++) {
    let chart = charts[c];
    reveal = reveal.concat(modelFormKeys(c, modelForm));
    httpGetAsync(generateURL(modelForm, c),
        (response: string) => {
          let dataTable: number[][] = JSON.parse(response);
          let filteredModel = modelFilter(dataTable);
          chart.data.datasets[0].data = filteredModel[0];
          chart.data.datasets[1].data = filteredModel[1];
          chart.update("none");
          callback(c);
        },
        () => {
          callback(c);
        },
    );
  }
  //update table
  let columns: string[] = hot.getColHeader() as string[];
  let hidden: number[] = [];
  for (const col in columns) {
    columns[col] = columns[col].substring(0, columns[col].length - 4); //cut off " Mag"
    if (!reveal.includes(columns[col])) {
      //if the column isn't selected in the drop down, hide it
      hidden.push(parseFloat(col));
    }
  }
  hot.updateSettings({hiddenColumns: {columns: hidden, indicators: false,}});
}

/**
 *  This function updates scatter data and the boudning scale of the graph
 *  @param table:         handsontable containing the data
 *  @param myCharts:      array of chart.js objects, depends on how many you have
 *  @param modelForm:     modelform that provides filter information
 *  @param dataSetIndex:  the dataset index in chart declaration: order need to be consistent with myCharts param
 *  @param graphMaxMin:   the graphScale object that contains chart bounding information
 */
export function updateScatter(
    table: Handsontable,
    myCharts: Chart[],
    clusterForm: ClusterForm,
    modelForm: ModelForm,
    dataSetIndex: number[],
    graphMaxMin: graphScale,
    specificChart: number = -1,
) {
  for (let c = 0; c < myCharts.length; c++) {
    if (specificChart < 0 || specificChart === c) {
      let myChart = myCharts[c];
      let err = parseFloat(clusterForm["err_num"].value);
      let dist = parseFloat(clusterForm["d_num"].value);
      //as request by educator, Extinction in V (mag) is now calculated by B-V Reddening (input) * 3.1
      let reddening = parseFloat(clusterForm["red_num"].value) * 3.1;

      let chart = myChart.data.datasets[dataSetIndex[c]].data;
      let tableData = table.getData();
      let columns = table.getColHeader();

      let blueKey = modelFormKey(c, 'blue')
      let redKey = modelFormKey(c, 'red')
      let lumKey = modelFormKey(c, 'lum')

      //Identify the column the selected filter refers to
      let blue = columns.indexOf(modelForm[blueKey].value + " Mag");
      let red = columns.indexOf(modelForm[redKey].value + " Mag");
      let lum = columns.indexOf(modelForm[lumKey].value + " Mag");

      let A_v1 = calculateLambda(
          reddening,
          filterWavelength[modelForm[blueKey].value]
      );
      let A_v2 = calculateLambda(
          reddening,
          filterWavelength[modelForm[redKey].value]
      );
      let A_v3 = calculateLambda(
          reddening,
          filterWavelength[modelForm[lumKey].value]
      );

      let blueErr =
          columns.indexOf(modelForm[blueKey].value + "err") < 0
              ? null
              : columns.indexOf(modelForm[blueKey].value + "err"); //checks for supplied err data
      let redErr =
          columns.indexOf(modelForm[redKey].value + "err") < 0
              ? null
              : columns.indexOf(modelForm[redKey].value + "err");
      let lumErr =
          columns.indexOf(modelForm[lumKey].value + "err") < 0
              ? null
              : columns.indexOf(modelForm[lumKey].value + "err");

      let scaleLimits: { [key: string]: number } = {minX: NaN, minY: NaN, maxX: NaN, maxY: NaN,};

      let start = 0;
      for (let i = 0; i < tableData.length; i++) {
        if (
            typeof (tableData[i][blue]) != 'number' ||
            typeof (tableData[i][red]) != 'number' ||
            typeof (tableData[i][lum]) != 'number' ||
            (blueErr != null && tableData[i][blueErr] >= err) ||
            (redErr != null && tableData[i][redErr] >= err) ||
            (lumErr != null && tableData[i][lumErr] >= err)
        ) {
          continue;
        }
        //red-blue,lum

        let x = tableData[i][blue] - A_v1 - (tableData[i][red] - A_v2);
        let y = tableData[i][lum] - A_v3 - 5 * Math.log10(dist / 0.01);
        chart[start++] = {
          x: x,
          y: y
        };
        scaleLimits = pointMinMax(scaleLimits, x, y);
      }
      while (chart.length !== start) {
        chart.pop();
      }
      graphMaxMin.updateDataLimit(c, scaleLimits);
      myChart.data.datasets[dataSetIndex[c]].backgroundColor = HRrainbow(myChart, //we need to do this anyways if the chart isn't rescaled
          modelForm[redKey].value, modelForm[blueKey].value)
      if (graphMaxMin.getMode(c) !== null) {
        chartRescale([myChart], modelForm, graphMaxMin,null, [c]);
      }
      myChart.update()
    }
  }
}


/**
 *  This function rescale the chart
 *  @param myCharts:    array of charts that need to be rescaled
 *  @param modelForm:   modelform that provides filter information
 *  @param graphMaxMin: the graphScale object
 *  @param option: overwrite the existing zooming option
 */
export function chartRescale(myCharts: Chart[],
                             modelForm: ModelForm,
                             graphMaxMin: graphScale,
                             option: string = null,
                             scaleIndexOverride: number[] = []) {
  for (let c = 0; c < myCharts.length; c++)
  {
    let myChart = myCharts[c];
    let adjustScale: { [key: string]: number } = {minX: 0, minY: 0, maxX: 0, maxY: 0,};
    let xBuffer: number = 0;
    let yBuffer: number = 0;
    let adjustedC = scaleIndexOverride.length === 0? c : scaleIndexOverride[c];
    for (let key in adjustScale) {
      let frameOn: string = option === null ? graphMaxMin.getMode(adjustedC) : graphMaxMin.updateMode(option, adjustedC);
      if (frameOn === "auto") {
        let magList: string[] = ['red', 'blue', 'bright'];
        let filters: string[] = [
          modelForm[modelFormKey(adjustedC, 'red')].value,
          modelForm[modelFormKey(adjustedC, 'blue')].value,
          modelForm[modelFormKey(adjustedC, 'lum')].value];
        let x: { [key: string]: number } = {'red': 0, 'blue': 0, 'bright': 0}
        let magIndex: number[] = [0, 0, 0];
        for (let i = 0; i < magList.length; i++) {
          x[magList[i]] = Math.log(filterWavelength[filters[i]] * 1000) / Math.log(10);
          if ("UBVRI".includes(filters[i])) {
            magIndex[i] = Number(0);
          } else if ("uprimegprimerprimeiprimezprime".includes(filters[i])) {
            magIndex[i] = Number(1);
          } else if ("JHKs".includes(filters[i])) {
            magIndex[i] = Number(2);
          }
        }

        let mags: { [key: string]: Function[] } = filterMags()

        let color_red: number = mags['red'][magIndex[1]](x['blue']) - mags['red'][magIndex[0]](x['red']);
        let color_blue: number = mags['blue'][magIndex[1]](x['blue']) - mags['blue'][magIndex[0]](x['red']);

        adjustScale = {
          'minX': color_blue - (color_red - color_blue) / 8,
          'maxX': color_red + (color_red - color_blue) / 8,
          'minY': mags['bright'][magIndex[2]](x['bright']) + (mags['bright'][magIndex[2]](x['bright']) - mags['faint'][magIndex[0]](x['bright'])) / 8,
          'maxY': mags['faint'][magIndex[0]](x['bright']) - (mags['bright'][magIndex[2]](x['bright']) - mags['faint'][magIndex[0]](x['bright'])) / 8
        };
      } else {
        if (frameOn === "both") {
          if (key.includes('min')) {
            adjustScale[key] = Math.min(graphMaxMin.getDataLimit(adjustedC)[key],
                graphMaxMin.getModelLimit()[key]);
          } else {
            adjustScale[key] = Math.max(graphMaxMin.getDataLimit(adjustedC)[key],
                graphMaxMin.getModelLimit()[key]);
          }
        } else if (frameOn === "data") {
          adjustScale[key] = graphMaxMin.getDataLimit(adjustedC)[key];
        } else if (frameOn === "model") {
          adjustScale[key] = graphMaxMin.getModelLimit()[key];
        }

        xBuffer = (adjustScale["maxX"] - adjustScale["minX"]) * 0.2;
        yBuffer = (adjustScale["maxY"] - adjustScale["minY"]) * 0.2;
        let minbuffer = 0.1;
        let maxbuffer = 1;
        xBuffer = (xBuffer > minbuffer ? (xBuffer < maxbuffer ? xBuffer : maxbuffer) : minbuffer)
        yBuffer = (yBuffer > minbuffer ? (yBuffer < maxbuffer ? yBuffer : maxbuffer) : minbuffer)
      }
      if (isNaN(adjustScale[key])) {
      }
      adjustScale[key] = isNaN(adjustScale[key]) ? 0 : adjustScale[key]
    }

    myChart.options.scales["y"].min = adjustScale["minY"] - yBuffer
    myChart.options.scales["y"].max = adjustScale["maxY"] + yBuffer
    myChart.options.scales["y"].reverse = true

    myChart.options.scales["x"].min = adjustScale["minX"] - xBuffer
    myChart.options.scales["x"].max = adjustScale["maxX"] + xBuffer
    myChart.options.scales["x"].type = "linear"

    myChart.data.datasets[2].backgroundColor = HRrainbow(myChart,
        modelForm[modelFormKey(adjustedC, 'red')].value, modelForm[modelFormKey(adjustedC, 'blue')].value)
    myChart.update()
  }
}

/**
 *  This function insert the clusterform and modelform into the website
 *  @param chartCounts: how many charts need to be controlled
 */
export function insertClusterControls(chartCounts:number = 1) {
  let htmlContent = '<form title="Cluster Diagram" id="cluster-form">\n' +
      '<div class="row">\n' +
      '<div class="col-sm-6 des">Max Error (mag):</div>\n' +
      '<div class="col-sm-4 range"><input type="range" title="Error" name="err"></div>\n' +
      '<div class="col-sm-2 text"><input type="number" title="Error" name="err_num" class="field"></div>\n' +
      "</div>\n" +
      '<div class="row">\n' +
      '<div class="col-sm-6 des">Distance (kpc):</div>\n' +
      '<div class="col-sm-4 range"><input type="range" title="Distance" name="d"></div>\n' +
      '<div class="col-sm-2 text"><input type="number" title="Distance" name="d_num" class="field"></div>\n' +
      "</div>\n" +
      '<div class="row">\n' +
      '<div class="col-sm-6 des">B – V Reddening (mag):</div>\n' +
      '<div class="col-sm-4 range"><input type="range" title="Reddening" name="red"></div>\n' +
      '<div class="col-sm-2 text"><input type="number" title="Reddening" name="red_num" class="field"></div>\n' +
      "</div>\n" +
      "</form>\n" +
      '<form title="Filters" id="model-form" style="padding-bottom: .5em">\n' +
      '<div class="row">\n' +
      '<div class="col-sm-6 des">log(Age (yr)):</div>\n' +
      '<div class="col-sm-4 range"><input type="range" title="Age" name="age"></div>\n' +
      '<div class="col-sm-2 text"><input type="number" title="Age" name="age_num" class="field"></div>\n' +
      "</div>\n" +
      '<div class="row">\n' +
      '<div class="col-sm-6 des">Metallicity (solar):</div>\n' +
      '<div class="col-sm-4 range"><input type="range" title="Metallicity" name="metal"></div>\n' +
      '<div class="col-sm-2 text"><input type="number" title="Metallicity" name="metal_num" class="field"></div>\n' +
      "</div>\n" +
      '<div class="row">\n' +
      '<div class="col-sm-6" style="color: grey;">Select Filters:</div>\n' +
      "</div>\n" +
      '<div class="row">\n' 
    if (chartCounts === 1) {
      for (let i = 0; i < chartCounts; i++) {
        let num = ""
        if (i !== 0) {
          num = (i+1).toString()
        }
        //add a number that corresponds what graph each row of drop down boxes controls
        htmlContent +=
        '<div class="col-sm-4">Blue:</div>\n' +
        '<div class="col-sm-4">Red:</div>\n' +
        '<div class="col-sm-4">Luminosity:</div>\n' +
        "</div>\n" +
        '<div class="row">\n' +
        '<div class="col-sm-4"><select name="blue' + num + '" style="width: 100%;" title="Select Blue Color Filter">\n' +
            '<option value="B" title="B filter" selected>B</option></div>\n' +
            '<option value="V" title="V filter">V</option></div>\n' +
            '<option value="R" title="R filter">R</option></div>\n' +
            '<option value="I" title="I filter">I</option></select></div>\n' +
            '<div class="col-sm-4"><select name="red' + num + '" style="width: 100%;" title="Red Color Filter">\n' +
            '<option value="B" title="B filter">B</option></div>\n' +
            '<option value="V" title="V filter" selected>V</option></div>\n' +
            '<option value="R" title="R filter">R</option></div>\n' +
            '<option value="I" title="I filter">I</option></select></div>\n' +
            '<div class="col-sm-4"><select name="lum' + num + '" style="width: 100%;" title="Select Luminosity Filter">\n' +
            '<option value="B" title="B filter">B</option></div>\n' +
            '<option value="V" title="V filter" selected>V</option></div>\n' +
            '<option value="R" title="R filter">R</option></div>\n' +
            '<option value="I" title="I filter" >I</option></select></div>\n'
      }
    }
    if (chartCounts > 1) {
      htmlContent += '<div class="col-sm-1"></div>\n' +
      '<div class="col-sm-3">Blue:</div>\n' +
      '<div class="col-sm-1"></div>\n' +
      '<div class="col-sm-3">Red:</div>\n' +
      '<div class="col-sm-1"></div>\n' +
      '<div class="col-sm-3">Luminosity:</div>\n' +
      "</div>\n" +
      '<div class="row">\n'
    for (let i = 0; i < chartCounts; i++) {
      let num = ""
      let order = (i+1).toString()
      if (i !== 0) {
        num = (i+1).toString()
      }
      //add a number that corresponds what graph each row of drop down boxes controls
      htmlContent += '<div class="col-sm-1"><class="title">' + order + ':</div>\n' +
          '<div class="col-sm-3"><select name="blue' + num + '" style="width: 100%;" title="Select Blue Color Filter">\n' +
          '<option value="B" title="B filter" selected>B</option></div>\n' +
          '<option value="V" title="V filter">V</option></div>\n' +
          '<option value="R" title="R filter">R</option></div>\n' +
          '<option value="I" title="I filter">I</option></select></div>\n' +
          '<div class="col-sm-1"></div>\n' +
          '<div class="col-sm-3"><select name="red' + num + '" style="width: 100%;" title="Red Color Filter">\n' +
          '<option value="B" title="B filter">B</option></div>\n' +
          '<option value="V" title="V filter" selected>V</option></div>\n' +
          '<option value="R" title="R filter">R</option></div>\n' +
          '<option value="I" title="I filter">I</option></select></div>\n' +
          '<div class="col-sm-1"></div>\n' +
          '<div class="col-sm-3"><select name="lum' + num + '" style="width: 100%;" title="Select Luminosity Filter">\n' +
          '<option value="B" title="B filter">B</option></div>\n' +
          '<option value="V" title="V filter" selected>V</option></div>\n' +
          '<option value="R" title="R filter">R</option></div>\n' +
          '<option value="I" title="I filter" >I</option></select></div>\n'
    }
  }


      htmlContent += "</div>\n" + "</form>\n"


  document
      .getElementById("input-div")
      .insertAdjacentHTML(
          "beforeend",
          htmlContent
      );
}


/**
 *  This function insert graph control buttons into the HTML
 */
export function insertGraphControl(){
  document.getElementById("extra-options").insertAdjacentHTML("beforeend",
      '<div class = "extra">\n' +
      '<label class="scaleSelection" id="standardViewLabel">\n' +
      '<input type="radio" class="scaleSelection" id="standardView" value="Standard View" checked />' +
      '<div class="radioText">Standard View</div>' +
      '</label>\n' + '&nbsp;' +
      '<label class="scaleSelection" id="frameOnDataLabel">\n' +
      '<input type="radio" class="scaleSelection" id="frameOnData" value="Frame on Data" />'+
      '<div class="radioText">Frame on Data</div>' +
      '</label>\n' + '&nbsp;' +
      '<button class = "graphControl" id="panLeft"><center class = "graphControl">&#8592;</center></button>\n' +
      '&nbsp;' +
      '<button class = "graphControl" id="panRight"><center class = "graphControl">&#8594;</center></button>\n' +
      '&nbsp;' +
      '<button class = "graphControl" id="zoomIn"><center class = "graphControl">&plus;</center></button>\n' +
      '&nbsp;' +
      '<button class = "graphControl" id="zoomOut"><center class = "graphControl">&minus;</center></button>\n' +
      '<div style="padding: 0 6px 0 6px"></div>' +
      '</div>\n'
  )
}

export function modelFormKey(chartNum: number, color: string) {
  return chartNum > 0 ? (color + (chartNum+1).toString()) : color
}

function modelFormKeys(chartNum: number, form: ModelForm) {
  function getFilter(key: string): string {
    return form[key].value
  }
  let returnArray = []
  let filterList = ['blue', 'red', 'lum']
  for (let i = 0; i< filterList.length; i++) {
    returnArray.push(getFilter(modelFormKey(chartNum, filterList[i])))
  }
  return returnArray
}