'use strict';
/*test*/ 
import Chart from "chart.js/auto";
import { ScatterDataPoint } from "chart.js";
import Handsontable from "handsontable";

import { tableCommonOptions, colors } from "./config"

import { throttle, updateLabels, updateTableHeight, linkInputs, linkInputsVar } from "./util"
import { Mode } from "./types/chart.js/index.js";
import { round, lombScargle, floatMod, lombScargleWithError, clamp } from "./my-math"
// import { PulsarMode } from "./types/chart.js/index.js";
import { valueAccordingPercent } from "handsontable/helpers";



/**
 *  Returns generated table and chart for variable.
 *  @returns {[Handsontable, Chart]} Returns the table and the chart object.
 */
export function variableTest(): [Handsontable, Chart] {
    // console.log("root func called");
    document.getElementById('input-div').insertAdjacentHTML('beforeend',
        '<form title="VariableTest" id="variableTest-form" style="padding-bottom: 1em">\n' +
        '<div class="flex-container">\n' +
        '<div class="flex-item-grow1"><label><input type="radio" class="table" name="mode" value="lc" checked><span>Light Curve</span></label></div>\n' +
        '<div class="flex-item-grow1"><label><input type="radio" class="table" name="mode" value="ft" disabled><span>Periodogram</span></label></div>\n' +
        '<div class="flex-item-grow0"><label><input type="radio" class="table" name="mode" value="pf" disabled><span>Period Folding</span></label></div>\n' +
        '</div>\n' +
        '</form>\n' +
        '<div id="light-curve-div"></div>\n' +
        '<div id="fourier-div"></div>\n' +
        '<div id="period-folding-div"></div>\n'
    );
    document.getElementById('axis-label1').style.display = 'inline';
    document.getElementById('axis-label3').style.display = 'inline';
    document.getElementById('xAxisPrompt').innerHTML = "X Axis";
    document.getElementById('yAxisPrompt').innerHTML = "Y Axis";
    const tableData = [];
    for (let i = 0; i < 14; i++) {
        tableData[i] = {
            'jd': i * 10 + Math.random() * 10 - 5,
            'src1': Math.random() * 20,
            'src2': Math.random() * 20,
            'err1': 1,
            'err2': 1,
        };
    }

    const container = document.getElementById('table-div');
    const hot = new Handsontable(container, Object.assign({}, tableCommonOptions, {
        data: tableData,
        colHeaders: ['Julian Date', 'Source1', 'Source2', 'Error1', 'Error2'],
        maxCols: 5,
        columns: [
            { data: 'jd', type: 'numeric', numericFormat: { pattern: { mantissa: 2 } } },
            { data: 'src1', type: 'numeric', numericFormat: { pattern: { mantissa: 2 } } },
            { data: 'src2', type: 'numeric', numericFormat: { pattern: { mantissa: 2 } } },
            { data: 'err1', type: 'numeric', numericFormat: { pattern: { mantissa: 2 } } },
            { data: 'err2', type: 'numeric', numericFormat: { pattern: { mantissa: 2 } } },
        ],
    }));
    // container.style.overflow = 'scroll'
    
    // console.log(container.style)

    const ctx = (document.getElementById("myChart") as HTMLCanvasElement).getContext('2d');
    const myChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            maxMJD: Number.NEGATIVE_INFINITY,
            minMJD: Number.POSITIVE_INFINITY,
            modeLabels: {
                lc: { t: 'Title', x: 'x', y: 'y' },
                ft: { t: 'Periodogram', x: 'Period (sec)', y: 'Power Spectrum' },
                pf: { t: 'Title', x: 'x', y: 'y' },
                pressto: { t: 'Title', x: 'x', y: 'y' },
                gravity: {t: 'Title', x: 'x', y: 'y'    },
                lastMode: 'lc'
            },
            datasets: [
                {
                    label: 'Source 1',
                    data: [],
                    backgroundColor: colors['blue'],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2,
                    // immutableLabel: true,
                    hidden: false,
                }, {
                    label: 'Source 2',
                    data: [],
                    backgroundColor: colors['red'],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2,
                    // immutableLabel: true,
                    hidden: false,
                }, {
                    label: 'Light Curve',
                    data: [],
                    backgroundColor: colors['purple'],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2,
                    // immutableLabel: true,
                    hidden: true,
                }, {
                    label: 'Fourier',
                    data: [],
                    backgroundColor: colors['bright'],
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBorderWidth: 0,
                    // immutableLabel: true,
                    hidden: true,
                }, {
                    label: 'Period Folding',
                    data: [],
                    backgroundColor: colors['orange'],
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBorderWidth: 2,
                    // immutableLabel: true,
                    hidden: true,
                }, {
                    label: "error-bar",
                    data: [],
                    borderColor: "black",
                    borderWidth: 1,
                    pointRadius: 0,
                    showLine:true,
                    spanGaps: false,
                    parsing: {},
                    hidden: true,
                }, {
                    label: "error-bar",
                    data: [],
                    borderColor: "black",
                    borderWidth: 1,
                    pointRadius: 0,
                    showLine:true,
                    spanGaps: false,
                    parsing: {},
                    hidden: true,
                }, {
                    label: "error-bar",
                    data: [],
                    borderColor: "black",
                    borderWidth: 1,
                    pointRadius: 0,
                    showLine:true,
                    spanGaps: false,
                    parsing: {},
                    hidden: true
                }, {
                    label: "error-bar",
                    data: [],
                    borderColor: "black",
                    borderWidth: 1,
                    pointRadius: 0,
                    showLine:true,
                    spanGaps: false,
                    parsing: {},
                    hidden: true
                }
            ]
        },
        options: {
            plugins: {
                // zoom: {
                //     pan: {
                //       enabled: true,
                //       mode: 'xy',
                //     },
                //     zoom: {
                //       wheel: {
                //         enabled: true,
                //       },
                //       mode: 'xy',
                //     },
                //   },
                legend: {
                    labels: {
                        filter: function (legendItem){
                            return !(legendItem.text.includes("error-bar")||legendItem.hidden);                            
                        }
                    }
                },

                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return '(' + round(context.parsed.x, 4) + ', ' +
                                round(context.parsed.y, 4) + ')';
                        },
                    },
                },
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom'
                }
            }
        }
    });

    const update = function () {
        updateVariable(hot, myChart);
        updateTableHeight(hot);
    };

    hot.updateSettings({
        afterChange: update,
        afterRemoveRow: update,
        afterCreateRow: update,
    });

    let err1: Array<{x: number, y: number}> = [];
    let err2: Array<{x: number, y: number}> = [];
    for (let j = 0; j < tableData.length; j++) {
        // insert gap between error bars
        err1.push({x:null, y:null});
        err2.push({x:null, y:null});

        // lower limit error
        err1.push({
            x: tableData[j].jd ,
            y: tableData[j].src1-tableData[j].err1,
        });

        err2.push({
            x: tableData[j].jd,
            y: tableData[j].src2-tableData[j].err2,
        });

        // upper limit error
        err1.push({
            x: tableData[j].jd,
            y: tableData[j].src1+tableData[j].err1,
        });

        err2.push({
            x: tableData[j].jd,
            y: tableData[j].src2+tableData[j].err2,
        });
    }
    
    lightCurve(myChart, err1, err2);

    const variableForm = document.getElementById("variableTest-form") as VariableForm;
    variableForm.onchange = function () {
        const mode: Mode = variableForm.elements["mode"].value as Mode;
        if (mode === "lc") {
            showDiv("light-curve-div");
            const lightCurveForm = document.getElementById("light-curve-form");
            lightCurveForm.oninput(null);
        } else if (mode === "ft") {
            showDiv("fourier-div");
            const fourierForm = document.getElementById("fourier-form");
            fourierForm.oninput(null);
        } else {
            showDiv("period-folding-div");
            const periodFoldingForm = document.getElementById("period-folding-form");
            periodFoldingForm.oninput(null);
        }

        myChart.data.modeLabels[myChart.data.modeLabels.lastMode] = {
            t: myChart.options.plugins.title.text as string,
            x: myChart.options.scales['x'].title.text as string,
            y: myChart.options.scales['y'].title.text as string
        }
        myChart.data.modeLabels.lastMode = mode;

        myChart.options.plugins.title.text = myChart.data.modeLabels[mode].t;
        myChart.options.scales['x'].title.text = myChart.data.modeLabels[mode].x;
        myChart.options.scales['y'].title.text = myChart.data.modeLabels[mode].y;
        myChart.update('none');
        // myChart.update()
        updateLabels(myChart, document.getElementById('chart-info-form') as ChartInfoForm, false, false, false, false, 0, false);

        updateTableHeight(hot);
    }

    myChart.options.plugins.title.text = "Title";
    myChart.options.scales['x'].title.text = "x";
    myChart.options.scales['y'].title.text = "y";
    updateLabels(myChart, document.getElementById('chart-info-form') as ChartInfoForm);

    updateVariable(hot, myChart);
    updateTableHeight(hot);

    return [hot, myChart];
}

