"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const webdriverAccess_1 = require("./webdriverAccess");
const common_1 = require("./common");
// necessary to launch without specifiying a path
var chromedriver = require('chromedriver');
let frameworks = common_1.initializeFrameworks();
let init = `
window.nonKeyedDetector_reset = function() {
    window.nonKeyedDetector_tradded = 0;
    window.nonKeyedDetector_trremoved = 0;
    window.nonKeyedDetector_removedStoredTr = 0;
}

window.nonKeyedDetector_setUseShadowDom = function(useShadowDom ) {
    window.nonKeyedDetector_shadowRoot = useShadowDom;
}

window.nonKeyedDetector_instrument = function() {
    let node = document;
    if (window.nonKeyedDetector_shadowRoot) {
        let main = document.querySelector("main-element");
        if (!main) return;
        node = main.shadowRoot;
    }
    var target = node.querySelector('table.table');
    if (!target) return false;

    function countTRInNodeList(nodeList) {
        let trCount = 0;
        nodeList.forEach(n => {
            if (n.tagName==='TR') {
                trCount += 1 + countTRInNodeList(n.childNodes);
            }
        });
        return trCount;
    }

    function countSelectedTRInNodeList(nodeList) {
        let trFoundCount = 0;
        nodeList.forEach(n => {
            if (n==window.storedTr) {
                trFoundCount +=1;
            }
        });
        return trFoundCount;
    }

    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                nonKeyedDetector_tradded += countTRInNodeList(mutation.addedNodes);
                nonKeyedDetector_trremoved += countTRInNodeList(mutation.removedNodes);
                nonKeyedDetector_removedStoredTr += countSelectedTRInNodeList(mutation.removedNodes)
            }
            // console.log(mutation.type, mutation.addedNodes.length, mutation.removedNodes.length, mutation);
        });
    });
    var config = { childList:true, attributes: true, subtree: true, characterData: true };

    observer.observe(target, config);
    return true;
}
window.nonKeyedDetector_result = function() {
    return {tradded: nonKeyedDetector_tradded, trremoved: nonKeyedDetector_trremoved, removedStoredTr: nonKeyedDetector_removedStoredTr};
}
window.nonKeyedDetector_storeTr = function() {
    let node = document;
    if (window.nonKeyedDetector_shadowRoot) {
        let main = document.querySelector("main-element");
        if (main) node = main.shadowRoot;
    }
    window.storedTr = node.querySelector('tr:nth-child(2)');
}
window.nonKeyedDetector_reset();
`;
function isKeyedRun(result) {
    return (result.tradded >= 1000 && result.trremoved > 0 && result.removedStoredTr > 0);
}
function isKeyedRemove(result) {
    return (result.removedStoredTr > 0);
}
function isKeyedSwapRow(result) {
    return (result.tradded > 0 && result.trremoved > 0);
}
async function runBench(frameworkNames) {
    let runFrameworks = frameworks.filter(f => frameworkNames.some(name => f.fullNameWithKeyedAndVersion.indexOf(name) > -1));
    console.log("Frameworks that will be checked", runFrameworks.map(f => f.fullNameWithKeyedAndVersion).join(' '));
    let frameworkMap = new Map();
    frameworks.forEach(f => frameworkMap.set(f.fullNameWithKeyedAndVersion, f));
    let allCorrect = true;
    for (let i = 0; i < runFrameworks.length; i++) {
        let driver = await webdriverAccess_1.buildDriver(benchmarkOptions);
        try {
            let framework = runFrameworks[i];
            webdriverAccess_1.setUseShadowRoot(framework.useShadowRoot);
            await driver.get(`http://localhost:${common_1.config.PORT}/${framework.uri}/`);
            await webdriverAccess_1.testElementLocatedById(driver, "add");
            await webdriverAccess_1.clickElementById(driver, 'run');
            await webdriverAccess_1.testTextContains(driver, '//tbody/tr[1000]/td[1]', '1000');
            await driver.executeScript(init);
            await driver.executeScript(`window.nonKeyedDetector_setUseShadowDom(${framework.useShadowRoot});`);
            await driver.executeScript('window.nonKeyedDetector_instrument()');
            // swap
            await driver.executeScript('nonKeyedDetector_storeTr()');
            await webdriverAccess_1.clickElementById(driver, 'swaprows');
            await webdriverAccess_1.testTextContains(driver, '//tbody/tr[2]/td[1]', '999');
            let res = await driver.executeScript('return nonKeyedDetector_result()');
            let keyedSwap = isKeyedSwapRow(res);
            // run
            await driver.executeScript('nonKeyedDetector_storeTr()');
            await driver.executeScript('window.nonKeyedDetector_reset()');
            await webdriverAccess_1.clickElementById(driver, 'run');
            await webdriverAccess_1.testTextContains(driver, '//tbody/tr[1000]/td[1]', '2000');
            res = await driver.executeScript('return nonKeyedDetector_result()');
            let keyedRun = isKeyedRun(res);
            // remove
            await driver.executeScript('nonKeyedDetector_storeTr()');
            let text = await webdriverAccess_1.getTextByXPath(driver, `//tbody/tr[2]/td[2]/a`);
            await driver.executeScript('window.nonKeyedDetector_reset()');
            await webdriverAccess_1.clickElementByXPath(driver, `//tbody/tr[2]/td[3]/a/span[1]`);
            await webdriverAccess_1.testTextNotContained(driver, `//tbody/tr[2]/td[2]/a`, text);
            res = await driver.executeScript('return nonKeyedDetector_result()');
            let keyedRemove = isKeyedRemove(res);
            let keyed = keyedRemove && keyedRun && keyedSwap;
            console.log(framework.fullNameWithKeyedAndVersion + " is " + (keyed ? "keyed" : "non-keyed") + " for 'run benchmark' and "
                + (keyedRemove ? "keyed" : "non-keyed") + " for 'remove row benchmark' "
                + (keyedSwap ? "keyed" : "non-keyed") + " for 'swap rows benchmark' "
                + ". It'll appear as " + (keyed ? "keyed" : "non-keyed") + " in the results");
            if (frameworkMap.get(framework.fullNameWithKeyedAndVersion).keyed !== keyed) {
                console.log("ERROR: Framework " + framework.fullNameWithKeyedAndVersion + " is not correctly categorized");
                allCorrect = false;
            }
        }
        catch (e) {
            console.log("ERROR running " + runFrameworks[i].fullNameWithKeyedAndVersion, e);
            allCorrect = false;
        }
        finally {
            await driver.quit();
        }
    }
    if (!allCorrect)
        process.exit(1);
}
let args = yargs(process.argv)
    .usage("$0 [--framework Framework1 Framework2 ...] [--benchmark Benchmark1 Benchmark2 ...]")
    .help('help')
    .default('port', common_1.config.PORT)
    .string('chromeBinary')
    .string('chromeDriver')
    .boolean('headless')
    .array("framework").argv;
common_1.config.PORT = Number(args.port);
let runFrameworks = (args.framework && args.framework.length > 0 ? args.framework : [""]).map(v => v.toString());
let benchmarkOptions = {
    outputDirectory: null,
    port: common_1.config.PORT.toFixed(),
    remoteDebuggingPort: common_1.config.REMOTE_DEBUGGING_PORT,
    chromePort: common_1.config.CHROME_PORT,
    headless: args.headless,
    chromeBinaryPath: args.chromeBinary,
    numIterationsForCPUBenchmarks: common_1.config.REPEAT_RUN,
    numIterationsForMemBenchmarks: common_1.config.REPEAT_RUN_MEM,
    numIterationsForStartupBenchmark: common_1.config.REPEAT_RUN_STARTUP
};
if (args.help) {
    yargs.showHelp();
}
else {
    runBench(runFrameworks);
}
//# sourceMappingURL=isKeyed.js.map