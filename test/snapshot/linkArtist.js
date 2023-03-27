import t from 'tap';

import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'linkArtist', (t, evaluate) => {
  evaluate.snapshot({
    name: 'linkArtist',
    args: [
      {
        name: `Toby Fox`,
        directory: `toby-fox`,
      }
    ],
  });

  evaluate.snapshot({
    name: 'linkArtist',
    args: [
      {
        name: 'ICCTTCMDMIROTMCWMWFTPFTDDOTARHPOESWGBTWEATFCWSEBTSSFOFG',
        nameShort: '55gore',
        directory: '55gore',
      },
    ],
  }, v => v.slot('preferShortName', true));
});
