import t from 'tap';
import {testContentFunctions} from '../lib/content-function.js';

testContentFunctions(t, 'generateContributionLinks (snapshot)', async (t, evaluate) => {
  const artist1 = {
    name: 'Clark Powell',
    directory: 'clark-powell',
    urls: ['https://soundcloud.com/plazmataz'],
  };

  const artist2 = {
    name: 'Grounder & Scratch',
    directory: 'the-big-baddies',
    urls: [],
  };

  const artist3 = {
    name: 'Toby Fox',
    directory: 'toby-fox',
    urls: ['https://tobyfox.bandcamp.com/', 'https://toby.fox/'],
  };

  const contributions = [
    {who: artist1, what: null},
    {who: artist2, what: 'Snooping'},
    {who: artist3, what: 'Arrangement'},
  ];

  await evaluate.load();

  evaluate.snapshot({
    name: 'generateContributionLinks',
    args: [contributions, {showContribution: true, showIcons: true}],
  });

  evaluate.snapshot({
    name: 'generateContributionLinks',
    args: [contributions, {showContribution: true, showIcons: false}],
  });

  evaluate.snapshot({
    name: 'generateContributionLinks',
    args: [contributions, {showContribution: false, showIcons: true}],
  });

  evaluate.snapshot({
    name: 'generateContributionLinks',
    args: [contributions, {showContribution: false, showIcons: false}],
  });
});
