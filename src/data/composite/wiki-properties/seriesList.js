import {input, templateCompositeFrom} from '#composite';
import {isSeriesList} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {withResolvedSeriesList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `seriesList`,

  compose: false,

  steps: () => [
    withResolvedSeriesList({
      list: input.updateValue({
        validate: isSeriesList,
      }),
    }),

    exposeDependency({
      dependency: '#resolvedSeriesList',
    }),
  ],
});
