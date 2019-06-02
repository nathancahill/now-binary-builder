import { join, dirname } from 'path';
import { readFile } from 'fs-extra';
import {
  createLambda,
  glob,
  download,
  Files,
  Meta,
  FileBlob,
  runNpmInstall,
  runShellScript,
  BuildOptions,
} from '@now/build-utils';

export const config = {
  maxLambdaSize: '5mb',
};

interface DownloadOptions {
  files: Files;
  entrypoint: string;
  workPath: string;
  meta?: Meta;
  npmArguments?: string[];
}

async function downloadInstallAndBundle({
  files,
  entrypoint,
  workPath,
  npmArguments = [],
}: DownloadOptions) {
  console.log('downloading user files...');
  const downloadedFiles = await download(files, workPath);

  console.log("installing dependencies for user's code...");
  const entrypointFsDirname = join(workPath, dirname(entrypoint));
  await runNpmInstall(entrypointFsDirname, npmArguments);

  const entrypointPath = downloadedFiles[entrypoint].fsPath;
  return { entrypointPath, entrypointFsDirname };
}

export async function build({
  files,
  entrypoint,
  workPath,
}: BuildOptions) {
  console.log('downloading user files...');

  await downloadInstallAndBundle({
    files,
    entrypoint,
    workPath,
    npmArguments: ['--prefer-offline'],
  });

  await runShellScript(join(workPath, entrypoint));

  let outputFiles = await glob('**', workPath);

  const launcherPath = join(__dirname, 'launcher.js');
  let launcherData = await readFile(launcherPath, 'utf8');

  launcherData = launcherData
    .replace("'__NOW_PORT'", '5000')
    .replace('__NOW_BINARY', 'bin/handler');

  const launcherFiles = {
    'launcher.js': new FileBlob({ data: launcherData }),
  };

  const lambda = await createLambda({
    files: { ...outputFiles, ...launcherFiles },
    handler: 'launcher.launcher',
    runtime: 'nodejs8.10',
    environment: {},
  });

  return {
    [entrypoint]: lambda,
  };
}
