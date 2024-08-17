// This is a somewhat more involved data structure - it's for additional
// or "bonus" files associated with albums or tracks (or anything else).
// It's got this form:
//
//   [
//     {title: 'Booklet', files: ['Booklet.pdf']},
//     {
//       title: 'Wallpaper',
//       description: 'Cool Wallpaper!',
//       files: ['1440x900.png', '1920x1080.png']
//     },
//     {title: 'Alternate Covers', description: null, files: [...]},
//     ...
//   ]
//

import {input, templateCompositeFrom} from '#composite';
import {isAdditionalFileList} from '#validators';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withParsedAdditionalFiles} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `additionalFiles`,

  compose: false,

  steps: () => [
    exitWithoutDependency({
      dependency: input.updateValue({validate: isAdditionalFileList}),
      mode: input.value('empty'),
      value: input.value([]),
    }),

    withParsedAdditionalFiles({
      from: input.updateValue(),
    }),

    exposeDependency({
      dependency: '#parsedAdditionalFiles',
    }),
  ],
});
