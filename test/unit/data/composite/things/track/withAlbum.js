import t from 'tap';

import {compositeFrom, input} from '#composite';
import {exposeConstant, exposeDependency} from '#composite/control-flow';
import {withAlbum} from '#composite/things/track';

t.test(`withAlbum: basic behavior`, t => {
  t.plan(3);

  const composite = compositeFrom({
    compose: false,
    steps: [
      withAlbum(),
      exposeDependency({dependency: '#album'}),
    ],
  });

  t.match(composite, {
    expose: {
      dependencies: ['albumData', 'this'],
    },
  });

  const fakeTrack1 = {directory: 'foo'};
  const fakeTrack2 = {directory: 'bar'};
  const fakeAlbum = {directory: 'baz', tracks: [fakeTrack1]};

  t.equal(
    composite.expose.compute({
      albumData: [fakeAlbum],
      this: fakeTrack1,
    }),
    fakeAlbum);

  t.equal(
    composite.expose.compute({
      albumData: [fakeAlbum],
      this: fakeTrack2,
    }),
    null);
});

t.test(`withAlbum: early exit conditions (notFoundMode: null)`, t => {
  t.plan(4);

  const composite = compositeFrom({
    compose: false,
    steps: [
      withAlbum(),
      exposeConstant({
        value: input.value('bimbam'),
      }),
    ],
  });

  const fakeTrack1 = {directory: 'foo'};
  const fakeTrack2 = {directory: 'bar'};
  const fakeAlbum = {directory: 'baz', tracks: [fakeTrack1]};

  t.equal(
    composite.expose.compute({
      albumData: [fakeAlbum],
      this: fakeTrack1,
    }),
    'bimbam',
    `does not early exit if albumData is present and contains the track`);

  t.equal(
    composite.expose.compute({
      albumData: [fakeAlbum],
      this: fakeTrack2,
    }),
    'bimbam',
    `does not early exit if albumData is present and does not contain the track`);

  t.equal(
    composite.expose.compute({
      albumData: [],
      this: fakeTrack1,
    }),
    'bimbam',
    `does not early exit if albumData is empty array`);

  t.equal(
    composite.expose.compute({
      albumData: null,
      this: fakeTrack1,
    }),
    null,
    `early exits if albumData is null`);
});

t.test(`withAlbum: early exit conditions (notFoundMode: exit)`, t => {
  t.plan(4);

  const composite = compositeFrom({
    compose: false,
    steps: [
      withAlbum({
        notFoundMode: input.value('exit'),
      }),

      exposeConstant({
        value: input.value('bimbam'),
      }),
    ],
  });

  const fakeTrack1 = {directory: 'foo'};
  const fakeTrack2 = {directory: 'bar'};
  const fakeAlbum = {directory: 'baz', tracks: [fakeTrack1]};

  t.equal(
    composite.expose.compute({
      albumData: [fakeAlbum],
      this: fakeTrack1,
    }),
    'bimbam',
    `does not early exit if albumData is present and contains the track`);

  t.equal(
    composite.expose.compute({
      albumData: [fakeAlbum],
      this: fakeTrack2,
    }),
    null,
    `early exits if albumData is present and does not contain the track`);

  t.equal(
    composite.expose.compute({
      albumData: [],
      this: fakeTrack1,
    }),
    null,
    `early exits if albumData is empty array`);

  t.equal(
    composite.expose.compute({
      albumData: null,
      this: fakeTrack1,
    }),
    null,
    `early exits if albumData is null`);
});
