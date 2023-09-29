import t from 'tap';

import {
  compositeFrom,
  continuationSymbol,
  withResultOfAvailabilityCheck,
  input,
} from '#composite';

const composite = compositeFrom({
  compose: false,

  steps: [
    withResultOfAvailabilityCheck({
      from: 'from',
      mode: 'mode',
    }).outputs({
      ['#availability']: '#result',
    }),

    {
      dependencies: ['#result'],
      compute: ({'#result': result}) => result,
    },
  ],
});

t.test(`withResultOfAvailabilityCheck: basic behavior`, t => {
  t.plan(1);

  t.match(composite, {
    expose: {
      dependencies: ['from', 'mode'],
    },
  });
});

const quickCompare = (t, expect, {from, mode}) =>
  t.equal(composite.expose.compute({from, mode}), expect);

const quickThrows = (t, {from, mode}) =>
  t.throws(() => composite.expose.compute({from, mode}));

t.test(`withResultOfAvailabilityCheck: mode = null`, t => {
  t.plan(10);

  quickCompare(t, true,  {mode: 'null', from: 'truthy string'});
  quickCompare(t, true,  {mode: 'null', from: 123});
  quickCompare(t, true,  {mode: 'null', from: true});

  quickCompare(t, true,  {mode: 'null', from: ''});
  quickCompare(t, true,  {mode: 'null', from: 0});
  quickCompare(t, true,  {mode: 'null', from: false});

  quickCompare(t, true,  {mode: 'null', from: [1, 2, 3]});
  quickCompare(t, true,  {mode: 'null', from: []});

  quickCompare(t, false, {mode: 'null', from: null});
  quickCompare(t, false, {mode: 'null', from: undefined});
});

t.test(`withResultOfAvailabilityCheck: mode = empty`, t => {
  t.plan(10);

  quickThrows(t, {mode: 'empty', from: 'truthy string'});
  quickThrows(t, {mode: 'empty', from: 123});
  quickThrows(t, {mode: 'empty', from: true});

  quickThrows(t, {mode: 'empty', from: ''});
  quickThrows(t, {mode: 'empty', from: 0});
  quickThrows(t, {mode: 'empty', from: false});

  quickCompare(t, true,  {mode: 'empty', from: [1, 2, 3]});
  quickCompare(t, false, {mode: 'empty', from: []});

  quickCompare(t, false, {mode: 'empty', from: null});
  quickCompare(t, false, {mode: 'empty', from: undefined});
});

t.test(`withResultOfAvailabilityCheck: mode = falsy`, t => {
  t.plan(10);

  quickCompare(t, true,  {mode: 'falsy', from: 'truthy string'});
  quickCompare(t, true,  {mode: 'falsy', from: 123});
  quickCompare(t, true,  {mode: 'falsy', from: true});

  quickCompare(t, false, {mode: 'falsy', from: ''});
  quickCompare(t, false, {mode: 'falsy', from: 0});
  quickCompare(t, false, {mode: 'falsy', from: false});

  quickCompare(t, true,  {mode: 'falsy', from: [1, 2, 3]});
  quickCompare(t, false, {mode: 'falsy', from: []});

  quickCompare(t, false, {mode: 'falsy', from: null});
  quickCompare(t, false, {mode: 'falsy', from: undefined});
});

t.test(`withResultOfAvailabilityCheck: default mode`, t => {
  t.plan(1);

  const template = withResultOfAvailabilityCheck({
    from: 'foo',
  });

  t.match(template.toDescription(), {
    inputMapping: {
      from: input.dependency('foo'),
      mode: input.value('null'),
    },
  });
});

t.test(`withResultOfAvailabilityCheck: validate static inputs`, t => {
  t.plan(5);

  let caughtError;

  try {
    caughtError = null;
    withResultOfAvailabilityCheck({});
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    errors: [/Required these inputs: from/],
  });

  t.doesNotThrow(() =>
    withResultOfAvailabilityCheck({
      from: 'dependency1',
      mode: 'dependency2',
    }));

  t.doesNotThrow(() =>
    withResultOfAvailabilityCheck({
      from: input.value('some static value'),
      mode: input.value('null'),
    }));

  try {
    caughtError = null;
    withResultOfAvailabilityCheck({
      from: 'foo',
      mode: input.value('invalid'),
    });
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    message: /Errors in input options passed to withResultOfAvailabilityCheck/,
    errors: [
      /mode: Expected one of null empty falsy, got invalid/,
    ],
  });

  try {
    caughtError = null;
    withResultOfAvailabilityCheck({
      from: input.value(null),
      mode: input.value(null),
    });
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    message: /Errors in input options passed to withResultOfAvailabilityCheck/,
    errors: [
      /mode: Expected a value, got null/,
    ],
  });
});

t.test(`withResultOfAvailabilityCheck: validate dynamic inputs`, t => {
  t.plan(2);

  let caughtError;

  try {
    caughtError = null;
    composite.expose.compute({
      from: 'apple',
      mode: 'banana',
    });
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    message: /Error computing composition/,
    cause: {
      message: /Error computing composition withResultOfAvailabilityCheck/,
      cause: {
        message: /Errors in input values provided to withResultOfAvailabilityCheck/,
        errors: [
          /mode: Expected one of null empty falsy, got banana/,
        ],
      },
    },
  });

  try {
    caughtError = null;
    composite.expose.compute({
      from: null,
      mode: null,
    });
  } catch (error) {
    caughtError = error;
  }

  t.match(caughtError, {
    message: /Error computing composition/,
    cause: {
      message: /Error computing composition withResultOfAvailabilityCheck/,
      cause: {
        message: /Errors in input values provided to withResultOfAvailabilityCheck/,
        errors: [
          /mode: Expected a value, got null/,
        ],
      },
    },
  });
});
