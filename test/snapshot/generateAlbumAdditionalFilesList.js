import t from 'tap';

import {testContentFunctions} from '#test-lib';
import thingConstructors from '#things';

const {Album} = thingConstructors;

testContentFunctions(t, 'generateAlbumAdditionalFilesList (snapshot)', async (t, evaluate) => {
  const sizeMap = {
    'sburbwp_1280x1024.jpg': 2500,
    'sburbwp_1440x900.jpg': null,
    'sburbwp_1920x1080.jpg': null,
    'Internet Explorer.gif': 1,
    'Homestuck_Vol4_alt1.jpg': 1234567,
    'Homestuck_Vol4_alt2.jpg': 1234567,
    'Homestuck_Vol4_alt3.jpg': 1234567,
  };

  const extraDependencies = {
    getSizeOfAdditionalFile: file =>
      Object.entries(sizeMap)
        .find(key => file.includes(key))
        ?.at(1) ?? null,
  };

  await evaluate.load();

  const album = new Album();
  album.directory = 'exciting-album';

  evaluate.snapshot('no additional files', {
    extraDependencies,
    name: 'generateAlbumAdditionalFilesList',
    args: [album, []],
  });

  try {
    evaluate.snapshot('basic behavior', {
      extraDependencies,
      name: 'generateAlbumAdditionalFilesList',
      args: [
        album,
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
            description: 'No sizes for these files',
            files: [
              'oops.mp3',
              'Internet Explorer.gif',
              'daisy.mp3',
            ],
          },
          {
            title: `Empty Section`,
            description: `These files haven't been made available.`,
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
  } catch (error) {
    console.log(error);
  }
});
