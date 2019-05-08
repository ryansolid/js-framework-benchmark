"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const benchmarks_1 = require("./benchmarks");
const fs = require("fs");
const yargs = require("yargs");
const common_1 = require("./common");
const child_process_1 = require("child_process");
const forkedBenchmarkRunner_1 = require("./forkedBenchmarkRunner");
let frameworks = common_1.initializeFrameworks();
function forkedRun(frameworkName, keyed, benchmarkName, benchmarkOptions) {
    if (common_1.config.FORK_CHROMEDRIVER) {
        return new Promise(function (resolve, reject) {
            const forked = child_process_1.fork('dist/forkedBenchmarkRunner.js');
            if (common_1.config.LOG_DEBUG)
                console.log("forked child process");
            forked.send({ frameworks, keyed, frameworkName, benchmarkName, benchmarkOptions });
            forked.on('message', (msg) => {
                if (common_1.config.LOG_DEBUG)
                    console.log("main process got message from child", msg);
                resolve(msg);
            });
        });
    }
    else {
        return forkedBenchmarkRunner_1.executeBenchmark(frameworks, keyed, frameworkName, benchmarkName, benchmarkOptions);
    }
}
async function runBench(frameworkNames, benchmarkNames, dir) {
    let errors = [];
    let warnings = [];
    let runFrameworks = frameworks.filter(f => frameworkNames.some(name => f.fullNameWithKeyedAndVersion.indexOf(name) > -1));
    let runBenchmarks = benchmarks_1.benchmarks.filter(b => benchmarkNames.some(name => b.id.toLowerCase().indexOf(name) > -1));
    let restart = undefined; // 'rx-domh-rxjs-v0.0.2-keyed';
    let index = runFrameworks.findIndex(f => f.fullNameWithKeyedAndVersion === restart);
    if (index > -1) {
        runFrameworks = runFrameworks.slice(index);
    }
    console.log("Frameworks that will be benchmarked", runFrameworks);
    console.log("Benchmarks that will be run", runBenchmarks.map(b => b.id));
    let data = [];
    for (let i = 0; i < runFrameworks.length; i++) {
        for (let j = 0; j < runBenchmarks.length; j++) {
            data.push([runFrameworks[i], runBenchmarks[j]]);
        }
    }
    for (let i = 0; i < data.length; i++) {
        let framework = data[i][0];
        let benchmark = data[i][1];
        let benchmarkOptions = {
            outputDirectory: dir,
            port: common_1.config.PORT.toFixed(),
            remoteDebuggingPort: common_1.config.REMOTE_DEBUGGING_PORT,
            chromePort: common_1.config.CHROME_PORT,
            headless: args.headless,
            chromeBinaryPath: args.chromeBinary,
            numIterationsForCPUBenchmarks: common_1.config.REPEAT_RUN,
            numIterationsForMemBenchmarks: common_1.config.REPEAT_RUN_MEM,
            numIterationsForStartupBenchmark: common_1.config.REPEAT_RUN_STARTUP
        };
        try {
            let errorsAndWarnings = await forkedRun(framework.name, framework.keyed, benchmark.id, benchmarkOptions);
            errors.splice(errors.length, 0, ...errorsAndWarnings.errors);
            warnings.splice(warnings.length, 0, ...errorsAndWarnings.warnings);
        }
        catch (err) {
            console.log(`Error executing benchmark ${framework.name} and benchmark ${benchmark.id}`);
        }
    }
    if (warnings.length > 0) {
        console.log("================================");
        console.log("The following warnings were logged:");
        console.log("================================");
        warnings.forEach(e => {
            console.log(e);
        });
    }
    if (errors.length > 0) {
        console.log("================================");
        console.log("The following benchmarks failed:");
        console.log("================================");
        errors.forEach(e => {
            console.log("[" + e.imageFile + "]");
            console.log(e.exception);
            console.log();
        });
        throw "Benchmarking failed with errors";
    }
}
let args = yargs(process.argv)
    .usage("$0 [--framework Framework1 Framework2 ...] [--benchmark Benchmark1 Benchmark2 ...] [--count n] [--exitOnError]")
    .help('help')
    .default('check', 'false')
    .default('fork', 'true')
    .default('exitOnError', 'false')
    .default('count', Number.MAX_SAFE_INTEGER)
    .default('port', common_1.config.PORT)
    .string('chromeBinary')
    .string('chromeDriver')
    .boolean('headless')
    .array("framework").array("benchmark").argv;
console.log(args);
let runBenchmarks = (args.benchmark && args.benchmark.length > 0 ? args.benchmark : [""]).map(v => v.toString());
let runFrameworks = (args.framework && args.framework.length > 0 ? args.framework : [""]).map(v => v.toString());
let count = Number(args.count);
common_1.config.PORT = Number(args.port);
if (count < Number.MAX_SAFE_INTEGER)
    common_1.config.REPEAT_RUN = count;
common_1.config.REPEAT_RUN_MEM = Math.min(count, common_1.config.REPEAT_RUN_MEM);
common_1.config.REPEAT_RUN_STARTUP = Math.min(count, common_1.config.REPEAT_RUN_STARTUP);
common_1.config.FORK_CHROMEDRIVER = args.fork === 'true';
let dir = args.check === 'true' ? "results_check" : "results";
let exitOnError = args.exitOnError === 'true';
common_1.config.EXIT_ON_ERROR = exitOnError;
console.log("fork chromedriver process?", common_1.config.FORK_CHROMEDRIVER);
if (!fs.existsSync(dir))
    fs.mkdirSync(dir);
if (args.help) {
    yargs.showHelp();
}
else {
    runBench(runFrameworks, runBenchmarks, dir).then(_ => {
        console.log("successful run");
    }).catch(error => {
        console.log("run was not completely sucessful");
    });
}
//# sourceMappingURL=benchmarkRunner.js.map