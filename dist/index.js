"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const build_utils_1 = require("@now/build-utils");
exports.config = {
    maxLambdaSize: '5mb',
    port: 5000,
    binary: 'bin/handler',
};
async function build({ files, entrypoint, config: userConfig, workPath, }) {
    console.log('downloading user files...');
    await build_utils_1.download(files, workPath);
    await build_utils_1.installDependencies(__dirname, ['--modules-folder', path_1.join(workPath, 'node_modules')]);
    await build_utils_1.runShellScript(path_1.join(workPath, entrypoint));
    let outputFiles = await build_utils_1.glob('**', workPath);
    const launcherPath = path_1.join(__dirname, 'launcher.js');
    let launcherData = await fs_extra_1.readFile(launcherPath, 'utf8');
    const port = userConfig.port || exports.config.port;
    const binary = userConfig.binary || exports.config.binary;
    launcherData = launcherData
        .replace("'__NOW_PORT'", `${port}`)
        .replace('__NOW_BINARY', binary);
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
