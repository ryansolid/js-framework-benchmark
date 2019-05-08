"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const ncu = require('npm-check-updates');
const semver = require("semver");
const yargs = require("yargs");
const common_1 = require("./common");
var exec = require('child_process').execSync;
let args = yargs(process.argv)
    .usage("$0 --updade true|false --dir")
    .default('update', 'true')
    .array('dir')
    .boolean('update').argv;
let updatePackages = args.update;
console.log("ARGS", args._.slice(2, args._.length));
let directories = args._.slice(2, args._.length);
let checkDirectory = (keyedType, folderName) => directories.length === 0 || args._.includes(path.join(keyedType, folderName));
async function ncuReportsUpdatedVersion(packageVersionInfo) {
    let ncuInfo = await ncu.run({
        packageFile: path.resolve('..', 'frameworks', packageVersionInfo.framework.keyedType, packageVersionInfo.framework.directory, 'package.json'),
        silent: true,
        jsonUpgraded: true,
        loglevel: 'silent'
    });
    if (ncuInfo) {
        console.log(ncuInfo);
        return packageVersionInfo.versions.filter((pi) => ncuInfo[pi.packageName])
            .some((pi) => {
            let newVersion = ncuInfo[pi.packageName];
            if (newVersion.startsWith('^'))
                newVersion = newVersion.substring(1);
            if (newVersion.startsWith('~'))
                newVersion = newVersion.substring(1);
            if (newVersion) {
                return !semver.satisfies(newVersion, '~' + pi.version);
            }
            else {
                return false;
            }
        });
    }
    else {
        return false;
    }
}
async function ncuRunUpdate(packageVersionInfo) {
    console.log("Update " + packageVersionInfo.framework.keyedType + '/' + packageVersionInfo.framework.directory);
    await ncu.run({
        packageFile: path.resolve('..', 'frameworks', packageVersionInfo.framework.keyedType, packageVersionInfo.framework.directory, 'package.json'),
        upgrade: true
    });
}
async function main() {
    let frameworkVersionInformations = common_1.loadFrameworkVersionInformation();
    let errors = frameworkVersionInformations.filter(frameworkVersionInformation => frameworkVersionInformation instanceof common_1.FrameworkVersionInformationError);
    if (errors.length > 0) {
        console.log("ERROR: The following frameworks do not include valid version info and must be fixed");
        console.log(errors.map(val => val.keyedType + '/' + val.directory).join('\n') + '\n');
    }
    let manually = frameworkVersionInformations.filter(frameworkVersionInformation => frameworkVersionInformation instanceof common_1.FrameworkVersionInformationStatic);
    if (manually.length > 0) {
        console.log("WARNING: The following frameworks must be updated manually: ");
        console.log(manually.map(val => val.keyedType + '/' + val.directory).join('\n') + '\n');
    }
    let automatically = frameworkVersionInformations
        .filter(frameworkVersionInformation => frameworkVersionInformation instanceof common_1.FrameworkVersionInformationDynamic)
        .map(frameworkVersionInformation => frameworkVersionInformation);
    let packageLockInformations = automatically.map(frameworkVersionInformation => common_1.determineInstalledVersions(frameworkVersionInformation));
    let noPackageLock = packageLockInformations.filter(pli => pli.versions.some((packageVersionInfo) => packageVersionInfo instanceof common_1.PackageVersionInformationErrorNoPackageJSONLock));
    if (noPackageLock.length > 0) {
        console.log("WARNING: The following frameworks do not yet have a package-lock.json file (maybe you must 'npm install' it): ");
        console.log(noPackageLock.map(val => val.framework.keyedType + '/' + val.framework.directory).join('\n') + '\n');
    }
    let unknownPackages = packageLockInformations.filter(pli => pli.versions.some((packageVersionInfo) => packageVersionInfo instanceof common_1.PackageVersionInformationErrorUnknownPackage));
    if (unknownPackages.length > 0) {
        console.log("WARNING: The following frameworks do not have a version for the specified packages in package-lock.json file (maybe you misspelled the package name): ");
        let unknownPackagesStr = (packageVersionInfo) => packageVersionInfo.versions.filter(pvi => pvi instanceof common_1.PackageVersionInformationErrorUnknownPackage).
            map((packageVersionInfo) => packageVersionInfo.packageName).join(', ');
        console.log(unknownPackages.map(val => val.framework.keyedType + '/' + val.framework.directory + ' for package ' + unknownPackagesStr(val)).join('\n') + '\n');
    }
    let checkVersionsFor = packageLockInformations
        .filter(pli => pli.versions.every((packageVersionInfo) => packageVersionInfo instanceof common_1.PackageVersionInformationValid))
        .filter(f => checkDirectory(f.framework.keyedType, f.framework.directory));
    console.log("checkVersionsFor", checkVersionsFor);
    let toBeUpdated = new Array();
    for (let f of checkVersionsFor) {
        if (await ncuReportsUpdatedVersion(f))
            toBeUpdated.push(f);
    }
    console.log("The following frameworks can be updated");
    if (toBeUpdated.length > 0) {
        console.log(toBeUpdated.map(val => val.framework.keyedType + '/' + val.framework.directory).join('\n') + '\n');
        if (updatePackages) {
            let rebuild = "";
            for (let val of toBeUpdated) {
                console.log("ACTION: Updating package.json for " + val.framework.keyedType + '/' + val.framework.directory);
                await ncuRunUpdate(val);
                let prefix = `${val.framework.keyedType}/${val.framework.directory}`;
                rebuild = rebuild + "'" + prefix + "' ";
            }
            console.log("\nTODO: Rebuilding is required:");
            console.log(`npm run rebuild -- ${rebuild}`);
            exec('npm run rebuild -- ' + rebuild, {
                stdio: 'inherit'
            });
        }
    }
}
main()
    .then(text => {
})
    .catch(err => {
    console.log('error', err);
});
//# sourceMappingURL=updateFrameworks.js.map