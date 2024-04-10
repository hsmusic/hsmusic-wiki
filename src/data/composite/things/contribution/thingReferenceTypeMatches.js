import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `thingReferenceTypeMatches`,

  compose: false,

  inputs: {
    value: input({type: 'string'}),
  },

  steps: () => [
    exitWithoutDependency({
      dependency: 'thing',
      value: input.value(false),
    }),

    withPropertyFromObject({
      object: 'thing',
      property: input.value('constructor'),
    }),

    {
      dependencies: [
        '#thing.constructor',
        input('value'),
      ],

      compute: ({
        ['#thing.constructor']: constructor,
        [input('value')]: value,
      }) =>
        constructor[Symbol.for('Thing.referenceType')] === value,
    },
  ],
});
