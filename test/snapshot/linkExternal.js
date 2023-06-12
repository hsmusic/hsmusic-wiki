import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'linkExternal (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('missing domain (arbitrary local path)', {
    name: 'linkExternal',
    args: ['/foo/bar/baz.mp3']
  });

  evaluate.snapshot('unknown domain (arbitrary world wide web path)', {
    name: 'linkExternal',
    args: ['https://snoo.ping.as/usual/i/see/'],
  });

  evaluate.snapshot('basic domain matches', {
    name: 'linkExternal',
    multiple: [
      {args: ['https://homestuck.bandcamp.com/']},
      {args: ['https://soundcloud.com/plazmataz']},
      {args: ['https://aeritus.tumblr.com/']},
      {args: ['https://twitter.com/awkwarddoesart']},
      {args: ['https://www.deviantart.com/chesswanderlust-sama']},
      {args: ['https://en.wikipedia.org/wiki/Haydn_Quartet_(vocal_ensemble)']},
      {args: ['https://www.poetryfoundation.org/poets/christina-rossetti']},
      {args: ['https://www.instagram.com/levc_egm/']},
      {args: ['https://www.patreon.com/CecilyRenns']},
      {args: ['https://open.spotify.com/artist/63SNNpNOicDzG3LY82G4q3']},
      {args: ['https://buzinkai.newgrounds.com/']},
    ],
  });

  evaluate.snapshot('custom matches - type: album', {
    name: 'linkExternal',
    multiple: [
      {args: ['https://youtu.be/abc', {type: 'album'}]},
      {args: ['https://youtube.com/watch?v=abc', {type: 'album'}]},
      {args: ['https://youtube.com/Playlist?list=kweh', {type: 'album'}]},
    ],
    postprocess:
      link => link.slot('mode', 'album'),
  });

  evaluate.snapshot('custom domains for common platforms', {
    name: 'linkExternal',
    multiple: [
      // Just one domain of each platform is OK here
      {args: ['https://music.solatrus.com/']},
      {args: ['https://types.pl/']},
    ],
  });
});
