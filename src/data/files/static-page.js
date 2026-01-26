import * as path from 'node:path';

import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';

export default ({
  documentModes: {onePerFile},
  thingConstructors: {StaticPage},
}) => ({
  title: `Process static page files`,

  files: dataPath =>
    traverse(path.join(dataPath, 'static-page'), {
      filterFile: name => path.extname(name) === '.yaml',
      prefixPath: 'static-page',
    }),

  documentMode: onePerFile,
  documentThing: StaticPage,

  sort({staticPageData}) {
    sortAlphabetically(staticPageData);
  },
});
