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

  const rulesEffected = new Set();

  for await (const result of SortingRule.go({wikiData, dataPath})) {
    const niceMessage = `"${result.rule.message}"`;

    if (result.changed) {
      rulesEffected.add(result.rule);
      logInfo`Updating to satisfy: ${niceMessage}:`;
      logInfo`  ${result.path}`;
    } else {
      logInfo`Already satisfied: ${niceMessage}`;
      logInfo`  ${result.path}`;
    }
  }

  if (rulesEffected.size > 1) {
    logInfo`Updated data files to satisfy ${rulesEffected.size} sorting rules.`;
    return 'updated';
  } else if (rulesEffected.size === 1) {
    logInfo`Updated data files to satisfy ${1} sorting rule.`
    return 'updated';
  } else {
    logInfo`All sorting rules were already satisfied. Good to go!`;
    return 'clean';
  }
}
