'use strict';

import { tableCommonOptions, colors } from "./config.js"
import { updateLabels, updateTableHeight } from "./util.js"
import { round, lombScargle } from "./my-math.js"

/**
 *  Returns generated table and chart for pulsar.
 *  @returns {[Handsontable, Chartjs]} Returns the table and the chart object.
 */
export function pulsar() {
    document.getElementById('input-div').insertAdjacentHTML('beforeend',
        '<form title="Pulsar" id="pulsar-form" style="padding-bottom: 1em">\n' +
        '<div class="flex-container">\n' +
        '<div class="flex-item-grow1"><label><input type="radio" name="mode" value="lc" checked><span>Light Curve</span></label></div>\n' +
        '<div class="flex-item-grow1"><label><input type="radio" name="mode" value="ft"><span>Periodogram</span></label></div>\n' +
        '<div class="flex-item-grow0"><label><input type="radio" name="mode" value="pf"><span>Period Folding</span></label></div>\n' +
        '</div>\n' +
        '</form>\n' +
        '<div id="light-curve-div"></div>\n' +
        '<div id="fourier-div"></div>\n' +
        '<div id="period-folding-div"></div>\n'
    );

    document.getElementById('light-curve-div').innerHTML =
        '<form title="Light Curve" id="light-curve-form" style="padding-bottom: .5em" onSubmit="return false;">\n' +
        '<div class="row">\n' +
        '<div class="col-sm-7">Background Subtraction Scale: </div>\n' +
        '<div class="col-sm-5"><input class="field" type="number" step="0.001" name="s" title="Magnitude" value=0></input></div>\n' +
        '</div>\n' +
        '</form>\n';

    document.getElementById("fourier-div").innerHTML =
        '<form title="Fourier" id="fourier-form" style="padding-bottom: .5em" onSubmit="return false;">\n' +
        '<div class="row">\n' +
        '<div class="col-sm-7">Start Period: </div>\n' +
        '<div class="col-sm-5"><input class="field" type="number" step="0.0001" name="start" title="Start Period" value=0.1></input></div>\n' +
        '</div>\n' +
        '<div class="row">\n' +
        '<div class="col-sm-7">Stop Period: </div>\n' +
        '<div class="col-sm-5"><input class="field" type="number" step="0.0001" name="stop" title="Stop Period" value=1></input></div>\n' +
        '</div>\n' +
        '</form>\n';


    document.getElementById('period-folding-div').insertAdjacentHTML('beforeend',
        '<form title="Folding Period" id="period-folding-form" style="padding-bottom: .5em" onSubmit="return false;">\n' +
        '<div class="row">\n' +
        '<div class="col-sm-6">Folding Period: </div>\n' +
        '<div class="col-sm-6"><input class="field" type="number" step="0.001" name="pf" title="Folding Period" value=0></input></div>\n' +
        '</div>\n' +
        '<div class="row">\n' +
        '<div class="col-sm-6">Bins: </div>\n' +
        '<div class="col-sm-6"><input class="field" type="number" step="0.001" name="bins" title="Bins" value=0></input></div>\n' +
        '</div>\n' +
        '</form>\n'
    );


    let tableData = [];
    for (let i = 0; i < 14; i++) {
        tableData[i] = {
            'time': i * 10 + Math.random() * 10 - 5,
            'chn1': Math.random() * 20,
            'chn2': Math.random() * 20,
        };
    }

    let container = document.getElementById('table-div');
    let hot = new Handsontable(container, Object.assign({}, tableCommonOptions, {
        data: tableData,
        colHeaders: ['Time', 'Channel 1', 'Channel 2'],
        maxCols: 3,
        columns: [
            { data: 'time', type: 'numeric', numericFormat: { pattern: { mantissa: 2 } } },
            { data: 'chn1', type: 'numeric', numericFormat: { pattern: { mantissa: 2 } } },
            { data: 'chn2', type: 'numeric', numericFormat: { pattern: { mantissa: 2 } } },
        ],
    }));

    let ctx = document.getElementById("myChart").getContext('2d');
    let myChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            minT: Number.POSITIVE_INFINITY,
            customLabels: {
                title: "Title",
                x: "x",
                y: "y",
                lastMode: "Pulsar",
            },
            datasets: [
                {
                    label: 'Channel 1',
                    data: [],
                    backgroundColor: colors['blue'],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2,
                    // immutableLabel: true,
                    hidden: false,
                }, {
                    label: 'Channel 2',
                    data: [],
                    backgroundColor: colors['red'],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2,
                    // immutableLabel: true,
                    hidden: false,
                }, {
                    label: 'Channel 1',
                    data: [],
                    backgroundColor: colors['blue'],
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBorderWidth: 0,
                    // immutableLabel: true,
                    hidden: true,
                }, {
                    label: 'Channel 2',
                    data: [],
                    backgroundColor: colors['red'],
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBorderWidth: 0,
                    // immutableLabel: true,
                    hidden: true,
                }, {
                    label: 'Channel 1',
                    data: [],
                    backgroundColor: colors['blue'],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2,
                    // immutableLabel: true,
                    hidden: true,
                }, {
                    label: 'Channel 2',
                    data: [],
                    backgroundColor: colors['red'],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2,
                    // immutableLabel: true,
                    hidden: true,
                }
            ]
        },
        options: {
            legend: {
                labels: {
                    filter: function (legendItem, chartData) {
                        return !legendItem.hidden;
                    }
                }
            },
            tooltips: {
                callbacks: {
                    label: function (tooltipItem, data) {
                        return '(' + round(tooltipItem.xLabel, 4) + ', ' +
                            round(tooltipItem.yLabel, 4) + ')';
                    },
                },
            },
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom'
                }]
            }
        }
    });

    let update = function () {
        updatePulsar(hot, myChart);
        updateTableHeight(hot);
    };

    hot.updateSettings({
        afterChange: update,
        afterRemoveRow: update,
        afterCreateRow: update,
    });

    let pulsarForm = document.getElementById("pulsar-form");
    pulsarForm.onchange = function () {
        let mode = pulsarForm.elements["mode"].value;
        switchMode(myChart, mode);
        updateTableHeight(hot);
    }

    let lightCurveForm = document.getElementById('light-curve-form');
    lightCurveForm.oninput = function () {
        // TODO: background subtraction
    }

    let fourierForm = document.getElementById("fourier-form");
    fourierForm.oninput = function () {
        let start = parseFloat(this.start.value);
        let stop = parseFloat(this.stop.value);
        if (start > stop) {
            // alert("Please make sure the stop value is greater than the start value.");
            return;
        }

        let chn1 = myChart.data.datasets[0].data;
        let t1 = chn1.map(entry => entry.x);
        let y1 = chn1.map(entry => entry.y);
        let chn2 = myChart.data.datasets[1].data;
        let t2 = chn2.map(entry => entry.x);
        let y2 = chn2.map(entry => entry.y);

        myChart.data.datasets[2].data = lombScargle(t1, y1, start, stop, 2000);
        myChart.data.datasets[3].data = lombScargle(t2, y2, start, stop, 2000);
    }

    let periodFoldingForm = document.getElementById("period-folding-form");
    periodFoldingForm.oninput = function () {
        let period = parseFloat(this.pf.value);
        let bins = parseInt(this.bins.value);
        myChart.data.datasets[4].data = periodFolding(myChart, 0, period, bins);
        myChart.data.datasets[5].data = periodFolding(myChart, 1, period, bins);
    }

    myChart.options.title.text = "Title"
    myChart.options.scales.xAxes[0].scaleLabel.labelString = "x";
    myChart.options.scales.yAxes[0].scaleLabel.labelString = "y";

    updatePulsar(hot, myChart);
    updateTableHeight(hot);

    return [hot, myChart];
}

