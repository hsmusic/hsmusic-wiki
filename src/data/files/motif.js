import {readFile} from 'node:fs/promises';
import * as path from 'node:path';

import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';

export default ({
  documentModes: {allInOne},
  thingConstructors: {Motif},
}) => ({
  title: `Process art tags file`,

  file: 'motifs.yaml',

  documentMode: allInOne,
  documentThing: Motif,

  sort({artTagData}) {
    sortAlphabetically(artTagData);
  },
});
