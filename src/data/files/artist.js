import {readFile} from 'node:fs/promises';
import * as path from 'node:path';

import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';

export default ({
  documentModes: {allTogether},
  thingConstructors: {Artist},
}) => ({
  title: `Process artists file`,

  files: dataPath =>
    Promise.allSettled([
      readFile(path.join(dataPath, 'artists.yaml'))
        .then(() => ['artists.yaml']),

      traverse(path.join(dataPath, 'artists'), {
        filterFile: name => path.extname(name) === '.yaml',
        prefixPath: 'artists',
      }),
    ]).then(results => results
        .filter(({status}) => status === 'fulfilled')
        .flatMap(({value}) => value)),

  documentMode: allTogether,
  documentThing: Artist,

  sort({artistData}) {
    sortAlphabetically(artistData);
  },
});