/**
 * This function handles the uploaded file to the variable chart. Specifically, it parse the file
 * and load related information into the table.
 * DATA FLOW: file -> table
 * @param evt The uploadig event
 * @param table The table to be updated
 * @param myChart
 */
export function variableFileUploadTest(evt: Event, table: Handsontable, myChart: Chart<'line'>) {
    // console.log("variableFileUpload called");
    let file = (evt.target as HTMLInputElement).files[0];
    if (file === undefined) {
        return;
    }

    // File type validation
    if (!file.type.match("(text/csv|application/vnd.ms-excel)") &&
        !file.name.match(".*\.csv")) {
        console.log("Uploaded file type is: ", file.type);
        console.log("Uploaded file name is: ", file.name);
        alert("Please upload a CSV file.");
        return;
    }

    let reader = new FileReader();
    reader.onload = () => {
        let data = (reader.result as string).split("\n").filter(str => (str !== null && str !== undefined && str !== ""));

        // Need to trim because of weired end-of-line issues (potentially a Windows problem).
        let columns = data[0].trim().split(",");
        data.splice(0, 1);

        let id_col = columns.indexOf("id");
        let mjd_col = columns.indexOf("mjd");
        let mag_col = columns.indexOf("mag");
        let mag_err = columns.indexOf("mag_error")

        let srcs = new Map();
        for (const row of data) {
            let items = row.trim().split(',');
            if (!srcs.has(items[id_col])) {
                srcs.set(items[id_col], []);
            }
            srcs.get(items[id_col]).push([
                parseFloat(items[mjd_col]),
                parseFloat(items[mag_col]),
                parseFloat(items[mag_err]),
            ]);
        }

        const itr = srcs.keys();
        let src1 = itr.next().value;
        let src2 = itr.next().value;
        if (!src1 || !src2) {
            alert("Less than two sources are detected in the uploaded file.");
            return;
        }

        let data1 = srcs.get(src1).filter((val: number[]) => !isNaN(val[0])).sort(sortJdate);
        let data2 = srcs.get(src2).filter((val: number[]) => !isNaN(val[0])).sort(sortJdate);

        let left = 0;
        let right = 0;
        const tableData: any[] = [];

        while (left < data1.length && right < data2.length) {
            if (data1[left][0] === data2[right][0]) {
                pushTableData(tableData, data1[left][0], data1[left][1], data2[right][1], data1[left][2], data2[right][2]);
                left++;
                right++;
            } else if (data1[left][0] < data2[right][0]) {
                pushTableData(tableData, data1[left][0], data1[left][1], NaN, data1[left][2], NaN);
                left++;
            } else {
                pushTableData(tableData, data2[right][0], NaN, data2[right][1], NaN, data2[right][2]);
                right++;
            }
        }
        while (left < data1.length) {
            pushTableData(tableData, data1[left][0], data1[left][1], NaN, data1[left][2], NaN);
            left++;
        }
        while (right < data2.length) {
            pushTableData(tableData, data2[right][0], NaN, data2[right][1], NaN, data2[right][2]);
            right++;
        }

        table.updateSettings({
            colHeaders: ['Julian Date', src1, src2, src1+'err', src2+'err'],
        })
        myChart.data.datasets[0].label = src1;
        myChart.data.datasets[1].label = src2;

        const variableForm = document.getElementById("variableTest-form") as VariableForm;
        variableForm.mode[1].disabled = true;
        variableForm.mode[2].disabled = true;

        myChart.data.modeLabels = {
            lc: { t: 'Title', x: 'x', y: 'y' },
            ft: { t: 'Periodogram', x: 'Period (sec)', y: 'Power Spectrum' },
            pf: { t: 'Title', x: 'x', y: 'y' },
            pressto: { t: 'Title', x: 'x', y: 'y' },
            gravity: {t: 'Title', x: 'x', y: 'y'},
            lastMode: 'lc'
        };


        myChart.options.plugins.title.text = "Title";
        myChart.options.scales['x'].title.text = "x";
        myChart.options.scales['y'].title.text = "y";
        updateLabels(myChart, document.getElementById('chart-info-form') as ChartInfoForm);



        let err1: Array<{x: number, y: number}> = [];
        let err2: Array<{x: number, y: number}> = [];
        // let errComb: Array<{x: number, y: number}> = [];

        for (let j = 0; j < tableData.length; j++) {
                    // insert gap between error bars
                    err1.push({x:null, y:null});
                    err2.push({x:null, y:null});
        
                    // lower limit error
                    err1.push({
                        x: parseFloat(tableData[j].jd),
                        y: tableData[j].src1-tableData[j].err1,
                    });

                    err2.push({
                        x: parseFloat(tableData[j].jd),
                        y: tableData[j].src2-tableData[j].err2,
                    });
        
                    // upper limit error
                    err1.push({
                        x: parseFloat(tableData[j].jd),
                        y: tableData[j].src1+tableData[j].err1,
                    });

                    err2.push({
                        x: parseFloat(tableData[j].jd),
                        y: tableData[j].src2+tableData[j].err2,
                    });
                }
                

        // myChart.data.datasets[5].data = err1
        // updateChart(myChart,0, 1)
        // console.log(myChart.data.datasets[1].data)
        // console.log(myChart.data.datasets[0].data)
        // console.log(myChart.data.datasets[5].data)
        // // myChart.data.datasets[5].hidden = false
        // // updateChart(myChart,5)

        lightCurve(myChart, err1, err2);
        // console.log(myChart.data.datasets[5].data)

        // // Need to put this line down in the end, because it will trigger update on the Chart, which will 
        // // in turn trigger update to the variable form and the light curve form, which needs to be cleared
        // // prior to being triggered by this upload.
        

        table.updateSettings({ data: tableData });
        
    }
    reader.readAsText(file);
}