/**
 * This function handles the uploaded file to the pulsar chart. Specifically, it parse the file
 * and load related information into the table.
 * DATA FLOW: file -> table, triggers chart updates as well
 * @param {Event} evt The uploadig event
 * @param {Handsontable} table The table to be updated
 * @param {Chartjs} myChart
 */
export function pulsarFileUpload(evt, table, myChart) {
    // console.log("pulsarFileUpload called");
    let file = evt.target.files[0];

    // File validation
    if (file === undefined) {
        return;
    }
    if (!file.name.match(".*\.txt")) {
        console.log("Uploaded file type is: ", file.type);
        console.log("Uploaded file name is: ", file.name);
        alert("Please upload a txt file.");
        return;
    }

    let reader = new FileReader();
    reader.onload = () => {
        let data = reader.result.split("\n");
        data = data.filter(str => (str !== null && str !== undefined && str !== ""));
        data = data.filter(str => (str[0] !== '#'));

        //turn each string into an array of numbers
        data = data.map(val => val.trim().split(/\ +/));

        data = data.map(row => row.map(str => parseFloat(str)));
        data = data.filter(row => (row[9] !== 0));
        data = data.map(row => [row[0], row[5], row[6]]);

        let tableData = [];
        for (let row of data) {
            tableData.push({
                'time': row[0],
                'chn1': row[1],
                'chn2': row[2]
            });
        }
        tableData.sort((a, b) => a.time - b.time);

        switchMode(myChart, 'lc', true);

        // Need to put this line down in the end, because it will trigger update on the Chart, which will 
        // in turn trigger update to the pulsar form and the light curve form, which needs to be cleared
        // prior to being triggered by this upload.
        table.updateSettings({ data: tableData });
    }
    reader.readAsText(file);
}

