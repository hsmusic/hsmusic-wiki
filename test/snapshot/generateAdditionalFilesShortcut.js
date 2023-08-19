import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateAdditionalFilesShortcut (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('no additional files', {
    name: 'generateAdditionalFilesShortcut',
    args: [[]],
  });

  evaluate.snapshot('basic behavior', {
    name: 'generateAdditionalFilesShortcut',
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
  });
});
