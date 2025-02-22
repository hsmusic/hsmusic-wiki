export const description = `Update data files in-place to satisfy custom sorting rules`;

import {logInfo} from '#cli';
import {empty} from '#sugar';

export const config = {
  fileSizes: {
    applicable: false,
  },

  languageReloading: {
    applicable: false,
  },

  mediaValidation: {
    applicable: false,
  },

  search: {
    applicable: false,
  },

  thumbs: {
    applicable: false,
  },

  webRoutes: {
    applicable: false,
  },
};

export function getCLIOptions() {
  return {};
}

export async function go({wikiData, dataPath}) {
  if (empty(wikiData.sortingRules)) {
    logInfo`There aren't any sorting rules in for this wiki.`;
    return true;
  }

  let numUpdated = 0;
  let numActive = 0;

  for (const sortingRule of wikiData.sortingRules) {
    if (!sortingRule.active) continue;

    numActive++;

    const niceMessage = `"${sortingRule.message}"`;

    if (sortingRule.check({wikiData})) {
      logInfo`Already good: ${niceMessage}`;
    } else {
      logInfo`Updating to satisfy ${niceMessage}.`;
      await sortingRule.apply({wikiData, dataPath});

      numUpdated++;
    }
  }

  if (numUpdated > 1) {
    logInfo`Updated data files to satisfy ${numUpdated} sorting rules.`;
  } else if (numUpdated === 1) {
    logInfo`Updated data files to satisfy ${1} sorting rule.`
  } else if (numActive >= 1) {
    logInfo`All sorting rules were already satisfied. Good to go!`;
  } else {
    logInfo`No sorting rules are currently active.`;
  }

  return true;
}
