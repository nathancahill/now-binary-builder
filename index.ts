import { join } from 'path';
import { readFile } from 'fs-extra';
import {
  createLambda,
  glob,
  download,
  FileBlob,
  runShellScript,
  BuildOptions,
} from '@now/build-utils';

export const config = {
  maxLambdaSize: '5mb',
};

export async function build({
  files,
  entrypoint,
  workPath,
}: BuildOptions) {
  console.log('downloading user files...');
  await download(files, workPath);
  await runShellScript(join(workPath, entrypoint));

  let outputFiles = await glob('**', workPath);

  const launcherPath = join(__dirname, 'launcher.js');
  let launcherData = await readFile(launcherPath, 'utf8');

  launcherData = launcherData.replace("'__NOW_PORT'", '5000');
  launcherData = launcherData.replace('__NOW_BINARY', join(workPath, 'bin', 'handler'))

  const launcherFiles = {
    'launcher.js': new FileBlob({ data: launcherData }),
  };

  console.log(Object.keys({ ...outputFiles, ...launcherFiles }))

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
