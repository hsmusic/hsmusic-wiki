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
  t.plan(7);

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
      secondDate: null,
      dateKind: null,
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
      secondDate: null,
      dateKind: null,
      accessDate: null,
      accessKind: null,
    },
    {
      artists: [artist2],
      artistDisplayText: `<b>[[artist:hadron-kaleido|The Ol' Hadron]]</b>`,
      annotation: `moral support`,
      date: new Date('4 April 2022'),
      body: `Second commentary entry. Yes. So cool.`,
      secondDate: null,
      dateKind: null,
      accessDate: null,
      accessKind: null,
    },
    {
      artists: [],
      artistDisplayText: null,
      annotation: `pingas`,
      date: new Date('25 August 2023'),
      body: `Oh no.. Oh dear...`,
      secondDate: null,
      dateKind: null,
      accessDate: null,
      accessKind: null,
    },
    {
      artists: [artist1, artist2],
      artistDisplayText: null,
      annotation: null,
      date: null,
      body: `And back around we go.`,
      secondDate: null,
      dateKind: null,
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
      secondDate: null,
      dateKind: null,
      accessDate: new Date('10/24/2020'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      date: new Date('7/20/2019'),
      body: `This isn't real!`,
      secondDate: null,
      dateKind: null,
      accessDate: new Date('4/13/2024'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://homestuck.com/fake)`,
      date: new Date('10/25/2011'),
      body: `This isn't real either!`,
      secondDate: null,
      dateKind: null,
      accessDate: new Date('10/27/2011'),
      accessKind: 'accessed',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      date: new Date('7/20/2019'),
      body: `Not this one, neither!`,
      secondDate: null,
      dateKind: null,
      accessDate: new Date('4/13/2024'),
      accessKind: 'accessed',
    },
  ]);

  t.same(composite.expose.compute({
    artistData,
    from:
      `<i>Homestuck:</i> ([MSPA sound credits](https://web.archive.org/web/20120805031705/http://www.mspaintadventures.com:80/soundcredits.html), sometime 6/21/2012 - 8/5/2012)\n` +
      `\n` +
      `[[flash:246|Page 2146]] - <b>"Sburban Countdown"</b><br>\n` +
      `Available on Bandcamp in [[album:homestuck-vol-1-4|Homestuck Vol. 1-4]]<br>\n` +
      `Written by [[artist:michael-guy-bowman|Michael Guy Bowman]]<br>\n` +
      `Arrangement by [[artist:mark-j-hadley|Mark Hadley]]\n` +
      `\n` +
      `<i>Homestuck:</i> ([fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake), 7/20/2019 - 7/20/2022 captured 4/13/2024)\n` +
      `It's goin' once.\n` +
      `\n` +
      `<i>Homestuck:</i> (10/25/2011 - 10/28/2011 accessed 10/27/2011)\n` +
      `It's goin' twice.\n` +
      `\n` +
      `<i>Homestuck:</i> ([fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake), 7/20/2019 - 7/20/2022 accessed 4/13/2024)\n` +
      `It's goin' thrice!\n`
  }), [
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[MSPA sound credits](https://web.archive.org/web/20120805031705/http://www.mspaintadventures.com:80/soundcredits.html)`,
      body:
        `[[flash:246|Page 2146]] - <b>"Sburban Countdown"</b><br>\n` +
        `Available on Bandcamp in [[album:homestuck-vol-1-4|Homestuck Vol. 1-4]]<br>\n` +
        `Written by [[artist:michael-guy-bowman|Michael Guy Bowman]]<br>\n` +
        `Arrangement by [[artist:mark-j-hadley|Mark Hadley]]`,
      date: new Date('6/21/2012'),
      secondDate: new Date('8/5/2012'),
      dateKind: 'sometime',
      accessDate: new Date('8/5/2012'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      body: `It's goin' once.`,
      date: new Date('7/20/2019'),
      secondDate: new Date('7/20/2022'),
      dateKind: null,
      accessDate: new Date('4/13/2024'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: null,
      body: `It's goin' twice.`,
      date: new Date('10/25/2011'),
      secondDate: new Date('10/28/2011'),
      dateKind: null,
      accessDate: new Date('10/27/2011'),
      accessKind: 'accessed',

    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      body: `It's goin' thrice!`,
      date: new Date('7/20/2019'),
      secondDate: new Date('7/20/2022'),
      dateKind: null,
      accessDate: new Date('4/13/2024'),
      accessKind: 'accessed',
    },
  ]);

  t.same(composite.expose.compute({
    artistData,
    from:
      `<i>Homestuck:</i> ([MSPA sound credits](https://web.archive.org/web/20120805031705/http://www.mspaintadventures.com:80/soundcredits.html), sometime 6/21/2012 - 8/5/2012)\n` +
      `\n` +
      `[[flash:246|Page 2146]] - <b>"Sburban Countdown"</b><br>\n` +
      `Available on Bandcamp in [[album:homestuck-vol-1-4|Homestuck Vol. 1-4]]<br>\n` +
      `Written by [[artist:michael-guy-bowman|Michael Guy Bowman]]<br>\n` +
      `Arrangement by [[artist:mark-j-hadley|Mark Hadley]]\n` +
      `\n` +
      `<i>Homestuck:</i> ([fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake), 7/20/2019 - 7/20/2022 captured 4/13/2024)\n` +
      `It's goin' once.\n` +
      `\n` +
      `<i>Homestuck:</i> (10/25/2011 - 10/28/2011 accessed 10/27/2011)\n` +
      `It's goin' twice.\n` +
      `\n` +
      `<i>Homestuck:</i> ([fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake), 7/20/2019 - 7/20/2022 accessed 4/13/2024)\n` +
      `It's goin' thrice!\n`
  }), [
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[MSPA sound credits](https://web.archive.org/web/20120805031705/http://www.mspaintadventures.com:80/soundcredits.html)`,
      body:
        `[[flash:246|Page 2146]] - <b>"Sburban Countdown"</b><br>\n` +
        `Available on Bandcamp in [[album:homestuck-vol-1-4|Homestuck Vol. 1-4]]<br>\n` +
        `Written by [[artist:michael-guy-bowman|Michael Guy Bowman]]<br>\n` +
        `Arrangement by [[artist:mark-j-hadley|Mark Hadley]]`,
      date: new Date('6/21/2012'),
      secondDate: new Date('8/5/2012'),
      dateKind: 'sometime',
      accessDate: new Date('8/5/2012'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      body: `It's goin' once.`,
      date: new Date('7/20/2019'),
      secondDate: new Date('7/20/2022'),
      dateKind: null,
      accessDate: new Date('4/13/2024'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: null,
      body: `It's goin' twice.`,
      date: new Date('10/25/2011'),
      secondDate: new Date('10/28/2011'),
      dateKind: null,
      accessDate: new Date('10/27/2011'),
      accessKind: 'accessed',

    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      body: `It's goin' thrice!`,
      date: new Date('7/20/2019'),
      secondDate: new Date('7/20/2022'),
      dateKind: null,
      accessDate: new Date('4/13/2024'),
      accessKind: 'accessed',
    },
  ]);

  t.same(composite.expose.compute({
    artistData,
    from:
      `<i>Homestuck:</i> ([Homestuck sound credits](https://web.archive.org/web/20180717171235/https://www.homestuck.com/credits/sound), excerpt, around 4/3/2018)\n` +
      `blablabla\n` +
      `<i>Homestuck:</i> ([fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake), around 7/20/2019 - 7/20/2022 captured 4/13/2024)\n` +
      `Snoopin', snoopin', snoo,\n` +
      `<i>Homestuck:</i> ([fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake), throughout 7/20/2019 - 7/20/2022 accessed 4/13/2024)\n` +
      `~ pingas ~\n`
  }), [
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[Homestuck sound credits](https://web.archive.org/web/20180717171235/https://www.homestuck.com/credits/sound), excerpt`,
      body: `blablabla`,
      date: new Date('4/3/2018'),
      secondDate: null,
      dateKind: 'around',
      accessDate: new Date('7/17/2018'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      body: `Snoopin', snoopin', snoo,`,
      date: new Date('7/20/2019'),
      secondDate: new Date('7/20/2022'),
      dateKind: 'around',
      accessDate: new Date('4/13/2024'),
      accessKind: 'captured',
    },
    {
      artists: [artist3],
      artistDisplayText: null,
      annotation: `[fake](https://web.archive.org/web/20201024170202/https://homestuck.bandcamp.com/fake)`,
      body: `~ pingas ~`,
      date: new Date('7/20/2019'),
      secondDate: new Date('7/20/2022'),
      dateKind: 'throughout',
      accessDate: new Date('4/13/2024'),
      accessKind: 'accessed',
    },
  ]);
});
