import t from 'tap';

import {compositeFrom, continuationSymbol, input} from '#composite';
import {isString} from '#validators';

t.test(`compositeFrom: basic behavior`, t => {
  t.plan(2);

  const composite = compositeFrom({
    annotation: `myComposite`,
    compose: false,

    steps: [
      {
        dependencies: ['foo'],
        compute: (continuation, {foo}) =>
          continuation({'#bar': foo * 2}),
      },

      {
        dependencies: ['#bar', 'baz', 'suffix'],
        compute: ({'#bar': bar, baz, suffix}) =>
          baz.repeat(bar) + suffix,
      },
    ],
  });

  t.match(composite, {
    annotation: `myComposite`,

    flags: {expose: true, compose: false, update: false},

    expose: {
      dependencies: ['foo', 'baz', 'suffix'],
      compute: Function,
      transform: null,
    },

    update: null,
  });

  t.equal(
    composite.expose.compute({
      foo: 3,
      baz: 'ba',
      suffix: 'BOOM',
    }),
    'babababababaBOOM');
});

t.test(`compositeFrom: input-shaped step dependencies`, t => {
  t.plan(2);

  const composite = compositeFrom({
    compose: false,
    steps: [
      {
        dependencies: [
          input.myself(),
          input.updateValue(),
        ],

        transform: (updateValue1, {
          [input.myself()]: me,
          [input.updateValue()]: updateValue2,
        }) => ({me, updateValue1, updateValue2}),
      },
    ],
  });

  t.match(composite, {
    expose: {
      dependencies: ['this'],
      transform: Function,
      compute: null,
    },
  });

  const myself = {foo: 'bar'};

  t.same(
    composite.expose.transform('banana', {
      this: myself,
      pomelo: 'delicious',
    }),
    {
      me: myself,
      updateValue1: 'banana',
      updateValue2: 'banana',
    });
});

t.test(`compositeFrom: dependencies from inputs`, t => {
  t.plan(3);

  const composite = compositeFrom({
    annotation: `myComposite`,

    compose: true,

    inputMapping: {
      foo:      input('bar'),
      pomelo:   input.value('delicious'),
      humorous: input.dependency('#mammal'),
      data:     input.dependency('albumData'),
      ref:      input.updateValue(),
    },

    inputDescriptions: {
      foo:      input(),
      pomelo:   input(),
      humorous: input(),
      data:     input(),
      ref:      input(),
    },

    steps: [
      {
        dependencies: [
          input('foo'),
          input('pomelo'),
          input('humorous'),
          input('data'),
          input('ref'),
        ],

        compute: (continuation, {
          [input('foo')]: foo,
          [input('pomelo')]: pomelo,
          [input('humorous')]: humorous,
          [input('data')]: data,
          [input('ref')]: ref,
        }) => continuation.exit({foo, pomelo, humorous, data, ref}),
      },
    ],
  });

  t.match(composite, {
    expose: {
      dependencies: [
        input('bar'),
        '#mammal',
        'albumData',
      ],

      transform: Function,
      compute: null,
    },
  });

  const exitData = {};
  const continuation = {
    exit(value) {
      Object.assign(exitData, value);
      return continuationSymbol;
    },
  };

  t.equal(
    composite.expose.transform('album:bepis', continuation, {
      [input('bar')]: 'squid time',
      '#mammal': 'fox',
      'albumData': ['album1', 'album2'],
    }),
    continuationSymbol);

  t.same(exitData, {
    foo: 'squid time',
    pomelo: 'delicious',
    humorous: 'fox',
    data: ['album1', 'album2'],
    ref: 'album:bepis',
  });
});

t.test(`compositeFrom: update from various sources`, t => {
  t.plan(3);

  const match = {
    flags: {update: true, expose: true, compose: false},

    update: {
      validate: isString,
      default: 'foo',
    },

    expose: {
      transform: Function,
      compute: null,
    },
  };

  t.test(`compositeFrom: update from composition description`, t => {
    t.plan(2);

    const composite = compositeFrom({
      compose: false,

      update: {
        validate: isString,
        default: 'foo',
      },

      steps: [
        {transform: (value, continuation) => continuation(value.repeat(2))},
        {transform: (value) => `Xx_${value}_xX`},
      ],
    });

    t.match(composite, match);
    t.equal(composite.expose.transform('foo'), `Xx_foofoo_xX`);
  });

  t.test(`compositeFrom: update from step dependencies`, t => {
    t.plan(2);

    const composite = compositeFrom({
      compose: false,

      steps: [
        {
          dependencies: [
            input.updateValue({
              validate: isString,
              default: 'foo',
            }),
          ],

          compute: ({
            [input.updateValue()]: value,
          }) => `Xx_${value.repeat(2)}_xX`,
        },
      ],
    });

    t.match(composite, match);
    t.equal(composite.expose.transform('foo'), 'Xx_foofoo_xX');
  });

  t.test(`compositeFrom: update from inputs`, t => {
    t.plan(3);

    const composite = compositeFrom({
      inputMapping: {
        myInput: input.updateValue({
          validate: isString,
          default: 'foo',
        }),
      },

      inputDescriptions: {
        myInput: input(),
      },

      steps: [
        {
          dependencies: [input('myInput')],
          compute: (continuation, {
            [input('myInput')]: value,
          }) => continuation({
            '#value': `Xx_${value.repeat(2)}_xX`,
          }),
        },

        {
          dependencies: ['#value'],
          transform: (_value, continuation, {'#value': value}) =>
            continuation(value),
        },
      ],
    });

    let continuationValue = null;
    const continuation = value => {
      continuationValue = value;
      return continuationSymbol;
    };

    t.match(composite, {
      ...match,

      flags: {update: true, expose: true, compose: true},
    });

    t.equal(
      composite.expose.transform('foo', continuation),
      continuationSymbol);

    t.equal(continuationValue, 'Xx_foofoo_xX');
  });
});

t.test(`compositeFrom: dynamic input validation from type`, t => {
  t.plan(2);

  const composite = compositeFrom({
    inputMapping: {
      string:   input('string'),
      number:   input('number'),
      boolean:  input('boolean'),
      function: input('function'),
      object:   input('object'),
      array:    input('array'),
    },

    inputDescriptions: {
      string:   input({null: true, type: 'string'}),
      number:   input({null: true, type: 'number'}),
      boolean:  input({null: true, type: 'boolean'}),
      function: input({null: true, type: 'function'}),
      object:   input({null: true, type: 'object'}),
      array:    input({null: true, type: 'array'}),
    },

    outputs: {'#result': '#result'},

    steps: [
      {compute: continuation => continuation({'#result': 'OK'})},
    ],
  });

  const notCalledSymbol = Symbol('continuation not called');

  let continuationValue;
  const continuation = value => {
    continuationValue = value;
    return continuationSymbol;
  };

  let thrownError;

  try {
    continuationValue = notCalledSymbol;
    thrownError = null;
    composite.expose.compute(continuation, {
      [input('string')]: 123,
    });
  } catch (error) {
    thrownError = error;
  }

  t.equal(continuationValue, notCalledSymbol);
  t.match(thrownError, {
  });
});
