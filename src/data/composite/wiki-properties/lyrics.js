// Lyrics! This comes in two styles - "old", where there's just one set of
// lyrics, or the newer/standard one, with multiple sets that are each
// annotated, credited, etc.

import {input, templateCompositeFrom} from '#composite';
import {isLyrics} from '#validators';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withParsedLyricsEntries} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `lyrics`,

  compose: false,

  update: {
    validate: isLyrics,
  },

  steps: () => [
    exitWithoutDependency({
      dependency: input.updateValue(),
      mode: input.value('falsy'),
      value: input.value([]),
    }),

    withParsedLyricsEntries({
      from: input.updateValue(),
    }),

    exposeDependency({
      dependency: '#parsedLyricsEntries',
    }),
  ],
});
