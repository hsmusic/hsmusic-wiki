import * as path from 'node:path';

import {traverse} from '#node-utils';
import {sortChronologically} from '#sort';

export default ({
  documentModes: {headerAndEntries},
  thingConstructors: {WikiUpdate, WikiUpdateSection},
}) => ({
  title: `Process wiki update files`,

  files: dataPath =>
    traverse(path.join(dataPath, 'wiki-update'), {
      filterFile: name => path.extname(name) === '.yaml',
      prefixPath: 'wiki-update',
    }),

  documentMode: headerAndEntries,
  headerDocumentThing: WikiUpdate,
  entryDocumentThing: WikiUpdateSection,

  connect({header: update, entries: sections}) {
    for (const section of sections) {
      section.update = update;
    }

    update.sections = sections;
  },

  sort({wikiUpdateData}) {
    sortChronologically(wikiUpdateData, {latestFirst: true});
  },
});
