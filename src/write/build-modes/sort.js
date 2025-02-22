export const description = `Update data files in-place to satisfy custom sorting rules`;

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
  for (const sortingRule of wikiData.sortingRules) {
    await sortingRule.apply({wikiData, dataPath});
  }
}
