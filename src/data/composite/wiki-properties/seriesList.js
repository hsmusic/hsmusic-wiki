import {input, templateCompositeFrom} from '#composite';
import {isSeriesList, validateThing} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {withResolvedSeriesList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `seriesList`,

  compose: false,

  inputs: {
    group: input({
      validate: validateThing({referenceType: 'group'}),
    }),
  },

  steps: () => [
    withResolvedSeriesList({
      group: input('group'),

      list: input.updateValue({
        validate: isSeriesList,
      }),
    }),

    exposeDependency({
      dependency: '#resolvedSeriesList',
    }),
  ],
});
