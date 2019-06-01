"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const build_utils_1 = require("@now/build-utils");
exports.build = async ({ files, entrypoint, workPath, }) => {
    console.log('downloading user files...');
    await build_utils_1.download(files, workPath);
    await build_utils_1.runShellScript(path_1.join(workPath, entrypoint));
    let outputFiles = await build_utils_1.glob('**', workPath);
    const lambda = await build_utils_1.createLambda({
        files: outputFiles,
        handler: `handler`,
        runtime: 'go1.x',
        environment: {},
    });
    return {
        [entrypoint]: lambda,
    };
};