/**
 * This function checks the potential entry to the tableData. If jd is not NaN,
 * the entry will be pushed to tableData with `NaN` turned to `null`.
 * @param {List} tableData tableData list to be updated
 * @param {number} jd Julian date of the row.
 * @param {number} src1 Magnitude of source 1
 * @param {number} src2 Magnitude of source 2
 */
function pushTableData(tableData: any[], jd: number, src1: number, src2: number, err1: number, err2: number) {
    if (isNaN(jd)) {
        // Ignore entries with invalid timestamp.
        return;
    }
    tableData.push({
        'jd': jd,
        'src1': isNaN(src1) ? null : src1,
        'src2': isNaN(src2) ? null : src2,
        'err1': isNaN(err1) ? null : err1,
        'err2': isNaN(err2) ? null : err2,
    });
}

/**
 * This function is called when the values in table is changed (either by manual input or by file upload).
 * It then updates the chart according to the data in the table.
 * DATA FLOW: table -> chart
 * @param table The table object
 * @param myChart The chart object
 */
function updateVariable(table: Handsontable, myChart: Chart) {
    // console.log("updateVariable called");

    myChart.data.maxMJD = 0;
    myChart.data.minMJD = Number.POSITIVE_INFINITY;

    for (let i = 0; i < 8; i++) {
        myChart.data.datasets[i].data = [];
    }

    // let tableData = sanitizeTableData(table.getData(), [0, 1, 2]);
    let tableData = table.getData();
    // let orierr1Data = myChart.data.datasets[5].data
    // let orierr2Data = myChart.data.datasets[6].data
    let src1Data = [];
    let src2Data = [];
    let err1Data = [];
    let err2Data = [];
    tableData = tableData.sort(sortJdate)
    for (let i = 0; i < tableData.length; i++) {
        let jd = tableData[i][0];
        let src1 = tableData[i][1];
        let src2 = tableData[i][2];
        let err1 = tableData[i][3];
        let err2 = tableData[i][4];

        myChart.data.minMJD = Math.min(myChart.data.minMJD, jd);
        myChart.data.maxMJD = Math.max(myChart.data.maxMJD, jd);

        src1Data.push({
            "x": jd,
            "y": src1,
        })
        src2Data.push({
            "x": jd,
            "y": src2,
        })

        err1Data.push({
            "x": null,
            "y": null,
        })
        err2Data.push({
            "x": null,
            "y": null,
        })
        err1Data.push({
            "x": jd,
            "y": src1-err1,
        })
        err2Data.push({
            "x": jd,
            "y": src2-err2,
        })
        err1Data.push({
            "x": jd,
            "y": src1+err1,
        })
        err2Data.push({
            "x": jd,
            "y": src2+err2,
        })
    }



    myChart.data.datasets[0].data = src1Data;
    myChart.data.datasets[1].data = src2Data;
    myChart.data.datasets[5].data = err1Data;
    myChart.data.datasets[6].data = err2Data;
    let localMin = src1Data[0].x
    if (localMin >= src2Data[0].x){
        localMin = src2Data[0].x
    }

    let localMax = src1Data[src1Data.length-1].x
    if (localMax <= src2Data[src1Data.length-1].x){
        localMax = src2Data[src1Data.length-1].x
    }
    myChart.options.scales['x'].min = localMin;
    myChart.options.scales['x'].max = localMax;

    updateChart(myChart, 0, 1, 5, 6);

    const variableForm = document.getElementById("variableTest-form") as VariableForm;
    variableForm.mode.value = "lc";
    variableForm.onchange(null);
}

