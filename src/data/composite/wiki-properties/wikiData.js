// General purpose wiki data constructor, for properties like artistData,
// trackData, etc.

import {input, templateCompositeFrom} from '#composite';
import {isThingClass, validateWikiData} from '#validators';

export default templateCompositeFrom({
  annotation: `wikiData`,

  compose: false,

  inputs: {
    class: input.staticValue({validate: isThingClass}),
  },

  update: ({
    [input.staticValue('class')]: thingClass,
  }) => ({
    validate:
      validateWikiData({
        referenceType:
          thingClass[Symbol.for('Thing.referenceType')],
      }),
  }),

  steps: () => [],
});
