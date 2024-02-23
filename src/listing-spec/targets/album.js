import {input} from '#composite';
import Thing from '#thing';

import {wikiData} from '#composite/wiki-properties';

export default {
  target: 'album',

  [Thing.getPropertyDescriptors]: ({Album}) => ({
    albumData: wikiData({
      class: input.value(Album),
    }),
  }),
};
