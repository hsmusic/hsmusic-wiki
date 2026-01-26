import {readFile} from 'node:fs/promises';
import * as path from 'node:path';

import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';

export default ({
  documentModes: {allTogether},
  thingConstructors: {ArtTag},
}) => ({
  title: `Process art tags file`,

  files: dataPath =>
    Promise.allSettled([
      readFile(path.join(dataPath, 'tags.yaml'))
        .then(() => ['tags.yaml']),

      traverse(path.join(dataPath, 'art-tags'), {
        filterFile: name => path.extname(name) === '.yaml',
        prefixPath: 'art-tags',
      }),
    ]).then(results => results
        .filter(({status}) => status === 'fulfilled')
        .flatMap(({value}) => value)),

  documentMode: allTogether,
  documentThing: ArtTag,

  sort({artTagData}) {
    sortAlphabetically(artTagData);
  },
});
