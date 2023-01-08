import * as pageSpecs from '../../page/index.js';

import {
  logInfo,
  progressCallAll,
} from '../../util/cli.js';

export function getCLIOptions() {
  // Stub.
  return {};
}

export async function go({
  _cliOptions,
  _dataPath,
  _mediaPath,
  _queueSize,

  _defaultLanguage,
  _languages,
  _srcRootPath,
  _urls,
  _urlSpec,
  wikiData,

  _cachebust,
  _developersComment,
  _getSizeOfAdditionalFile,
}) {
  let targetSpecPairs = getPageSpecsWithTargets({wikiData});
  const writes = progressCallAll(`Computing page data & paths for ${targetSpecPairs.length} targets.`,
    targetSpecPairs.map(({
      pageSpec,
      target,
      targetless,
    }) => () =>
      targetless
        ? pageSpec.writeTargetless({wikiData})
        : pageSpec.write(target, {wikiData}))).flat();

  logInfo`Will be serving a total of ${writes.length} pages.`;

  return true;
}

function getPageSpecsWithTargets({
  wikiData,
}) {
  return Object.values(pageSpecs)
    .filter(pageSpec => pageSpec.condition?.({wikiData}) ?? true)
    .flatMap(pageSpec => [
      ...pageSpec.targets
        ? pageSpec.targets({wikiData})
            .map(target => ({pageSpec, target}))
        : [],
      Object.hasOwn(pageSpec, 'writeTargetless') &&
        {pageSpec, targetless: true},
    ])
    .filter(Boolean);
}
