import t from 'tap';

import contentFunction from '#content-function';
import {testContentFunctions} from '#test-lib';

testContentFunctions(t, 'generateTrackAdditionalNamesBox (snapshot)', async (t, evaluate) => {
  await evaluate.load({
    mock: {
      generateAdditionalNamesBox:
        evaluate.stubContentFunction('generateAdditionalNamesBox'),
    },
  });

  const stubTrack = {
    additionalNames: [],
    sharedAdditionalNames: [],
    inferredAdditionalNames: [],
  };

  const quickSnapshot = (message, trackProperties) =>
    evaluate.snapshot(message, {
      name: 'generateTrackAdditionalNamesBox',
      args: [{...stubTrack, ...trackProperties}],
    });

  quickSnapshot(`no additional names`, {});

  quickSnapshot(`own additional names only`, {
    additionalNames: [
      {name: `Foo Bar`, annotation: `the Alps`},
    ],
  });

  quickSnapshot(`shared additional names only`, {
    sharedAdditionalNames: [
      {name: `Bar Foo`, annotation: `the Rockies`},
    ],
  });

  quickSnapshot(`inferred additional names only`, {
    inferredAdditionalNames: [
      {name: `Baz Baz`, from: [{directory: `the-pyrenees`}]},
    ],
  });

  quickSnapshot(`multiple own`, {
    additionalNames: [
      {name: `Apple Time!`},
      {name: `Pterodactyl Time!`},
      {name: `Banana Time!`},
    ],
  });

  quickSnapshot(`own and shared, some overlap`, {
    additionalNames: [
      {name: `weed dreams..`, annotation: `own annotation`},
      {name: `夜間のＭＯＯＮ汗`, annotation: `own annotation`},
    ],
    sharedAdditionalNames: [
      {name: `weed dreams..`, annotation: `shared annotation`},
      {name: `ＧＡＭＩＮＧブラザー９６`, annotation: `shared annotation`},
    ],
  });

  quickSnapshot(`shared and inferred, some overlap`, {
    sharedAdditionalNames: [
      {name: `Coruscate`, annotation: `shared annotation`},
      {name: `Arbroath`, annotation: `shared annotation`},
    ],
    inferredAdditionalNames: [
      {name: `Arbroath`, from: [{directory: `inferred-from`}]},
      {name: `Prana Ferox`, from: [{directory: `inferred-from`}]},
    ],
  });

  quickSnapshot(`own and inferred, some overlap`, {
    additionalNames: [
      {name: `Ke$halo Strike Back`, annotation: `own annotation`},
      {name: `Ironic Mania`, annotation: `own annotation`},
    ],
    inferredAdditionalNames: [
      {name: `Ironic Mania`, from: [{directory: `inferred-from`}]},
      {name: `ANARCHY::MEGASTRIFE`, from: [{directory: `inferred-from`}]},
    ],
  });

  quickSnapshot(`own and shared and inferred, various overlap`, {
    additionalNames: [
      {name: `Own!`, annotation: `own annotation`},
      {name: `Own! Shared!`, annotation: `own annotation`},
      {name: `Own! Inferred!`, annotation: `own annotation`},
      {name: `Own! Shared! Inferred!`, annotation: `own annotation`},
    ],
    sharedAdditionalNames: [
      {name: `Shared!`, annotation: `shared annotation`},
      {name: `Own! Shared!`, annotation: `shared annotation`},
      {name: `Shared! Inferred!`, annotation: `shared annotation`},
      {name: `Own! Shared! Inferred!`, annotation: `shared annotation`},
    ],
    inferredAdditionalNames: [
      {name: `Inferred!`, from: [{directory: `inferred-from`}]},
      {name: `Own! Inferred!`, from: [{directory: `inferred-from`}]},
      {name: `Shared! Inferred!`, from: [{directory: `inferred-from`}]},
      {name: `Own! Shared! Inferred!`, from: [{directory: `inferred-from`}]},
    ],
  });
});
