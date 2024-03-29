import t from 'tap';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'linkExternal (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('unknown domain (arbitrary world wide web path)', {
    name: 'linkExternal',
    args: ['https://snoo.ping.as/usual/i/see/'],
  });

  const urlsToArgs = urls =>
    urls.map(url => ({args: [url]}));

  const quickSnapshot = (message, urls, slots) =>
    evaluate.snapshot(message, {
      name: 'linkExternal',
      slots,
      multiple: urlsToArgs(urls),
    });

  const quickSnapshotAllStyles = (context, urls) => {
    for (const style of ['platform', 'handle']) {
      const message = `context: ${context}, style: ${style}`;
      quickSnapshot(message, urls, {context, style});
    }
  };

  quickSnapshotAllStyles('generic', [
    'https://homestuck.bandcamp.com/',
    'https://soundcloud.com/plazmataz',
    'https://aeritus.tumblr.com/',
    'https://twitter.com/awkwarddoesart',
    'https://www.deviantart.com/chesswanderlust-sama',
    'https://en.wikipedia.org/wiki/Haydn_Quartet_(vocal_ensemble)',
    'https://www.poetryfoundation.org/poets/christina-rossetti',
    'https://www.instagram.com/levc_egm/',
    'https://www.patreon.com/CecilyRenns',
    'https://open.spotify.com/artist/63SNNpNOicDzG3LY82G4q3',
    'https://buzinkai.newgrounds.com/',

    // Just one custom domain of each platform is OK here
    'https://music.solatrus.com/',
    'https://types.pl/',

    'https://community.fandom.com/',
    'https://community.fandom.com/wiki/',
    'https://community.fandom.com/wiki/Community_Central',
    'https://mspaintadventures.fandom.com/',
    'https://mspaintadventures.fandom.com/wiki/',
    'https://mspaintadventures.fandom.com/wiki/Draconian_Dignitary',
  ]);

  quickSnapshotAllStyles('album', [
    'https://youtu.be/abc',
    'https://youtube.com/watch?v=abc',
    'https://youtube.com/Playlist?list=kweh',
  ]);

  quickSnapshotAllStyles('albumNoTracks', [
    'https://youtu.be/abc',
    'https://youtube.com/watch?v=abc',
    'https://youtube.com/Playlist?list=kweh',
  ]);

  quickSnapshotAllStyles('albumOneTrack', [
    'https://youtu.be/abc',
    'https://youtube.com/watch?v=abc',
    'https://youtube.com/Playlist?list=kweh',
  ]);

  quickSnapshotAllStyles('albumMultipleTracks', [
    'https://youtu.be/abc',
    'https://youtube.com/watch?v=abc',
    'https://youtube.com/Playlist?list=kweh',
  ]);

  quickSnapshotAllStyles('flash', [
    'https://www.bgreco.net/hsflash/002238.html',
    'https://homestuck.com/story/1234',
    'https://homestuck.com/story/pony',
    'https://www.youtube.com/watch?v=wKgOp3Kg2wI',
    'https://youtu.be/IOcvkkklWmY',
    'https://some.external.site/foo/bar/',
  ]);
});
