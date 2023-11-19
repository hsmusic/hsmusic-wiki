import t from 'tap';

import {compositeFrom, input} from '#composite';
import thingConstructors from '#things';

import {exposeDependency} from '#composite/control-flow';
import {withParsedCommentaryEntries} from '#composite/wiki-data';

const {Artist} = thingConstructors;

const composite = compositeFrom({
  compose: false,

  steps: [
    withParsedCommentaryEntries({
      from: 'from',
    }),

    exposeDependency({dependency: '#parsedCommentaryEntries'}),
  ],
});

function stubArtist(artistName = `Test Artist`) {
  const artist = new Artist();
  artist.name = artistName;

  return artist;
}

t.test(`withParsedCommentaryEntries: basic behavior`, t => {
  t.plan(3);

  const artist1 = stubArtist(`Mobius Trip`);
  const artist2 = stubArtist(`Hadron Kaleido`);

  const artistData = [artist1, artist2];

  t.match(composite, {
    expose: {
      dependencies: ['from', 'artistData'],
    },
  });

  t.same(composite.expose.compute({
    artistData,
    from:
      `<i>Mobius Trip:</i>\n` +
      `Some commentary.\n` +
      `Very cool.\n`,
  }), [
    {
      artists: [artist1],
      artistDisplayText: null,
      annotation: null,
      date: null,
      body: `Some commentary.\nVery cool.`,
    },
  ]);

  t.same(composite.expose.compute({
    artistData,
    from:
      `<i>Mobius Trip|Moo-bius Trip:</i> (music, art, 12 January 2015)\n` +
      `First commentary entry.\n` +
      `Very cool.\n` +
      `<i>Hadron Kaleido|<b>[[artist:hadron-kaleido|The Ol' Hadron]]</b>:</i> (moral support, 4/4/2022)\n` +
      `Second commentary entry. Yes. So cool.\n` +
      `<i>Mystery Artist:</i> (pingas, August 25, 2023)\n` +
      `Oh no.. Oh dear...\n` +
      `<i>Mobius Trip, Hadron Kaleido:</i>\n` +
      `And back around we go.`,
  }), [
    {
      artists: [artist1],
      artistDisplayText: `Moo-bius Trip`,
      annotation: `music, art`,
      date: new Date('12 January 2015'),
      body: `First commentary entry.\nVery cool.`,
    },
    {
      artists: [artist2],
      artistDisplayText: `<b>[[artist:hadron-kaleido|The Ol' Hadron]]</b>`,
      annotation: `moral support`,
      date: new Date('4 April 2022'),
      body: `Second commentary entry. Yes. So cool.`,
    },
    {
      artists: [],
      artistDisplayText: null,
      annotation: `pingas`,
      date: new Date('25 August 2023'),
      body: `Oh no.. Oh dear...`,
    },
    {
      artists: [artist1, artist2],
      artistDisplayText: null,
      annotation: null,
      date: null,
      body: `And back around we go.`,
    },
  ]);
});
