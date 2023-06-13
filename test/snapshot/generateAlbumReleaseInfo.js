import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateAlbumReleaseInfo (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('basic behavior', {
    name: 'generateAlbumReleaseInfo',
    args: [{
      artistContribs: [
        {who: {name: 'Toby Fox', directory: 'toby-fox'}, what: 'music probably'},
        {who: {name: 'Tensei', directory: 'tensei', urls: ['https://tenseimusic.bandcamp.com/']}, what: 'hot jams'},
      ],

      coverArtistContribs: [
        {who: {name: 'Hanni Brosh', directory: 'hb'}, what: null},
      ],

      wallpaperArtistContribs: [
        {who: {name: 'Hanni Brosh', directory: 'hb'}, what: null},
        {who: {name: 'Niklink', directory: 'niklink'}, what: 'edits'},
      ],

      bannerArtistContribs: [
        {who: {name: 'Hanni Brosh', directory: 'hb'}, what: null},
        {who: {name: 'Niklink', directory: 'niklink'}, what: 'edits'},
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