/**
 * This function is called when the values in table is changed (either by manual input or by file upload).
 * It then updates the chart according to the data in the table.
 * DATA FLOW: table -> chart
 * @param {Handsontable} table The table object
 * @param {Chartjs} myChart The chart object
 */
function updatePulsar(table, myChart) {
    // console.log("updatePulsar called");

    myChart.data.minT = Number.POSITIVE_INFINITY;

    for (let i = 0; i < 6; i++) {
        myChart.data.datasets[i].data = [];
    }

    let tableData = table.getData();
    let chn1Data = [];
    let chn2Data = [];

    for (let i = 0; i < tableData.length; i++) {
        let time = tableData[i][0];
        let chn1 = tableData[i][1];
        let chn2 = tableData[i][2];

        myChart.data.minT = Math.min(myChart.data.minT, time);

        chn1Data.push({
            "x": time,
            "y": chn1,
        })
        chn2Data.push({
            "x": time,
            "y": chn2,
        })
    }

    myChart.data.datasets[0].data = chn1Data;
    myChart.data.datasets[1].data = chn2Data;

    switchMode(myChart, 'lc');
}

/**
 * This function set up the chart by displaying only the appropriate datasets for a mode,
 * and then adjust the chart-info-form to match up with the mode.
 * @param {Chartjs object} myChart 
 * @param {['lc', 'ft', 'pf']} mode
 * @param {boolean} reset               Default is false. If true, will override `mode` and
 *                                      set mode to 'lc', and reset Chart and chart-info-form.
 */
