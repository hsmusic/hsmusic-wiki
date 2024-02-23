import {input} from '#composite';
import Thing from '#thing';

import {wikiData} from '#composite/wiki-properties';

export default {
  target: 'track',

  [Thing.getPropertyDescriptors]: ({Track}) => ({
    trackData: wikiData({
      class: input.value(Track),
    }),
  }),
};