/**
 * This function is called whenever the data sources change (i.e. the values in the table change). 
 * It creates the specific input form that is used by the light curve mode.
 * DATA FLOW: chart[0], chart[1] -> chart[2]
 * @param myChart The chart object
 */
function lightCurve(myChart: Chart, err1: ScatterDataPoint[], err2: ScatterDataPoint[]) {
    let lcHTML =
        '<form title="Light Curve" id="light-curve-form" style="padding-bottom: .5em" onSubmit="return false;">\n' +
        '<div class="row">\n' +
        '<div class="col-sm-7">Select Variable Star: </div>\n' +
        '<div class="col-sm-5"><select name="source" style="width: 100%;" title="Select Source">\n' +
        '<option value="none" title="None" selected>None</option>\n';
    for (let i = 0; i < 2; i++) {
        let label = myChart.data.datasets[i].label;
        lcHTML +=
            '<option value="' + label +
            '" title="' + label +
            '">' + label + '</option>\n';
    }
    lcHTML +=
        '</select></div>\n' +
        '</div>\n' +
        '<div class="row">\n' +
        '<div class="col-sm-7">Reference Star Actual Mag: </div>\n' +
        '<div class="col-sm-5"><input class="field" type="number" step="0.001" name="mag" title="Magnitude" value=0></input></div>\n' +
        '</div>\n' +
        '</form>\n';
    document.getElementById('light-curve-div').innerHTML = lcHTML;
    const variableForm = document.getElementById('variableTest-form') as VariableForm;
    const lightCurveForm = document.getElementById('light-curve-form') as VariableLightCurveForm;

    lightCurveForm.oninput = function () {
        // myChart.data.datasets[5].data = err1
        // myChart.data.datasets[6].data = err2
        if (lightCurveForm.source.value === "none") {
            updateChart(myChart, 0, 1, 5, 6);
            updateLabels(myChart, document.getElementById('chart-info-form') as ChartInfoForm);
            variableForm.mode[1].disabled = true;
            variableForm.mode[2].disabled = true;
        } else {
            const datasets = myChart.data.datasets;
            let srcData: ScatterDataPoint[];
            let refData: ScatterDataPoint[];
            let errVar: ScatterDataPoint[];
            let errRef: ScatterDataPoint[];

            if (lightCurveForm.source.value === datasets[0].label) {
                srcData = datasets[0].data as ScatterDataPoint[];
                refData = datasets[1].data as ScatterDataPoint[];
                errVar = datasets[5].data as ScatterDataPoint[];
                errRef = datasets[6].data as ScatterDataPoint[];
            } else {
                srcData = datasets[1].data as ScatterDataPoint[];
                refData = datasets[0].data as ScatterDataPoint[];
                errVar = datasets[6].data as ScatterDataPoint[];
                errRef = datasets[5].data as ScatterDataPoint[];
            }
            const lcData = [];
            const ebarData = [];
            const err1Data = [];
            const err2Data = [];
            const len = Math.min(datasets[0].data.length, datasets[1].data.length, datasets[5].data.length, datasets[6].data.length);
            let srcDataPoint = 0;
            let refDataPoint = 0;
            let err_var_plus = 0;
            let err_var_minus = 0;
            let err_ref_plus = 0;
            let err_ref_minus = 0;
            let whetherjd = true;

            for (let i = 0; i < len; i++) {
                if(srcData[i]["x"] !== null && srcData[i]["y"] !== null){

                    lcData.push({
                        "x": srcData[i]["x"],
                        "y": srcData[i]["y"] - refData[i]["y"] + parseFloat(lightCurveForm.mag.value),
                    });


                    // updating error bar information
                    
                            for (let j = 0; j < 3; j++){
        
        
                                if (errVar[3*i+j]["y"] === null){
                                    ebarData.push({
                                        "x": null,
                                        "y": null,
                                    })
                                    err1Data.push({
                                        "x": null,
                                        "y": null,
                                    })
                                    err2Data.push({
                                        "x": null,
                                        "y": null,
                                    })
                                }else if(j === 1 && whetherjd){
                                    srcDataPoint = (srcData as ScatterDataPoint[])[i]["y"]
                                    refDataPoint = (refData as ScatterDataPoint[])[i]["y"]
                                    err_var_minus = srcDataPoint - (errVar as ScatterDataPoint[])[3*i+j]["y"]
                                    err_ref_minus = refDataPoint - (errRef as ScatterDataPoint[])[3*i+j]["y"]


                                    err1Data.push({
                                        "x": srcData[i]["x"],
                                        "y": (errVar as ScatterDataPoint[])[3*i+j]["y"],
                                    })
                                    err2Data.push({
                                        "x": srcData[i]["x"],
                                        "y": (errVar as ScatterDataPoint[])[3*i+j]["y"],
                                    })
                                    
                                }else if(j === 2 && whetherjd){
                                    srcDataPoint = (srcData as ScatterDataPoint[])[i]["y"]
                                    refDataPoint = (refData as ScatterDataPoint[])[i]["y"]
                                    err_var_plus = - srcDataPoint + (errVar as ScatterDataPoint[])[3*i+j]["y"]
                                    err_ref_plus = - refDataPoint + (errRef as ScatterDataPoint[])[3*i+j]["y"]
                                    // combErr = Math.sqrt(Math.pow(srcDataPoint-erred1,2)+Math.pow(refDataPoint-erred2,2))
                                    ebarData.push({
                                    "x": srcData[i]["x"],
                                    "y": -Math.sqrt(Math.pow(err_var_minus,2) + Math.pow(err_ref_plus,2)) + srcData[i]["y"] - refData[i]["y"] + parseFloat(lightCurveForm.mag.value), 
                                    })
                                    
                                    ebarData.push({
                                        "x": srcData[i]["x"],
                                        "y": Math.sqrt(Math.pow(err_var_plus,2) + Math.pow(err_ref_minus,2)) + srcData[i]["y"] - refData[i]["y"] + parseFloat(lightCurveForm.mag.value),
                                    })

                                    err1Data.push({
                                        "x": srcData[i]["x"],
                                        "y": (errVar as ScatterDataPoint[])[3*i+j]["y"],
                                    })
                                    err2Data.push({
                                        "x": srcData[i]["x"],
                                        "y": (errVar as ScatterDataPoint[])[3*i+j]["y"],
                                    })
                                    
        
                                
                    }
                    
                        
                    }
                }
            }
            variableForm.mode[1].disabled = false;
            variableForm.mode[2].disabled = false;

            myChart.data.datasets[2].data = lcData;
            myChart.data.datasets[7].data = ebarData;
            // myChart.data.datasets[5].data = err1Data;
            // myChart.data.datasets[6].data = err2Data;

            for (let i = 2; i < 5; i++) {
                myChart.data.datasets[i].label = "Variable Star Mag + (" + lightCurveForm.mag.value + " - Reference Star Mag)";
            }
            myChart.options.scales['x'].min = lcData[0].x;
            myChart.options.scales['x'].max = lcData[lcData.length-1].x;
            
            updateChart(myChart, 2, 7);
            updateLabels(myChart, document.getElementById('chart-info-form') as ChartInfoForm);

        }
    }

    const fHTML =
        '<form title="Fourier" id="fourier-form" style="padding-bottom: .5em" onSubmit="return false;">\n' +
        '<div class="row">\n' +
        '<div class="col-sm-7">Start Period (days): </div>\n' +
        '<div class="col-sm-5"><input class="field" type="number" step="0.0001" name="start" title="Start Period" value=0.1></input></div>\n' +
        '</div>\n' +
        '<div class="row">\n' +
        '<div class="col-sm-7">Stop Period (days): </div>\n' +
        '<div class="col-sm-5"><input class="field" type="number" step="0.0001" name="stop" title="Stop Period" value=1></input></div>\n' +
        '</div>\n' +
        '</form>\n';

    document.getElementById("fourier-div").innerHTML = fHTML;
    const fourierForm = document.getElementById("fourier-form") as VariableFourierForm;


    fourierForm.start.oninput = debounce(()=> {
        let starting = (myChart.data.datasets[2].data[myChart.data.datasets[2].data.length-1] as ScatterDataPoint).x;
        let ending = (myChart.data.datasets[2].data[0] as ScatterDataPoint).x;
        let range = Math.abs(starting-ending);
        fourierForm.start.value = clamp(parseFloat(fourierForm.start.value),10e-4,range)
    }, 1000)

    fourierForm.oninput = function() {
        let starting = (myChart.data.datasets[2].data[myChart.data.datasets[2].data.length-1] as ScatterDataPoint).x;
        let ending = (myChart.data.datasets[2].data[0] as ScatterDataPoint).x;
        let range = Math.abs(starting-ending);

        // debounce(()=> {
        // fourierForm.start.value = clamp(parseFloat(fourierForm.start.value),10e-4,range)
        // }, 1000)
        let start = parseFloat(fourierForm.start.value);

        fourierForm.stop.value = clamp(parseFloat(fourierForm.stop.value),start,range)
        let stop = parseFloat(fourierForm.stop.value);
        if (start > stop) {
            // alert("Please make sure the stop value is greater than the start value.");
            return;
        }
        let fData = [];
        let fDataWError = [];

        let lcData = myChart.data.datasets[2].data as ScatterDataPoint[];
        let tArray = lcData.map((entry: ScatterDataPoint) => entry.x);
        let yArray = lcData.map((entry: ScatterDataPoint) => entry.y);
        let errData = myChart.data.datasets[7].data as ScatterDataPoint[];
        let errOriginal = errData.map((entry: ScatterDataPoint) => entry.y);
        let error = []

        for(let i = 0; i < yArray.length; i++){
            error.push(
                errOriginal[3*i+2]-yArray[i]
            )
        }

        fDataWError = lombScargleWithError(tArray, yArray, error, start,stop, 2000)
        myChart.data.datasets[3].data = fDataWError;

        fData = lombScargle(tArray, yArray, start, stop, 2000);
        // myChart.data.datasets[3].data = fData;
        // console.log(fData)
        // console.log(fDataWError)
        
        

        
        
        myChart.options.scales['x'].min = start;
        myChart.options.scales['x'].max = stop;
        updateChart(myChart, 3);
    }
    // },1000)

    const pfHTML =
        '<form title="Period Folding" id="period-folding-form" style="padding-bottom: .5em" onSubmit="return false;">\n' +
        "</div>\n" +
        '<div class="row">\n' +
        "</div>\n" +
        '<div class="row">\n' + 
        '<div class="col-sm-1"><input type="checkbox" class="range" name="doublePeriodMode" value="0" id="doublePeriodMode" checked></div>\n'+
        '<div class="col-sm-5">Show Two Periods</div>\n' +
        '</div>\n' +
        '<div class="row">\n' +
        '</div>\n' +
        '<div class="row">\n' +
        '<div class="col-sm-5 des">Period (days):</div>\n' +
        '<div class="col-sm-4 range"><input type="range" title="Period" name="period"></div>\n' +
        '<div class="col-sm-3 text"><input type="number" title="Period" name="period_num" class="spinboxnum field" StringFormat={}{0:N2} step="0.001"></div>\n' +
        '</div>\n' +
        '<div class="row">\n' +
        '<div class="col-sm-5 des">Phase (cycles):</div>\n' +
        '<div class="col-sm-4 range"><input type="range" title="phase" name="phase"></div>\n' +
        '<div class="col-sm-3 text"><input type="number" title="phase_num" name="phase_num" class="field"></div>\n' +
        '<div class="row">\n' +
        '</div>\n' 


    document.getElementById("period-folding-div").innerHTML = pfHTML;
    const periodFoldingForm = document.getElementById("period-folding-form") as VariablePeriodFoldingForm;

    
    periodFoldingForm.doublePeriodMode.onchange = function(){

        // console.log(periodFoldingForm.doublePeriodMode.checked)
        updatePeriodFolding(myChart, parseFloat(periodFoldingForm.period_num.value), parseFloat(periodFoldingForm.phase_num.value),periodFoldingForm.doublePeriodMode.checked)
    }

    periodFoldingForm.oninput = function () {
        let start = (myChart.data.datasets[2].data[myChart.data.datasets[2].data.length-1] as ScatterDataPoint).x;
        let end = (myChart.data.datasets[2].data[0] as ScatterDataPoint).x;
        let range = Math.abs(start-end);
        let step = 10e-5
        // if ((periodFoldingForm.period_num.value/range)*0.01 > 10e-5){
        //     step = round((periodFoldingForm.period_num.value/range)*0.01, 5)
        // }
        linkInputsVar(
            periodFoldingForm["period"],
            periodFoldingForm["period_num"],
            parseFloat(fourierForm.start.value), range, 0.01, range, true
        );
        periodFoldingForm["period"].step = 0.001


        
        linkInputs(
            periodFoldingForm["phase"], 
            periodFoldingForm["phase_num"], 
            0, 
            1, 
            0.01, 
            0
        );
        updatePeriodFolding(myChart, parseFloat(periodFoldingForm.period_num.value), parseFloat(periodFoldingForm.phase_num.value),periodFoldingForm.doublePeriodMode.checked)
        console.log('part1')
        

        periodFoldingForm.oninput = throttle(function () {
            console.log('part2')

            // step = round((periodFoldingForm.period_num.value)*0.001, 4)
            if ((periodFoldingForm.period_num.value)*0.01 > 10e-5){
                // step = round((periodFoldingForm.period_num.value/range)*0.01, 4)
                step = round((periodFoldingForm.period_num.value)*0.01, 4)
            }else{
                step = 10e-5
            }
            
            if (periodFoldingForm["period"].min != Math.log(parseFloat(fourierForm.start.value)).toString()){
                periodFoldingForm["period"].min = Math.log(parseFloat(fourierForm.start.value)).toString()
                periodFoldingForm["period_num"].value = clamp(periodFoldingForm["period_num"].value, parseFloat(fourierForm.start.value), range)
            } 

            // periodFoldingForm["period_num"].min = fourierForm.start.value
            // debounce(()=> {
            // periodFoldingForm["period_num"].value = clamp(periodFoldingForm["period_num"].value, parseFloat(fourierForm.start.value), range)
            // console.log('debounced')
            // },1000),
            console.log(periodFoldingForm["period_num"].value,parseFloat(fourierForm.start.value), range)
            
            periodFoldingForm["period_num"].step = step
            // periodFoldingForm["period"].step = step

            // periodFoldingForm["phase_num"].step = 0.01*periodFoldingForm["phase_num"].value/range

            updatePeriodFolding(myChart, parseFloat(periodFoldingForm.period_num.value), parseFloat(periodFoldingForm.phase_num.value),periodFoldingForm.doublePeriodMode.checked)

        },3);
            
    };


    }

