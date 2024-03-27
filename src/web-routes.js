import {readdir} from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const codeSrcPath = __dirname;
const codeRootPath = path.resolve(codeSrcPath, '..');

function getNodeDependencyRootPath(dependencyName) {
  const packageJSON =
    import.meta.resolve(dependencyName + '/package.json');

  return path.dirname(fileURLToPath(packageJSON));
}

export const stationaryCodeRoutes = [
  {
    from: path.join(codeSrcPath, 'static'),
    to: '/static',
  },

  {
    from: path.join(codeSrcPath, 'util'),
    to: '/util',
  },
];

export const dependencyRoutes = [];

export const allStaticWebRoutes = [
  ...stationaryCodeRoutes,
  ...dependencyRoutes,
];

export async function identifyDynamicWebRoutes({
  mediaPath,
  mediaCachePath,
}) {
  const routeFunctions = [
    () => Promise.resolve([
      {from: path.resolve(mediaPath), to: '/media'},
      {from: path.resolve(mediaCachePath), to: '/thumb'},
    ]),
  ];

  const routeCheckPromises =
    routeFunctions.map(fn => fn());

  const routeCheckResults =
    await Promise.all(routeCheckPromises);

  return routeCheckResults.flat();
}

export async function identifyAllWebRoutes(opts) {
  return [
    ...allStaticWebRoutes,
    ...await identifyDynamicWebRoutes(opts),
  ];
}
