export const description = `Update data files in-place to satisfy formatting rules for curated URLs`;

import {logInfo} from '#cli';
import {reformatCuratedURLs} from '#reformat-urls';

export async function go({
  dataPath,
  tidyingOnly,
}) {
  const changedFiles =
    await reformatCuratedURLs({
      dataPath,
      showChangedFiles: true,
      showSatisfiedRules: tidyingOnly,
    });

  if (changedFiles.size === 0) {
    if (tidyingOnly) {
      logInfo`All URL formatting rules were already satisfied. Good to go!`;
      return 'clean';
    } else {
      logInfo`All curated URL formatting rules are satisfied - nice!`;
      return 'clean';
    }
  } else {
    const filesPart =
      (changedFiles.size === 1
        ? `1 file`
        : `${changedFiles.size} files`);

    logInfo`Updated ${filesPart} to satisfy URL formatting rules.`;
    return 'updated';
  }
}