export function debounce(func: Function, wait: number) {
    let timeout: number = undefined;
    return function (...args: any[]) {
        clearTimeout(timeout);
        timeout = setTimeout(() => { func.apply(this, args); }, wait);
    }
}
/**
 * This function updates the datapoints on the period folding chart based on the entry in the period folding
 * form. 
 * @param {Chart} myChart 
 * @param {Number} dataIndex The period used to fold the data.
 */
function updatePeriodFolding(myChart: Chart, period: number, phase: number, doubleMode: boolean) {
    let datasets = myChart.data.datasets;
    let minMJD = myChart.data.minMJD;
    let pfData = [];
    // let error = myChart.data.datasets[7].data;
    let ebarData = [];
    if (period !== 0) {
        for (let i = 0; i < datasets[2].data.length; i++) {
            let temp_x = phase*period + floatMod((datasets[2].data[i] as ScatterDataPoint).x - minMJD, period);
            if(temp_x > period){
                temp_x -= period
            };
            pfData.push({
                "x": temp_x,
                "y": (datasets[2].data[i] as ScatterDataPoint).y,
            });
            for (let j = 0; j < 3; j++){
                ebarData.push({
                    "x": temp_x,
                    "y": (datasets[7].data[3*i+j] as ScatterDataPoint).y,
                });
            }

            if (doubleMode == true){
            pfData.push({
                "x": temp_x+period,
                "y": (datasets[2].data[i] as ScatterDataPoint).y,
            });
            for (let j = 0; j < 3; j++){
                ebarData.push({
                    "x": temp_x+period,
                    "y": (datasets[7].data[3*i+j] as ScatterDataPoint).y,
                });
            }
            }
        }
        myChart.data.datasets[4].data = pfData;
        myChart.data.datasets[8].data = ebarData
        myChart.options.scales['x'].min = 0;
        if (doubleMode == true){
            myChart.options.scales['x'].max = (period)*2
        }else{
        myChart.options.scales['x'].max = (period);
        }
        
    } else {
        for (let i = 0; i < datasets[2].data.length; i++) {
            pfData.push({
                "x": 0, 
                "y": (datasets[2].data[i] as ScatterDataPoint).y
            })

            for (let j = 0; j < 3; j++){
                ebarData.push({
                    "x": 0,
                    "y": (datasets[7].data[3*i+j] as ScatterDataPoint).y,
                });
            }
        }
        myChart.data.datasets[4].data = pfData;
        myChart.data.datasets[8].data = ebarData;
    }

    // let error = myChart.data.datasets[7].data
    // console.log((datasets[5].data[0] as ScatterDataPoint).y)
    // let errors: Array<{x: number, y: number}> = [];
    
    // myChart.data.datasets[7].data=errors



    updateChart(myChart, 4, 8);
    updateLabels(myChart, document.getElementById('chart-info-form') as ChartInfoForm);
}


