import {readFile} from 'node:fs/promises';
import * as path from 'node:path';

import {traverse} from '#node-utils';
import {sortAlphabetically} from '#sort';

export default ({
  documentModes: {allTogether},
  thingConstructors: {
    ArtTag,
    CategoryArtTag,
    CollectionArtTag,
  },
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
  documentThing: document =>
    (document['Category']
      ? CategoryArtTag
   : document['Collection']
      ? CollectionArtTag
      : ArtTag),

  sort({artTagData}) {
    const categories =
      artTagData.filter(artTag => artTag.isCategoryArtTag);

    const collections =
      artTagData.filter(artTag => artTag.isCollectionArtTag);

    const rest =
      artTagData.filter(artTag =>
        !artTag.isCategoryArtTag &&
        !artTag.isCollectionArtTag);

    sortAlphabetically(collections);
    sortAlphabetically(rest);

    artTagData.splice(0, Infinity,
      ...categories,
      ...collections,
      ...rest);
  },
});
