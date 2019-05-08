"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const selenium_webdriver_1 = require("selenium-webdriver");
const benchmarks_1 = require("./benchmarks");
const webdriverAccess_1 = require("./webdriverAccess");
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require("fs");
const path = require("path");
const common_1 = require("./common");
const R = require("ramda");
// necessary to launch without specifiying a path
var chromedriver = require('chromedriver');
var jStat = require('jstat').jStat;
function extractRelevantEvents(entries) {
    let filteredEvents = [];
    let protocolEvents = [];
    entries.forEach(x => {
        let e = JSON.parse(x.message).message;
        if (common_1.config.LOG_DETAILS)
            console.log(JSON.stringify(e));
        if (e.method === 'Tracing.dataCollected') {
            protocolEvents.push(e);
        }
        if (e.method && (e.method.startsWith('Page') || e.method.startsWith('Network'))) {
            protocolEvents.push(e);
        }
        else if (e.params.name === 'EventDispatch') {
            if (e.params.args.data.type === "click") {
                if (common_1.config.LOG_TIMELINE)
                    console.log("CLICK ", JSON.stringify(e));
                filteredEvents.push({ type: 'click', ts: +e.params.ts, dur: +e.params.dur, end: +e.params.ts + e.params.dur });
            }
        }
        else if (e.params.name === 'TimeStamp' &&
            (e.params.args.data.message === 'afterBenchmark' || e.params.args.data.message === 'finishedBenchmark' || e.params.args.data.message === 'runBenchmark' || e.params.args.data.message === 'initBenchmark')) {
            filteredEvents.push({ type: e.params.args.data.message, ts: +e.params.ts, dur: 0, end: +e.params.ts });
            if (common_1.config.LOG_TIMELINE)
                console.log("TIMESTAMP ", JSON.stringify(e));
        }
        else if (e.params.name === 'navigationStart') {
            filteredEvents.push({ type: 'navigationStart', ts: +e.params.ts, dur: 0, end: +e.params.ts });
            if (common_1.config.LOG_TIMELINE)
                console.log("NAVIGATION START ", JSON.stringify(e));
        }
        else if (e.params.name === 'Paint') {
            if (common_1.config.LOG_TIMELINE)
                console.log("PAINT ", JSON.stringify(e));
            filteredEvents.push({ type: 'paint', ts: +e.params.ts, dur: +e.params.dur, end: +e.params.ts + e.params.dur, evt: JSON.stringify(e) });
            // } else if (e.params.name==='Rasterize') {
            //     console.log("RASTERIZE ",JSON.stringify(e));
            //     filteredEvents.push({type:'paint', ts: +e.params.ts, dur: +e.params.dur, end: +e.params.ts+e.params.dur, evt: JSON.stringify(e)});
            // } else if (e.params.name==='CompositeLayers') {
            //     console.log("COMPOSITE ",JSON.stringify(e));
            //     filteredEvents.push({type:'paint', ts: +e.params.ts, dur: +e.params.dur, end: +e.params.ts, evt: JSON.stringify(e)});
            // } else if (e.params.name==='Layout') {
            //     console.log("LAYOUT ",JSON.stringify(e));
            //     filteredEvents.push({type:'paint', ts: +e.params.ts, dur: +e.params.dur, end: e.params.ts, evt: JSON.stringify(e)});
            // } else if (e.params.name==='UpdateLayerTree') {
            //     console.log("UPDATELAYER ",JSON.stringify(e));
            //     filteredEvents.push({type:'paint', ts: +e.params.ts, dur: +e.params.dur, end: +e.params.ts+e.params.dur, evt: JSON.stringify(e)});
        }
        else if (e.params.name === 'MajorGC' && e.params.args.usedHeapSizeAfter) {
            filteredEvents.push({ type: 'gc', ts: +e.params.ts, end: +e.params.ts, mem: Number(e.params.args.usedHeapSizeAfter) / 1024 / 1024 });
            if (common_1.config.LOG_TIMELINE)
                console.log("GC ", JSON.stringify(e));
        }
    });
    return { filteredEvents, protocolEvents };
}
async function fetchEventsFromPerformanceLog(driver) {
    let timingResults = [];
    let protocolResults = [];
    let entries = [];
    do {
        entries = await driver.manage().logs().get(selenium_webdriver_1.logging.Type.PERFORMANCE);
        const { filteredEvents, protocolEvents } = extractRelevantEvents(entries);
        timingResults = timingResults.concat(filteredEvents);
        protocolResults = protocolResults.concat(protocolEvents);
    } while (entries.length > 0);
    return { timingResults, protocolResults };
}
function type_eq(requiredType) {
    return (e) => e.type === requiredType;
}
function type_neq(requiredType) {
    return (e) => e.type !== requiredType;
}
function asString(res) {
    return res.reduce((old, cur) => old + "\n" + JSON.stringify(cur), "");
}
function extractRawValue(results, id) {
    let audits = results.audits;
    if (!audits)
        return null;
    let audit_with_id = audits[id];
    if (typeof audit_with_id === 'undefined')
        return null;
    if (typeof audit_with_id.rawValue === 'undefined')
        return null;
    return audit_with_id.rawValue;
}
function rmDir(dirPath) {
    try {
        var files = fs.readdirSync(dirPath);
    }
    catch (e) {
        console.log("error in rmDir " + dirPath, e);
        return;
    }
    if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
            var filePath = path.join(dirPath, files[i]);
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
            else
                rmDir(filePath);
        }
    fs.rmdirSync(dirPath);
}
;
async function runLighthouse(framework, benchmarkOptions) {
    const opts = {
        chromeFlags: [
            "--headless",
            "--no-sandbox",
            "--no-first-run",
            "--enable-automation",
            "--disable-infobars",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-cache",
            "--disable-translate",
            "--disable-sync",
            "--disable-extensions",
            "--disable-default-apps",
            "--window-size=1200,800"
        ],
        onlyCategories: ['performance'],
        port: benchmarkOptions.remoteDebuggingPort
    };
    try {
        let options = { chromeFlags: opts.chromeFlags, logLevel: "info" };
        if (benchmarkOptions.chromeBinaryPath)
            options.chromePath = benchmarkOptions.chromeBinaryPath;
        let chrome = await chromeLauncher.launch(options);
        opts.port = chrome.port;
        let results = null;
        try {
            results = await lighthouse(`http://localhost:${benchmarkOptions.port}/${framework.uri}/`, opts, null);
            await chrome.kill();
        }
        catch (error) {
            console.log("error running lighthouse", error);
            await chrome.kill();
            throw error;
        }
        let LighthouseData = {
            TimeToConsistentlyInteractive: extractRawValue(results.lhr, 'interactive'),
            ScriptBootUpTtime: Math.max(16, extractRawValue(results.lhr, 'bootup-time')),
            MainThreadWorkCost: extractRawValue(results.lhr, 'mainthread-work-breakdown'),
            TotalKiloByteWeight: extractRawValue(results.lhr, 'total-byte-weight') / 1024.0
        };
        return LighthouseData;
    }
    catch (error) {
        console.log("error running lighthouse", error);
        throw error;
    }
}
async function computeResultsCPU(driver, benchmarkOptions, framework, benchmark, warnings) {
    let entriesBrowser = await driver.manage().logs().get(selenium_webdriver_1.logging.Type.BROWSER);
    if (common_1.config.LOG_DEBUG)
        console.log("browser entries", entriesBrowser);
    const perfLogEvents = (await fetchEventsFromPerformanceLog(driver));
    let filteredEvents = perfLogEvents.timingResults;
    if (common_1.config.LOG_DEBUG)
        console.log("filteredEvents ", asString(filteredEvents));
    let remaining = R.dropWhile(type_eq('initBenchmark'))(filteredEvents);
    let results = [];
    while (remaining.length > 0) {
        let evts = R.splitWhen(type_eq('finishedBenchmark'))(remaining);
        if (R.find(type_neq('runBenchmark'))(evts[0]) && evts[1].length > 0) {
            let eventsDuringBenchmark = R.dropWhile(type_neq('runBenchmark'))(evts[0]);
            if (common_1.config.LOG_DEBUG)
                console.log("eventsDuringBenchmark ", eventsDuringBenchmark);
            let clicks = R.filter(type_eq('click'))(eventsDuringBenchmark);
            if (clicks.length !== 1) {
                console.log("exactly one click event is expected", eventsDuringBenchmark);
                throw "exactly one click event is expected";
            }
            let eventsAfterClick = (R.dropWhile(type_neq('click'))(eventsDuringBenchmark));
            if (common_1.config.LOG_DEBUG)
                console.log("eventsAfterClick", eventsAfterClick);
            let paints = R.filter(type_eq('paint'))(eventsAfterClick);
            if (paints.length == 0) {
                console.log("at least one paint event is expected after the click event", eventsAfterClick);
                throw "at least one paint event is expected after the click event";
            }
            console.log("# of paint events ", paints.length);
            if (paints.length > 2) {
                warnings.push(`For framework ${framework.name} and benchmark ${benchmark.id} the number of paint calls is higher than expected. There were ${paints.length} paints though at most 2 are expected. Please consider re-running and check the results`);
                console.log(`For framework ${framework.name} and benchmark ${benchmark.id} the number of paint calls is higher than expected. There were ${paints.length} paints though at most 2 are expected. Please consider re-running and check the results`);
            }
            paints.forEach(p => {
                console.log("duration to paint ", ((p.end - clicks[0].ts) / 1000.0));
            });
            let lastPaint = R.reduce((max, elem) => max.end > elem.end ? max : elem, { end: 0 }, paints);
            let upperBoundForSoundnessCheck = (R.last(eventsDuringBenchmark).end - eventsDuringBenchmark[0].ts) / 1000.0;
            let duration = (lastPaint.end - clicks[0].ts) / 1000.0;
            console.log("*** duration", duration, "upper bound ", upperBoundForSoundnessCheck);
            if (duration < 0) {
                console.log("soundness check failed. reported duration is less 0", asString(eventsDuringBenchmark));
                throw "soundness check failed. reported duration is less 0";
            }
            if (duration > upperBoundForSoundnessCheck) {
                console.log("soundness check failed. reported duration is bigger than whole benchmark duration", asString(eventsDuringBenchmark));
                throw "soundness check failed. reported duration is bigger than whole benchmark duration";
            }
            results.push(duration);
        }
        remaining = R.drop(1, evts[1]);
    }
    if (results.length !== benchmarkOptions.numIterationsForCPUBenchmarks) {
        console.log(`soundness check failed. number or results isn't ${benchmarkOptions.numIterationsForCPUBenchmarks}`, results, asString(filteredEvents));
        throw `soundness check failed. number or results isn't ${benchmarkOptions.numIterationsForCPUBenchmarks}`;
    }
    return results;
}
async function computeResultsMEM(driver, benchmarkOptions, framework, benchmark, warnings) {
    let entriesBrowser = await driver.manage().logs().get(selenium_webdriver_1.logging.Type.BROWSER);
    if (common_1.config.LOG_DEBUG)
        console.log("browser entries", entriesBrowser);
    let filteredEvents = (await fetchEventsFromPerformanceLog(driver)).timingResults;
    if (common_1.config.LOG_DEBUG)
        console.log("filteredEvents ", filteredEvents);
    let remaining = R.dropWhile(type_eq('initBenchmark'))(filteredEvents);
    let results = [];
    while (remaining.length > 0) {
        let evts = R.splitWhen(type_eq('finishedBenchmark'))(remaining);
        if (R.find(type_neq('runBenchmark'))(evts[0]) && evts[1].length > 0) {
            let eventsDuringBenchmark = R.dropWhile(type_neq('runBenchmark'))(evts[0]);
            if (common_1.config.LOG_DEBUG)
                console.log("eventsDuringBenchmark ", eventsDuringBenchmark);
            let gcs = R.filter(type_eq('gc'))(eventsDuringBenchmark);
            let mem = R.last(gcs).mem;
            results.push(mem);
        }
        remaining = R.drop(1, evts[1]);
    }
    // if (results.length !== benchmarkOptions.numIterationsForMemBenchmarks) {
    if (results.length !== 1) { //benchmarkOptions.numIterationsForAllBenchmarks) {
        console.log(`soundness check failed. number or results isn't 1*`, results, asString(filteredEvents));
        throw `soundness check failed. number or results isn't 1`;
    }
    return results[0];
}
async function forceGC(framework, driver) {
    if (framework.name.startsWith("angular-v4")) {
        // workaround for window.gc for angular 4 - closure rewrites windows.gc");
        await driver.executeScript("window.Angular4PreservedGC();");
    }
    else {
        for (let i = 0; i < 5; i++) {
            await driver.executeScript("window.gc();");
        }
    }
}
async function snapMemorySize(driver) {
    // currently needed due to https://github.com/krausest/js-framework-benchmark/issues/538
    let heapSnapshot = await driver.executeScript(":takeHeapSnapshot");
    let node_fields = heapSnapshot.snapshot.meta.node_fields;
    let nodes = heapSnapshot.nodes;
    let k = node_fields.indexOf("self_size");
    let self_size = 0;
    for (let l = nodes.length, d = node_fields.length; k < l; k += d) {
        self_size += nodes[k];
    }
    let memory = self_size / 1024.0 / 1024.0;
    return memory;
}
async function runBenchmark(driver, benchmark, framework) {
    await benchmark.run(driver, framework);
    if (common_1.config.LOG_PROGRESS)
        console.log("after run ", benchmark.id, benchmark.type, framework.name);
    if (benchmark.type === benchmarks_1.BenchmarkType.MEM) {
        await forceGC(framework, driver);
    }
}
async function afterBenchmark(driver, benchmark, framework) {
    if (benchmark.after) {
        await benchmark.after(driver, framework);
        if (common_1.config.LOG_PROGRESS)
            console.log("after benchmark ", benchmark.id, benchmark.type, framework.name);
    }
}
async function initBenchmark(driver, benchmark, framework) {
    await benchmark.init(driver, framework);
    if (common_1.config.LOG_PROGRESS)
        console.log("after initialized ", benchmark.id, benchmark.type, framework.name);
    if (benchmark.type === benchmarks_1.BenchmarkType.MEM) {
        await forceGC(framework, driver);
    }
}
function writeResult(res, dir) {
    let benchmark = res.benchmark;
    let framework = res.framework.name;
    let keyed = res.framework.keyed;
    let type = null;
    switch (benchmark.type) {
        case benchmarks_1.BenchmarkType.CPU:
            type = "cpu";
            break;
        case benchmarks_1.BenchmarkType.MEM:
            type = "memory";
            break;
        case benchmarks_1.BenchmarkType.STARTUP:
            type = "startup";
            break;
    }
    for (let resultKind of benchmark.resultKinds()) {
        let data = benchmark.extractResult(res.results, resultKind);
        let s = jStat(data);
        console.log(`result ${benchmarks_1.fileName(res.framework, resultKind)} min ${s.min()} max ${s.max()} mean ${s.mean()} median ${s.median()} stddev ${s.stdev(true)}`);
        let result = {
            "framework": res.framework.fullNameWithKeyedAndVersion,
            "keyed": keyed,
            "benchmark": resultKind.id,
            "type": type,
            "min": s.min(),
            "max": s.max(),
            "mean": s.mean(),
            "median": s.median(),
            "geometricMean": s.geomean(),
            "standardDeviation": s.stdev(true),
            "values": data
        };
        fs.writeFileSync(`${dir}/${benchmarks_1.fileName(res.framework, resultKind)}`, JSON.stringify(result), { encoding: "utf8" });
    }
}
async function registerError(driver, framework, benchmark, error) {
    let fileName = 'error-' + framework.name + '-' + benchmark.id + '.png';
    console.error("Benchmark failed", error);
    let image = await driver.takeScreenshot();
    console.error(`Writing screenshot ${fileName}`);
    fs.writeFileSync(fileName, image, { encoding: 'base64' });
    return { imageFile: fileName, exception: error };
}
const wait = (delay = 1000) => new Promise(res => setTimeout(res, delay));
async function runCPUBenchmark(framework, benchmark, benchmarkOptions) {
    let errors = [];
    let warnings = [];
    console.log("benchmarking ", framework, benchmark.id);
    let driver = webdriverAccess_1.buildDriver(benchmarkOptions);
    try {
        for (let i = 0; i < benchmarkOptions.numIterationsForCPUBenchmarks; i++) {
            try {
                webdriverAccess_1.setUseShadowRoot(framework.useShadowRoot);
                await driver.get(`http://localhost:${benchmarkOptions.port}/${framework.uri}/`);
                // await (driver as any).sendDevToolsCommand('Network.enable');
                // await (driver as any).sendDevToolsCommand('Network.emulateNetworkConditions', {
                //     offline: false,
                //     latency: 200, // ms
                //     downloadThroughput: 780 * 1024 / 8, // 780 kb/s
                //     uploadThroughput: 330 * 1024 / 8, // 330 kb/s
                // });
                await driver.executeScript("console.timeStamp('initBenchmark')");
                if (framework.name.startsWith("scarletsframe")) {
                    console.log("adding sleep for scarletsframe");
                    await driver.sleep(1000);
                }
                await initBenchmark(driver, benchmark, framework);
                if (benchmark.throttleCPU) {
                    console.log("CPU slowdown", benchmark.throttleCPU);
                    await driver.sendDevToolsCommand('Emulation.setCPUThrottlingRate', { rate: benchmark.throttleCPU });
                }
                await driver.executeScript("console.timeStamp('runBenchmark')");
                await runBenchmark(driver, benchmark, framework);
                if (benchmark.throttleCPU) {
                    console.log("resetting CPU slowdown");
                    await driver.sendDevToolsCommand('Emulation.setCPUThrottlingRate', { rate: 1 });
                }
                await driver.executeScript("console.timeStamp('finishedBenchmark')");
                await afterBenchmark(driver, benchmark, framework);
                await driver.executeScript("console.timeStamp('afterBenchmark')");
            }
            catch (e) {
                errors.push(await registerError(driver, framework, benchmark, e));
                throw e;
            }
        }
        let results = await computeResultsCPU(driver, benchmarkOptions, framework, benchmark, warnings);
        await writeResult({ framework: framework, results: results, benchmark: benchmark }, benchmarkOptions.outputDirectory);
        console.log("QUIT");
        await driver.close();
        await driver.quit();
    }
    catch (e) {
        console.log("ERROR:", e);
        await driver.close();
        await driver.quit();
        if (common_1.config.EXIT_ON_ERROR) {
            throw "Benchmarking failed";
        }
    }
    return { errors, warnings };
}
async function runMemBenchmark(framework, benchmark, benchmarkOptions) {
    let errors = [];
    let warnings = [];
    let allResults = [];
    console.log("benchmarking ", framework, benchmark.id);
    for (let i = 0; i < benchmarkOptions.numIterationsForMemBenchmarks; i++) {
        let driver = webdriverAccess_1.buildDriver(benchmarkOptions);
        try {
            webdriverAccess_1.setUseShadowRoot(framework.useShadowRoot);
            await driver.get(`http://localhost:${benchmarkOptions.port}/${framework.uri}/`);
            await driver.executeScript("console.timeStamp('initBenchmark')");
            if (framework.name.startsWith("scarletsframe")) {
                console.log("adding sleep for scarletsframe");
                await driver.sleep(1000);
            }
            await initBenchmark(driver, benchmark, framework);
            if (benchmark.throttleCPU) {
                console.log("CPU slowdown", benchmark.throttleCPU);
                await driver.sendDevToolsCommand('Emulation.setCPUThrottlingRate', { rate: benchmark.throttleCPU });
            }
            await driver.executeScript("console.timeStamp('runBenchmark')");
            await runBenchmark(driver, benchmark, framework);
            if (benchmark.throttleCPU) {
                console.log("resetting CPU slowdown");
                await driver.sendDevToolsCommand('Emulation.setCPUThrottlingRate', { rate: 1 });
            }
            let snapshotSize = await snapMemorySize(driver);
            await driver.executeScript("console.timeStamp('finishedBenchmark')");
            await afterBenchmark(driver, benchmark, framework);
            await driver.executeScript("console.timeStamp('afterBenchmark')");
            let result = await computeResultsMEM(driver, benchmarkOptions, framework, benchmark, warnings);
            if (common_1.config.LOG_DETAILS)
                console.log("comparison of memory usage. GC log:", result, " :takeHeapSnapshot", snapshotSize);
            allResults.push(result);
        }
        catch (e) {
            errors.push(await registerError(driver, framework, benchmark, e));
            throw e;
        }
        finally {
            await driver.close();
            await driver.quit();
            if (common_1.config.EXIT_ON_ERROR) {
                throw "Benchmarking failed";
            }
        }
    }
    await writeResult({ framework: framework, results: allResults, benchmark: benchmark }, benchmarkOptions.outputDirectory);
    return { errors, warnings };
}
async function runStartupBenchmark(framework, benchmark, benchmarkOptions) {
    console.log("benchmarking startup", framework, benchmark.id);
    let errors = [];
    let results = [];
    for (let i = 0; i < benchmarkOptions.numIterationsForStartupBenchmark; i++) {
        try {
            results.push(await runLighthouse(framework, benchmarkOptions));
        }
        catch (error) {
            errors.push({ imageFile: null, exception: error });
            throw error;
        }
    }
    await writeResult({ framework: framework, results: results, benchmark: benchmark }, benchmarkOptions.outputDirectory);
    return { errors, warnings: [] };
}
async function executeBenchmark(frameworks, keyed, frameworkName, benchmarkName, benchmarkOptions) {
    let runFrameworks = frameworks.filter(f => f.keyed === keyed).filter(f => frameworkName === f.name);
    let runBenchmarks = benchmarks_1.benchmarks.filter(b => benchmarkName === b.id);
    if (runFrameworks.length != 1)
        throw `Framework name ${frameworkName} is not unique`;
    if (runBenchmarks.length != 1)
        throw `Benchmark name ${benchmarkName} is not unique`;
    let framework = runFrameworks[0];
    let benchmark = runBenchmarks[0];
    let errorsAndWarnings;
    if (benchmark.type == benchmarks_1.BenchmarkType.STARTUP) {
        errorsAndWarnings = await runStartupBenchmark(framework, benchmark, benchmarkOptions);
    }
    else if (benchmark.type == benchmarks_1.BenchmarkType.CPU) {
        errorsAndWarnings = await runCPUBenchmark(framework, benchmark, benchmarkOptions);
    }
    else {
        errorsAndWarnings = await runMemBenchmark(framework, benchmark, benchmarkOptions);
    }
    return errorsAndWarnings;
}
exports.executeBenchmark = executeBenchmark;
process.on('message', (msg) => {
    if (common_1.config.LOG_DEBUG)
        console.log("child process got message", msg);
    let { frameworks, keyed, frameworkName, benchmarkName, benchmarkOptions } = msg;
    if (!benchmarkOptions.port)
        benchmarkOptions.port = common_1.config.PORT.toFixed();
    try {
        let errorsPromise = executeBenchmark(frameworks, keyed, frameworkName, benchmarkName, benchmarkOptions);
        errorsPromise.then(errorsAndWarnings => {
            if (common_1.config.LOG_DEBUG)
                console.log("benchmark finished - got errors promise", errorsAndWarnings);
            process.send(errorsAndWarnings);
            process.exit(0);
        }).catch(err => {
            console.log("error running benchmark", err);
            process.exit(1);
        });
    }
    catch (err) {
        console.log("error running benchmark", err);
        process.exit(1);
    }
});
//# sourceMappingURL=forkedBenchmarkRunner.js.map