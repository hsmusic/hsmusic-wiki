import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'linkArtist (snapshot)', async (t, evaluate) => {
  await evaluate.load();

  evaluate.snapshot('basic behavior', {
    name: 'linkArtist',
    args: [
      {
        name: `Toby Fox`,
        directory: `toby-fox`,
      }
    ],
  });

  evaluate.snapshot('prefer short name', {
    name: 'linkArtist',
    args: [
      {
        name: 'ICCTTCMDMIROTMCWMWFTPFTDDOTARHPOESWGBTWEATFCWSEBTSSFOFG',
        nameShort: '55gore',
        directory: '55gore',
      },
    ],
    slots: {
      preferShortName: true,
    },
  });
});
