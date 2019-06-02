"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const build_utils_1 = require("@now/build-utils");
exports.config = {
    maxLambdaSize: '5mb',
};
async function build({ files, entrypoint, workPath, }) {
    console.log('downloading user files...');
    await build_utils_1.download(files, workPath);
    await fs_extra_1.copy(path_1.join(__dirname, 'package.json'), path_1.join(workPath, 'package.json'));
    await build_utils_1.installDependencies(workPath);
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
    return { ...outputFiles, ...launcherFiles };
    // const lambda = await createLambda({
    //   files: { ...outputFiles, ...launcherFiles },
    //   handler: 'launcher.launcher',
    //   runtime: 'nodejs8.10',
    //   environment: {},
    // });
    // return {
    //   [entrypoint]: lambda,
    // };
}
exports.build = build;
