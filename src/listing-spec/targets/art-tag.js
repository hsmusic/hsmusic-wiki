import {input} from '#composite';
import Thing from '#thing';

import {wikiData} from '#composite/wiki-properties';

export default {
  target: 'art-tag',

  [Thing.getPropertyDescriptors]: ({ArtTag}) => ({
    artTagData: wikiData({
      class: input.value(ArtTag),
    }),
  }),
};
