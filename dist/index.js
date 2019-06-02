"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const build_utils_1 = require("@now/build-utils");
exports.config = {
    maxLambdaSize: '5mb',
};
async function downloadInstallAndBundle({ files, entrypoint, workPath, npmArguments = [], }) {
    console.log('downloading user files...');
    const downloadedFiles = await build_utils_1.download(files, workPath);
    console.log("installing dependencies for user's code...");
    const entrypointFsDirname = path_1.join(workPath, path_1.dirname(entrypoint));
    await build_utils_1.runNpmInstall(entrypointFsDirname, npmArguments);
    const entrypointPath = downloadedFiles[entrypoint].fsPath;
    return { entrypointPath, entrypointFsDirname };
}
async function build({ files, entrypoint, workPath, }) {
    console.log('downloading user files...');
    await downloadInstallAndBundle({
        files,
        entrypoint,
        workPath,
        npmArguments: ['--prefer-offline'],
    });
    await build_utils_1.runShellScript(path_1.join(workPath, entrypoint));
    let outputFiles = await build_utils_1.glob('**', workPath);
    const launcherPath = path_1.join(__dirname, 'launcher.js');
    let launcherData = await fs_extra_1.readFile(launcherPath, 'utf8');
    launcherData = launcherData
        .replace("'__NOW_PORT'", '5000')
        .replace('__NOW_BINARY', 'bin/handler');
    const launcherFiles = {
        'launcher.js': new build_utils_1.FileBlob({ data: launcherData }),
    };
    const lambda = await build_utils_1.createLambda({
        files: { ...outputFiles, ...launcherFiles },
        handler: 'launcher.launcher',
        runtime: 'nodejs8.10',
        environment: {},
    });
    return {
        [entrypoint]: lambda,
    };
}
exports.build = build;
