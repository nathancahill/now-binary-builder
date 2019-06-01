import { join } from 'path';
import {
  createLambda,
  glob,
  download,
  runShellScript,
  BuildOptions,
} from '@now/build-utils';

exports.build = async ({
  files,
  entrypoint,
  workPath,
}: BuildOptions) => {
  console.log('downloading user files...');
  await download(files, workPath);
  await runShellScript(join(workPath, entrypoint));

  let outputFiles = await glob('**', workPath);

  const lambda = await createLambda({
    files: outputFiles,
    handler: `handler`,
    runtime: 'go1.x',
    environment: {},
  });

  return {
    [entrypoint]: lambda,
  };
}
