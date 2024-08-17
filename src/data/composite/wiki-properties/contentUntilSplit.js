// A content string, but only up til the first `<hr class="split">`.

import {input, templateCompositeFrom} from '#composite';
import {isContentString} from '#validators';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withParsedContentStringNodes} from '#composite/wiki-data';

export default templateCompositeFrom({
  inputs: {
    content: input({
      validate: isContentString,
      defaultDependency: 'content',
    }),
  },

  compose: false,

  steps: () => [
    exitWithoutDependency({
      dependency: input('content'),
    }),

    {
      dependencies: [input('content')],
      compute: (continuation, {
        [input('content')]: content,
      }) => continuation({
        ['#source']:
          content.split('<hr class="split">')[0],
      }),
    },

    withParsedContentStringNodes({
      from: '#source',
    }),

    exposeDependency({
      dependency: '#parsedContentStringNodes',
    }),
  ],
});
