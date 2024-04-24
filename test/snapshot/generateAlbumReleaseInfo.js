import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateAlbumReleaseInfo (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('basic behavior', {
    name: 'generateAlbumReleaseInfo',
    args: [{
      artistContribs: [
        {artist: {name: 'Toby Fox', directory: 'toby-fox', urls: null}, annotation: 'music probably'},
        {artist: {name: 'Tensei', directory: 'tensei', urls: ['https://tenseimusic.bandcamp.com/']}, annotation: 'hot jams'},
      ],

      coverArtistContribs: [
        {artist: {name: 'Hanni Brosh', directory: 'hb', urls: null}, annotation: null},
      ],

      wallpaperArtistContribs: [
        {artist: {name: 'Hanni Brosh', directory: 'hb', urls: null}, annotation: null},
        {artist: {name: 'Niklink', directory: 'niklink', urls: null}, annotation: 'edits'},
      ],

      bannerArtistContribs: [
        {artist: {name: 'Hanni Brosh', directory: 'hb', urls: null}, annotation: null},
        {artist: {name: 'Niklink', directory: 'niklink', urls: null}, annotation: 'edits'},
      ],

      name: 'AlterniaBound',
      date: new Date('March 14, 2011'),
      coverArtDate: new Date('April 1, 1991'),
      urls: [
        'https://homestuck.bandcamp.com/album/alterniabound-with-alternia',
        'https://www.youtube.com/playlist?list=PLnVpmehyaOFZWO9QOZmD6A3TIK0wZ6xE2',
        'https://www.youtube.com/watch?v=HO5V2uogkYc',
      ],

      tracks: [{duration: 253}, {duration: 372}],
    }],
  });

  const sparse = {
    artistContribs: [],
    coverArtistContribs: [],
    wallpaperArtistContribs: [],
    bannerArtistContribs: [],

    name: 'Suspicious Album',
    urls: [],
    tracks: [],
  };

  evaluate.snapshot('reduced details', {
    name: 'generateAlbumReleaseInfo',
    args: [sparse],
  });

  evaluate.snapshot('URLs only', {
    name: 'generateAlbumReleaseInfo',
    args: [{
      ...sparse,
      urls: ['https://homestuck.bandcamp.com/foo', 'https://soundcloud.com/bar'],
    }],
  });

  evaluate.snapshot('equal cover art date', {
    name: 'generateAlbumReleaseInfo',
    args: [{
      ...sparse,
      date: new Date('2020-04-13'),
      coverArtDate: new Date('2020-04-13'),
    }],
  });
});
