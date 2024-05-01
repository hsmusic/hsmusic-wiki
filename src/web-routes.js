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
    from: path.join(codeSrcPath, 'static', 'css'),
    to: ['staticCSS.root'],
  },

  {
    from: path.join(codeSrcPath, 'static', 'js'),
    to: ['staticJS.root'],
  },

  {
    from: path.join(codeSrcPath, 'static', 'misc'),
    to: ['staticMisc.root'],
  },

  {
    from: path.join(codeSrcPath, 'util'),
    to: ['staticSharedUtil.root'],
  },
];

export const dependencyRoutes = [
  {
    from:
      path.join(
        getNodeDependencyRootPath('flexsearch'),
        'dist'),

    to: ['staticLib.path', 'flexsearch'],
  },

  {
    from:
      getNodeDependencyRootPath('chroma-js'),

    to: ['staticLib.path', 'chroma-js'],
  }
];

export const allStaticWebRoutes = [
  ...stationaryCodeRoutes,
  ...dependencyRoutes,
];

export async function identifyDynamicWebRoutes({
  mediaPath,
  mediaCachePath,
  wikiCachePath,
}) {
  const routeFunctions = [
    () => Promise.resolve([
      {from: path.resolve(mediaPath), to: ['media.root']},
      {from: path.resolve(mediaCachePath), to: ['thumb.root']},
    ]),

    () => {
      if (!wikiCachePath) return [];

      const from =
        path.resolve(path.join(wikiCachePath, 'search'));

      return (
        readdir(from).then(
          () => [{from, to: ['searchData.root']}],
          () => []));
    },
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
