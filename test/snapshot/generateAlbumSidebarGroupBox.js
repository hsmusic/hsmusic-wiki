import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateAlbumSidebarGroupBox (snapshot)', async (t, evaluate) => {
  await evaluate.load({
    mock: {
      ...evaluate.mock.transformContent,
    },
  });

  let album, group;

  album = {
    name: 'Middle',
    directory: 'middle',
    date: new Date('2010-04-13'),
  };

  group = {
    name: 'VCG',
    directory: 'vcg',
    descriptionShort: 'Very cool group.',
    urls: ['https://vcg.bandcamp.com/', 'https://youtube.com/@vcg'],
    albums: [
      {name: 'First', directory: 'first', date: new Date('2010-04-10')},
      album,
      {name: 'Last', directory: 'last', date: new Date('2010-06-12')},
    ],
  };

  evaluate.snapshot('basic behavior, mode: album', {
    name: 'generateAlbumSidebarGroupBox',
    args: [album, group],
    slots: {mode: 'album'},
  });

  evaluate.snapshot('basic behavior, mode: track', {
    name: 'generateAlbumSidebarGroupBox',
    args: [album, group],
    slots: {mode: 'track'},
  });

  album = {
    date: null,
  };

  group.albums = [
    ...group.albums,
    album,
  ];

  evaluate.snapshot('dateless album in mixed group', {
    name: 'generateAlbumSidebarGroupBox',
    args: [album, group],
    slots: {mode: 'album'},
  });
});
