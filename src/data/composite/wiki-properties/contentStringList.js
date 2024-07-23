// The same thing as contentString, but it's a list of 'em instead of just one.

import {input, templateCompositeFrom} from '#composite';
import {isContentString, validateArrayItems} from '#validators';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withParsedContentStringNodesFromList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `contentStringList`,

  compose: false,

  update: {
    validate: validateArrayItems(isContentString),
  },

  steps: () => [
    exitWithoutDependency({
      dependency: input.updateValue(),
      mode: input.value('empty'),
      value: input.value([]),
    }),

    withParsedContentStringNodesFromList({
      list: input.updateValue(),
    }),

    exposeDependency({
      dependency: '#parsedContentStringNodes',
    }),
  ],
});
