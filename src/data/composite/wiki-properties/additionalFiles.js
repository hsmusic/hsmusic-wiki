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

import {isAdditionalFileList} from '#validators';

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isAdditionalFileList},
    expose: {
      transform: (additionalFiles) =>
        additionalFiles ?? [],
    },
  };
}
