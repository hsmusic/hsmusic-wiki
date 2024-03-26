import {input} from '#composite';
import Thing from '#thing';

import {wikiData} from '#composite/wiki-properties';

export default {
  target: 'group',

  [Thing.getPropertyDescriptors]: ({Group}) => ({
    groupData: wikiData({
      class: input.value(Group),
    }),
  }),
};