/**
 * This function set up the chart by hiding all unnecessary datasets, and then adjust the chart scaling
 * to fit the data to be displayed.
 * @param {Chart} myChart 
 * @param {Number[]} dataIndex 
 */
function updateChart(myChart: Chart, ...dataIndices: number[]) {
    // console.log("updateChart called");
    for (let i = 0; i < 9; i++) {
        myChart.data.datasets[i].hidden = true;

    }
    // Reversing y-axis for lc and pf, since a lower value for star magnitude means it's brighter.
    myChart.options.scales['y'].reverse = true;

    for (const dataIndex of dataIndices) {
        myChart.data.datasets[dataIndex].hidden = false;
        if (dataIndex === 3) {
            // Normal y-axis for fourier transform.
            myChart.options.scales['y'].reverse = false;
        }
    }
    myChart.update('none');
}

/**
 * This function serves as a switch for the visibility of the control div's for the different modes.
 * @param id The name of the div to be displayed.
 */
function showDiv(id: string) {
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

/**
 * Julian Date Sort
 * Takes in two tableData rows and return the comparison based on Julian Date
 * @param row1 First row of data to be compared
 * @param row2 Second srow of data to be comapred
 */
function sortJdate(row1: any[], row2: any[]) {
    if (row1[0] === row2[0]) {
        return 0;
    }
    return (row1[0] < row2[0]) ? -1 : 1;
}
