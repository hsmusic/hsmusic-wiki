import {input} from '#composite';
import Thing from '#thing';

import {wikiData} from '#composite/wiki-properties';

export default {
  target: 'artist',

  [Thing.getPropertyDescriptors]: ({Artist}) => ({
    artistData: wikiData({
      class: input.value(Artist),
    }),
  }),
};
