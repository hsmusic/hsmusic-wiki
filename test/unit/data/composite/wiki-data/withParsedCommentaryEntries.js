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
  t.plan(4);

  const artist1 = stubArtist(`Mobius Trip`);
  const artist2 = stubArtist(`Hadron Kaleido`);
  const artist3 = stubArtist('Homestuck');

  const artistData = [artist1, artist2, artist3];

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
      accessDate: null,
      accessKind: null,
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
      accessDate: null,
      accessKind: null,
    },
    {
      artists: [artist2],
      artistDisplayText: `<b>[[artist:hadron-kaleido|The Ol' Hadron]]</b>`,
      annotation: `moral support`,
      date: new Date('4 April 2022'),
      body: `Second commentary entry. Yes. So cool.`,
      accessDate: null,
      accessKind: null,
    },
    {
      artists: [],
      artistDisplayText: null,
      annotation: `pingas`,
      date: new Date('25 August 2023'),
      body: `Oh no.. Oh dear...`,
      accessDate: null,
      accessKind: null,
    },
    {
      artists: [artist1, artist2],
      artistDisplayText: null,
      annotation: null,
      date: null,
      body: `And back around we go.`,
      accessDate: null,
      accessKind: null,
    },
  ]);

  t.same(composite.expose.compute({
    artistData,
    from:
      `<i>Homestuck:</i> ([Bandcamp credits blurb](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/track/sburban-countdown-3) on "Homestuck Vol. 1-4 (with Midnight Crew: Drawing Dead)", 10/25/2019)\n` +
      `\n` +
      `Written by [[artist:michael-guy-bowman|Michael Guy Bowman]]<br>\n` +
      `Arrangement by [[artist:mark-j-hadley|Mark Hadley]]\n` +
      `\n` +
      `<i>Homestuck:</i> ([fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake), 7/20/2019 captured 4/13/2024)\n` +
      `This isn't real!\n` +
      `\n` +
      `<i>Homestuck:</i> ([fake](https://homestuck.com/fake), 10/25/2011 accessed 10/27/2011)\n` +
      `This isn't real either!\n` +
      `\n` +
      `<i>Homestuck:</i> ([fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake), 7/20/2019 accessed 4/13/2024)\n` +
      `Not this one, neither!\n`
  }), [
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[Bandcamp credits blurb](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/track/sburban-countdown-3) on "Homestuck Vol. 1-4 (with Midnight Crew: Drawing Dead)"`,
      date: new Date('10/25/2019'),
      body:
        `Written by [[artist:michael-guy-bowman|Michael Guy Bowman]]<br>\n` +
        `Arrangement by [[artist:mark-j-hadley|Mark Hadley]]`,
      accessDate: new Date('10/24/2020'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      date: new Date('7/20/2019'),
      body: `This isn't real!`,
      accessDate: new Date('4/13/2024'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://homestuck.com/fake)`,
      date: new Date('10/25/2011'),
      body: `This isn't real either!`,
      accessDate: new Date('10/27/2011'),
      accessKind: 'accessed',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      date: new Date('7/20/2019'),
      body: `Not this one, neither!`,
      accessDate: new Date('4/13/2024'),
      accessKind: 'accessed',
    },
  ]);
});
