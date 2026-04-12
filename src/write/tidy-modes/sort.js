export const description = `Update data files in-place to satisfy custom sorting rules`;

import {logInfo} from '#cli';
import {empty} from '#sugar';
import thingConstructors from '#things';

export async function go({
  wikiData,
  dataPath,
  tidyingOnly,
}) {
  if (empty(wikiData.sortingRules)) {
    if (tidyingOnly) {
      logInfo`There aren't any sorting rules in for this wiki.`;
    }

    return 'clean';
  }

  const {SortingRule} = thingConstructors;

  if (!tidyingOnly) {
    const results =
      await Array.fromAsync(SortingRule.go({dataPath, wikiData}));

    if (results.some(result => result.changed)) {
      logInfo`Updated data files to satisfy sorting.`;
      return 'updated';
    } else {
      logInfo`All sorting rules are satisfied - nice!`;
      return 'clean';
    }
  }

  let numUpdated = 0;
  let numActive = 0;

  for await (const result of SortingRule.go({wikiData, dataPath})) {
    numActive++;

    const niceMessage = `"${result.rule.message}"`;

    if (result.changed) {
      numUpdated++;
      logInfo`Updated to satisfy ${niceMessage}.`;
    } else {
      logInfo`Already good: ${niceMessage}`;
    }
  }

  if (numUpdated > 1) {
    logInfo`Updated data files to satisfy ${numUpdated} sorting rules.`;
    return 'updated';
  } else if (numUpdated === 1) {
    logInfo`Updated data files to satisfy ${1} sorting rule.`
    return 'updated';
  } else {
    logInfo`All sorting rules were already satisfied. Good to go!`;
    return 'clean';
  }
}
