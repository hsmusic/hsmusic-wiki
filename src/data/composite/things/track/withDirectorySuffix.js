import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withContainingTrackSection from './withContainingTrackSection.js';
import withSuffixDirectoryFromAlbum from './withSuffixDirectoryFromAlbum.js';

export default templateCompositeFrom({
  annotation: `withDirectorySuffix`,

  outputs: ['#directorySuffix'],

  steps: () => [
    withSuffixDirectoryFromAlbum(),

    raiseOutputWithoutDependency({
      dependency: '#suffixDirectoryFromAlbum',
      mode: input.value('falsy'),
      output: input.value({'#directorySuffix': null}),
    }),

    withContainingTrackSection(),

    withPropertyFromObject({
      object: '#trackSection',
      property: input.value('directorySuffix'),
    }).outputs({
      '#trackSection.directorySuffix': '#directorySuffix',
    }),
  ],
});
