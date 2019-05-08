"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chrome = require("selenium-webdriver/chrome");
const selenium_webdriver_1 = require("selenium-webdriver");
const common_1 = require("./common");
let useShadowRoot = false;
function setUseShadowRoot(val) {
    useShadowRoot = val;
}
exports.setUseShadowRoot = setUseShadowRoot;
function convertPath(path) {
    let parts = path.split(/\//).filter(v => !!v);
    let res = [];
    for (let part of parts) {
        let components = part.split(/\[|]/).filter(v => !!v);
        let tagName = components[0];
        let index = 0;
        if (components.length == 2) {
            index = Number(components[1]);
            if (!index) {
                console.log("Index can't be parsed", components[1]);
                throw "Index can't be parsed " + components[1];
            }
        }
        else {
            index = 1;
        }
        res.push({ tagName, index });
    }
    return res;
}
// Fake findByXPath for simple XPath expressions to allow usage with shadow dom
async function findByXPath(node, path) {
    let paths = convertPath(path);
    let n = node;
    try {
        for (let p of paths) {
            // n = n.then(nd => nd.findElements(By.tagName(p.tagName))).then(elems => { // costly since it fetches all elements
            let elems = await n.findElements(selenium_webdriver_1.By.css(p.tagName + ":nth-child(" + (p.index) + ")"));
            if (elems == null || elems.length == 0) {
                return null;
            }
            ;
            n = elems[0];
        }
    }
    catch (e) {
        //can happen for StaleElementReferenceError
        return null;
    }
    return n;
}
function elemNull(v) {
    console.log("*** ELEMENT WAS NULL");
    return false;
}
function waitForCondition(driver) {
    return async function (text, fn, timeout) {
        return await driver.wait(new selenium_webdriver_1.Condition(text, fn), timeout);
    };
}
// driver.findElement(By.xpath("//tbody/tr[1]/td[1]")).getText().then(...) can throw a stale element error:
// thus we're using a safer way here:
async function testTextContains(driver, xpath, text, timeout = common_1.config.TIMEOUT) {
    return waitForCondition(driver)(`testTextContains ${xpath} ${text}`, async function (driver) {
        try {
            let elem = await shadowRoot(driver);
            elem = await findByXPath(elem, xpath);
            if (elem == null)
                return false;
            let v = await elem.getText();
            return v && v.indexOf(text) > -1;
        }
        catch (err) {
            console.log("ignoring error in testTextContains for xpath = " + xpath + " text = " + text, err.toString().split("\n")[0]);
        }
    }, timeout);
}
exports.testTextContains = testTextContains;
function testTextNotContained(driver, xpath, text, timeout = common_1.config.TIMEOUT) {
    return waitForCondition(driver)(`testTextNotContained ${xpath} ${text}`, async function (driver) {
        try {
            let elem = await shadowRoot(driver);
            elem = await findByXPath(elem, xpath);
            if (elem == null)
                return false;
            let v = await elem.getText();
            return v && v.indexOf(text) == -1;
        }
        catch (err) {
            console.log("ignoring error in testTextNotContained for xpath = " + xpath + " text = " + text, err.toString().split("\n")[0]);
        }
    }, timeout);
}
exports.testTextNotContained = testTextNotContained;
function testClassContains(driver, xpath, text, timeout = common_1.config.TIMEOUT) {
    return waitForCondition(driver)(`testClassContains ${xpath} ${text}`, async function (driver) {
        try {
            let elem = await shadowRoot(driver);
            elem = await findByXPath(elem, xpath);
            if (elem == null)
                return false;
            let v = await elem.getAttribute("class");
            return v && v.indexOf(text) > -1;
        }
        catch (err) {
            console.log("ignoring error in testClassContains for xpath = " + xpath + " text = " + text, err.toString().split("\n")[0]);
        }
    }, timeout);
}
exports.testClassContains = testClassContains;
function testElementLocatedByXpath(driver, xpath, timeout = common_1.config.TIMEOUT) {
    return waitForCondition(driver)(`testElementLocatedByXpath ${xpath}`, async function (driver) {
        try {
            let elem = await shadowRoot(driver);
            elem = await findByXPath(elem, xpath);
            return elem ? true : false;
        }
        catch (err) {
            console.log("ignoring error in testElementLocatedByXpath for xpath = " + xpath, err.toString());
        }
    }, timeout);
}
exports.testElementLocatedByXpath = testElementLocatedByXpath;
function testElementNotLocatedByXPath(driver, xpath, timeout = common_1.config.TIMEOUT) {
    return waitForCondition(driver)(`testElementNotLocatedByXPath ${xpath}`, async function (driver) {
        try {
            let elem = await shadowRoot(driver);
            elem = await findByXPath(elem, xpath);
            return elem ? false : true;
        }
        catch (err) {
            console.log("ignoring error in testElementNotLocatedByXPath for xpath = " + xpath, err.toString().split("\n")[0]);
        }
    }, timeout);
}
exports.testElementNotLocatedByXPath = testElementNotLocatedByXPath;
function testElementLocatedById(driver, id, timeout = common_1.config.TIMEOUT) {
    return waitForCondition(driver)(`testElementLocatedById ${id}`, async function (driver) {
        try {
            let elem = await shadowRoot(driver);
            elem = await elem.findElement(selenium_webdriver_1.By.id(id));
            return true;
        }
        catch (err) {
            // console.log("ignoring error in testElementLocatedById for id = "+id,err.toString().split("\n")[0]);
        }
    }, timeout);
}
exports.testElementLocatedById = testElementLocatedById;
async function retry(retryCount, driver, fun) {
    for (let i = 0; i < retryCount; i++) {
        try {
            return fun(driver, i);
        }
        catch (err) {
            console.log("retry failed");
        }
    }
}
// Stale element prevention. For aurelia even after a testElementLocatedById clickElementById for the same id can fail
// No idea how that can be explained
function clickElementById(driver, id) {
    return retry(5, driver, async function (driver) {
        let elem = await shadowRoot(driver);
        elem = await elem.findElement(selenium_webdriver_1.By.id(id));
        await elem.click();
    });
}
exports.clickElementById = clickElementById;
function clickElementByXPath(driver, xpath) {
    return retry(5, driver, async function (driver, count) {
        if (count > 1 && common_1.config.LOG_DETAILS)
            console.log("clickElementByXPath ", xpath, " attempt #", count);
        let elem = await shadowRoot(driver);
        elem = await findByXPath(elem, xpath);
        await elem.click();
    });
    // Stale element possible:
    // return to(driver.findElement(By.xpath(xpath)).click());
}
exports.clickElementByXPath = clickElementByXPath;
async function getTextByXPath(driver, xpath) {
    return await retry(5, driver, async function (driver, count) {
        if (count > 1 && common_1.config.LOG_DETAILS)
            console.log("getTextByXPath ", xpath, " attempt #", count);
        let elem = await shadowRoot(driver);
        elem = await findByXPath(elem, xpath);
        return await elem.getText();
    });
}
exports.getTextByXPath = getTextByXPath;
async function shadowRoot(driver) {
    return useShadowRoot ? await driver.executeScript('return document.querySelector("main-element").shadowRoot')
        : await driver.findElement(selenium_webdriver_1.By.tagName("body"));
}
function buildDriver(benchmarkOptions) {
    let logPref = new selenium_webdriver_1.logging.Preferences();
    logPref.setLevel(selenium_webdriver_1.logging.Type.PERFORMANCE, selenium_webdriver_1.logging.Level.ALL);
    logPref.setLevel(selenium_webdriver_1.logging.Type.BROWSER, selenium_webdriver_1.logging.Level.ALL);
    let options = new chrome.Options();
    if (benchmarkOptions.headless) {
        options = options.addArguments("--headless");
        options = options.addArguments("--disable-gpu"); // https://bugs.chromium.org/p/chromium/issues/detail?id=737678
    }
    options = options.addArguments("--js-flags=--expose-gc");
    options = options.addArguments("--enable-precise-memory-info");
    options = options.addArguments("--no-sandbox");
    options = options.addArguments("--no-first-run");
    options = options.addArguments("--enable-automation");
    options = options.addArguments("--disable-infobars");
    options = options.addArguments("--disable-background-networking");
    options = options.addArguments("--disable-background-timer-throttling");
    options = options.addArguments("--disable-cache");
    options = options.addArguments("--disable-translate");
    options = options.addArguments("--disable-sync");
    options = options.addArguments("--disable-extensions");
    options = options.addArguments("--disable-default-apps");
    options = options.addArguments("--remote-debugging-port=" + (benchmarkOptions.remoteDebuggingPort).toFixed());
    options = options.addArguments("--window-size=1200,800");
    if (benchmarkOptions.chromeBinaryPath)
        options = options.setChromeBinaryPath(benchmarkOptions.chromeBinaryPath);
    options = options.setLoggingPrefs(logPref);
    options = options.setPerfLoggingPrefs({
        enableNetwork: true, enablePage: true,
        traceCategories: 'devtools.timeline,blink.user_timing'
    });
    // Do the following lines really cause https://github.com/krausest/js-framework-benchmark/issues/303 ?
    // return chrome.Driver.createSession(options, service);
    let service = new chrome.ServiceBuilder().setPort(benchmarkOptions.chromePort).build();
    var driver = chrome.Driver.createSession(options, service);
    return driver;
}
exports.buildDriver = buildDriver;
//# sourceMappingURL=webdriverAccess.js.map