import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateAdditionalFilesList (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('no additional files', {
    name: 'generateAdditionalFilesList',
    args: [[]],
  });

  evaluate.snapshot('basic behavior', {
    name: 'generateAdditionalFilesList',
    args: [
      [
        {
          title: 'SBURB Wallpaper',
          files: [
            'sburbwp_1280x1024.jpg',
            'sburbwp_1440x900.jpg',
            'sburbwp_1920x1080.jpg',
          ],
        },
        {
          title: 'Fake Section',
          description: 'Ooo, what happens if there are NO file links provided?',
          files: [
            'oops.mp3',
            'Internet Explorer.gif',
            'daisy.mp3',
          ],
        },
        {
          title: 'Alternate Covers',
          description: 'This is just an example description.',
          files: [
            'Homestuck_Vol4_alt1.jpg',
            'Homestuck_Vol4_alt2.jpg',
            'Homestuck_Vol4_alt3.jpg',
          ],
        },
      ],
    ],
    postprocess: template => template
      .slot('fileLinks', {
        'sburbwp_1280x1024.jpg': 'link to 1280x1024',
        'sburbwp_1440x900.jpg': 'link to 1440x900',
        'sburbwp_1920x1080.jpg': null,
        'Homestuck_Vol4_alt1.jpg': 'link to alt1',
        'Homestuck_Vol4_alt2.jpg': null,
        'Homestuck_Vol4_alt3.jpg': 'link to alt3',
      })
      .slot('fileSizes', {
        'sburbwp_1280x1024.jpg': 2500,
        'sburbwp_1440x900.jpg': null,
        'sburbwp_1920x1080.jpg': null,
        'Internet Explorer.gif': 1,
        'Homestuck_Vol4_alt1.jpg': 1234567,
        'Homestuck_Vol4_alt2.jpg': 1234567,
        'Homestuck_Vol4_alt3.jpg': 1234567,
      }),
  });
});
