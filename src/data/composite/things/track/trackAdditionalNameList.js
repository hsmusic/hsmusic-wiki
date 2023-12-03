// Compiles additional names from various sources.

import {input, templateCompositeFrom} from '#composite';
import {isAdditionalNameList} from '#validators';

import withInferredAdditionalNames from './withInferredAdditionalNames.js';
import withSharedAdditionalNames from './withSharedAdditionalNames.js';

export default templateCompositeFrom({
  annotation: `trackAdditionalNameList`,

  compose: false,

  update: {validate: isAdditionalNameList},

  steps: () => [
    withInferredAdditionalNames(),
    withSharedAdditionalNames(),

    {
      dependencies: [
        '#inferredAdditionalNames',
        '#sharedAdditionalNames',
        input.updateValue(),
      ],

      compute: ({
        ['#inferredAdditionalNames']: inferredAdditionalNames,
        ['#sharedAdditionalNames']: sharedAdditionalNames,
        [input.updateValue()]: providedAdditionalNames,
      }) => [
        ...providedAdditionalNames ?? [],
        ...sharedAdditionalNames,
        ...inferredAdditionalNames,
      ],
    },
  ],
});
