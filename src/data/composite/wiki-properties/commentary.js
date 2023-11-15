// Artist commentary! Generally present on tracks and albums.

import {input, templateCompositeFrom} from '#composite';
import {isCommentary} from '#validators';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withParsedCommentaryEntries} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `commentary`,

  compose: false,

  steps: () => [
    exitWithoutDependency({
      dependency: input.updateValue({validate: isCommentary}),
      mode: input.value('falsy'),
      value: input.value(null),
    }),

    withParsedCommentaryEntries({
      from: input.updateValue(),
    }),

    exposeDependency({
      dependency: '#parsedCommentaryEntries',
    }),
  ],
});
