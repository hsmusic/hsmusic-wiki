// General purpose wiki data constructor, for properties like artistData,
// trackData, etc.

import {input, templateCompositeFrom} from '#composite';
import {validateWikiData} from '#validators';

import {inputThingClass} from '#composite/wiki-data';

// TODO: Kludge.
import Thing from '../../things/thing.js';

export default templateCompositeFrom({
  annotation: `wikiData`,

  compose: false,

  inputs: {
    class: inputThingClass(),
  },

  update: ({
    [input.staticValue('class')]: thingClass,
  }) => {
    const referenceType = thingClass[Thing.referenceType];
    return {validate: validateWikiData({referenceType})};
  },

  steps: () => [],
});
