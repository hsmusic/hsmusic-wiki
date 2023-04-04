import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateAlbumTrackListItem (snapshot)', async (t, evaluate) => {
  const artist1 = {directory: 'toby-fox', name: 'Toby Fox', urls: ['https://toby.fox/']};
  const artist2 = {directory: 'james-roach', name: 'James Roach'};
  const artist3 = {directory: 'clark-powell', name: 'Clark Powell'};
  const artist4 = {directory: ''}
  const albumContribs = [{who: artist1}, {who: artist2}];

  await evaluate.load();

  evaluate.snapshot('basic behavior', {
    name: 'generateAlbumTrackListItem',
    args: [
      {
        // Just pretend Hiveswap Act 1 OST doesn't have its own Artists field OK?
        // We test that kind of case later!
        name: 'Final Spice',
        directory: 'final-spice',
        duration: 54,
        color: '#33cc77',
        artistContribs: [
          {who: artist1, what: 'composition & arrangement'},
          {who: artist2, what: 'arrangement'},
        ],
      },
      {artistContribs: []},
    ],
  });

  evaluate.snapshot('zero duration, zero artists', {
    name: 'generateAlbumTrackListItem',
    args: [
      {
        name: 'You have got to be about the most superficial commentator on con-langues since the idiotic B. Gilson.',
        directory: 'you-have-got-to-be-about-the-most-superficial-commentator-on-con-langues-since-the-idiotic-b-gilson',
        duration: 0,
        artistContribs: [],
      },
      {artistContribs: []},
    ],
  });

  evaluate.snapshot('hide artists if inherited from album', {
    name: 'generateAlbumTrackListItem',
    multiple: [
      {args: [
        {directory: 'track1', name: 'Same artists, same order', artistContribs: [{who: artist1}, {who: artist2}]},
        {artistContribs: albumContribs},
      ]},
      {args: [
        {directory: 'track2', name: 'Same artists, different order', artistContribs: [{who: artist2}, {who: artist1}]},
        {artistContribs: albumContribs},
      ]},
      {args: [
        {directory: 'track3', name: 'Extra artist', artistContribs: [{who: artist1}, {who: artist2}, {who: artist3}]},
        {artistContribs: albumContribs},
      ]},
      {args: [
        {directory: 'track4', name: 'Missing artist', artistContribs: [{who: artist1}]},
        {artistContribs: albumContribs},
      ]},
    ],
  });
});
