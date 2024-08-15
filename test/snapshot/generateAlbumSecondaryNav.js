import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateAlbumSecondaryNav (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  let album, anotherAlbum, group1, group2;

  group1 = {
    name: 'VCG',
    directory: 'vcg',
    color: '#abcdef',
    serieses: [],
  };

  group2 = {
    name: 'Bepis',
    directory: 'bepis',
    color: '#123456',
    serieses: [],
  };

  album = {
    name: 'Album',
    directory: 'album',
    date: new Date('2010-04-13'),
    groups: [group1, group2],
  };

  anotherAlbum = {
    name: 'Last',
    directory: 'last',
    date: new Date('2010-06-12'),
  };

  group1.albums = [
    {
      name: 'First',
      directory: 'first',
      date: new Date('2010-04-10'),
    },
    album,
    anotherAlbum,
  ];

  group1.serieses = [
    {
      name: 'Series',
      albums: [album, anotherAlbum],
      group: group1,
    },
  ];

  group2.albums = [
    album,
    {
      name: 'Second',
      directory: 'second',
      date: new Date('2011-04-13'),
    },
  ];

  evaluate.snapshot('basic behavior, mode: album', {
    name: 'generateAlbumSecondaryNav',
    args: [album],
    slots: {mode: 'album'},
  });

  evaluate.snapshot('basic behavior, mode: track', {
    name: 'generateAlbumSecondaryNav',
    args: [album],
    slots: {mode: 'track'},
  });

  album = {
    date: null,
    groups: [group1, group2],
  };

  group1.albums = [
    ...group1.albums,
    album,
  ];

  evaluate.snapshot('dateless album in mixed group', {
    name: 'generateAlbumSecondaryNav',
    args: [album],
    slots: {mode: 'album'},
  });
});
