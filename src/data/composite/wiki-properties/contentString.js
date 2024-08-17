// String type that's slightly more specific than simpleString. If the
// property is a generic piece of human-reading content, this adds some
// useful valiation on top of simpleString - but still check if more
// particular properties like `name` are more appropriate.
//
// This type adapts validation for single- and multiline content.

import {input, templateCompositeFrom} from '#composite';
import {isContentString} from '#validators';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withParsedContentStringNodes} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `contentString`,

  compose: false,

  update: {
    validate: isContentString,
  },

  steps: () => [
    exitWithoutDependency({
      dependency: input.updateValue(),
      mode: input.value('falsy'),
    }),

    withParsedContentStringNodes({
      from: input.updateValue(),
    }),

    exposeDependency({
      dependency: '#parsedContentStringNodes',
    }),
  ],
});
