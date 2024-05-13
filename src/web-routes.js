import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const codeSrcPath = __dirname;
const codeRootPath = path.resolve(codeSrcPath, '..');  /* eslint-disable-line no-unused-vars */

/* eslint-disable-next-line no-unused-vars */
function getNodeDependencyRootPath(dependencyName) {
  const packageJSON =
    import.meta.resolve(dependencyName + '/package.json');

  return path.dirname(fileURLToPath(packageJSON));
}

export const stationaryCodeRoutes = [
  {
    from: path.join(codeSrcPath, 'static'),
    to: ['static.root'],
  },

  {
    from: path.join(codeSrcPath, 'util'),
    to: ['util.root'],
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
  wikiCachePath,  /* eslint-disable-line no-unused-vars */
}) {
  const routeFunctions = [
    () => Promise.resolve([
      {from: path.resolve(mediaPath), to: ['media.root']},
      {from: path.resolve(mediaCachePath), to: ['thumb.root']},
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