function switchMode(myChart, mode, reset = false) {
    // Displaying the correct datasets
    for (let i = 0; i < 6; i++) {
        myChart.data.datasets[i].hidden = true;
    }
    if (mode === 'lc' || reset) {
        showDiv("light-curve-div");
        document.getElementById('light-curve-form').oninput();
        myChart.data.datasets[0].hidden = false;
        myChart.data.datasets[1].hidden = false;
        myChart.options.scales.yAxes[0].ticks.reverse = true;
    } else if (mode === 'ft') {
        showDiv("fourier-div");
        document.getElementById('fourier-form').oninput();
        myChart.data.datasets[2].hidden = false;
        myChart.data.datasets[3].hidden = false;
        myChart.options.scales.yAxes[0].ticks.reverse = false;
    } else {
        showDiv("period-folding-div");
        document.getElementById('period-folding-form').oninput();
        myChart.data.datasets[4].hidden = false;
        myChart.data.datasets[5].hidden = false;
        myChart.options.scales.yAxes[0].ticks.reverse = true;
    }
    myChart.update(0);

    // Displaying the correct label information. Fourier mode has its own separate
    // title and x and y labels, which requires saving and loading the custom 
    // title/labels for other modes.
    let customLabels = myChart.data.customLabels;
    if (reset) {
        customLabels = { title: 'Title', x: 'x', y: 'y', lastMode: null };
        myChart.options.title.text = "Title"
        myChart.options.scales.xAxes[0].scaleLabel.labelString = "x";
        myChart.options.scales.yAxes[0].scaleLabel.labelString = "y";
        updateLabels(myChart, document.getElementById('chart-info-form'), true);
    } else if (mode === 'ft') {
        customLabels.title = myChart.options.title.text;
        customLabels.x = myChart.options.scales.xAxes[0].scaleLabel.labelString;
        customLabels.y = myChart.options.scales.yAxes[0].scaleLabel.labelString;

        myChart.options.title.text = "Periodogram";
        myChart.options.scales.xAxes[0].scaleLabel.labelString = "Period";
        myChart.options.scales.yAxes[0].scaleLabel.labelString = "Power Spectrum";
        myChart.update(0);
        updateLabels(myChart, document.getElementById('chart-info-form'), true, true, true, true);
    } else if (customLabels.lastMode === "ft") {
        myChart.options.title.text = customLabels.title;
        myChart.options.scales.xAxes[0].scaleLabel.labelString = customLabels.x;
        myChart.options.scales.yAxes[0].scaleLabel.labelString = customLabels.y;
        myChart.update(0);
        updateLabels(myChart, document.getElementById('chart-info-form'), true);
    }
    customLabels.lastMode = reset ? 'lc' : mode;
}

/**
 * This function serves as a switch for the visibility of the control div's for the different modes.
 * @param {str} id The name of the div to be displayed.
 */
function showDiv(id) {
    document.getElementById("light-curve-div").hidden = true;
    document.getElementById("fourier-div").hidden = true;
    document.getElementById("period-folding-div").hidden = true;

    document.getElementById("table-div").hidden = true;
    document.getElementById("add-row-button").hidden = true;

    document.getElementById(id).hidden = false;
    if (id === "light-curve-div") {
        document.getElementById("table-div").hidden = false;
        document.getElementById("add-row-button").hidden = false;
    }
}

function periodFolding(myChart, src, period, bins) {
    if (period === 0) {
        return myChart.data.datasets[src].data;
    }

    let data = myChart.data.datasets[src].data;
    let minT = myChart.data.minT;

    let foldedData = data.map(val => ({
        "x": floatMod(val.x - minT, period),
        "y": val.y
    }));

    // this sorts the time components of the array and then
    // sorts the flux components accordingly

    foldedData.sort((a, b) => a.x - b.x);

    let time_b = []
    let flux_b = []

    //initialize j and new binned arrays
    let j = 0;

    //iterate over the input number of bins!
    for (let i = 0; i < bins; i++) {
        let num = 0; //initialize count
        time_b.push(period * (i + .5)) / bins;  //initialize binned time
        flux_b.push(0);  //initialize binned flux

        while (j < foldedData.length && foldedData[j].x < (period * (i + 1)) / bins) {
            num = num + 1;
            flux_b[i] = flux_b[i] + foldedData[j].y;
            j = j + 1;//update count, total, and binned flux
        }

        if (num !== 0) {
            flux_b[i] = flux_b[i] / num; //average binned flux
        }
    }

    let pfData = [];

    for (let i = 0; i < bins; i++) {
        pfData.push({
            "x": time_b[i],
            "y": flux_b[i]
        })
    }
    for (let i = 0; i < bins; i++) {
        pfData.push({
            "x": time_b[i] + period,
            "y": flux_b[i]
        })
    }
    return pfData;
}

/**
 * This function computes the floating point modulo.
 * @param {number} a The dividend
 * @param {number} b The divisor
 */
function floatMod(a, b) {
    while (a > b) {
        a -= b;
    }
    return a;
}
