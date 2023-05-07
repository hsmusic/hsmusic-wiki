import {BlackBox} from '../../../src/contract.js';
import {mockFunction} from '../../lib/generic-mock.js';
import {showAggregate} from '../../../src/util/sugar.js';

import t from 'tap';

t.test(`BlackBox - caching`, t => {
  t.plan(8);

  const obj1 = {foo: 3, bar: 4};
  const obj2 = {baz: 5, qux: 6};

  let {value: fn, close: closeMock} =
    mockFunction((object, key) => object[key] ** 2)

  fn = fn
    .args([obj1, 'foo']).next()
    .args([obj2, 'qux']).next()
    .args([obj1, 'bar']).next()
    .args([obj2, 'baz']);

  const bb = new BlackBox(fn);
  const evaluate = bb.getEvaluator();

  t.equal(evaluate(obj1, 'foo'), 3 ** 2);
  t.equal(evaluate(obj1, 'foo'), 3 ** 2);
  t.equal(evaluate(obj2, 'qux'), 6 ** 2);
  t.equal(evaluate(obj2, 'qux'), 6 ** 2);
  t.equal(evaluate(obj1, 'foo'), 3 ** 2);

  t.equal(evaluate(obj1, 'bar'), 4 ** 2);
  t.equal(evaluate(obj2, 'baz'), 5 ** 2);
  t.equal(evaluate(obj1, 'foo'), 3 ** 2);

  try {
    closeMock();
  } catch (error) {
    showAggregate(error);
    throw error;
  }
});

t.test(`BlackBox - no caching`, t => {
  t.plan(8);

  const obj1 = {foo: 3, bar: 4};
  const obj2 = {baz: 5, qux: 6};

  let {value: fn, close: closeMock} =
    mockFunction((object, key) => object[key] ** 2)

  fn = fn
    .args([obj1, 'foo']).repeat(2)
    .args([obj2, 'qux']).repeat(2)
    .args([obj1, 'foo']).next()
    .args([obj1, 'bar']).next()
    .args([obj2, 'baz']).next()
    .args([obj1, 'foo']);

  const bb = new BlackBox(fn);
  const evaluate = bb.getEvaluator();

  bb.caching = false;

  t.equal(evaluate(obj1, 'foo'), 3 ** 2);
  t.equal(evaluate(obj1, 'foo'), 3 ** 2);
  t.equal(evaluate(obj2, 'qux'), 6 ** 2);
  t.equal(evaluate(obj2, 'qux'), 6 ** 2);
  t.equal(evaluate(obj1, 'foo'), 3 ** 2);

  t.equal(evaluate(obj1, 'bar'), 4 ** 2);
  t.equal(evaluate(obj2, 'baz'), 5 ** 2);
  t.equal(evaluate(obj1, 'foo'), 3 ** 2);

  try {
    closeMock();
  } catch (error) {
    showAggregate(error);
    throw error;
  }
});
