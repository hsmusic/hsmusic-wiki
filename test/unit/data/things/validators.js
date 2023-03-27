import t from 'tap';
import { showAggregate } from '../../../../src/util/sugar.js';

import {
  // Basic types
  isBoolean,
  isCountingNumber,
  isDate,
  isNumber,
  isString,
  isStringNonEmpty,

  // Complex types
  isArray,
  isObject,
  validateArrayItems,

  // Wiki data
  isColor,
  isCommentary,
  isContribution,
  isContributionList,
  isDimensions,
  isDirectory,
  isDuration,
  isFileExtension,
  isName,
  isURL,
  validateReference,
  validateReferenceList,

  // Compositional utilities
  oneOf,
} from '../../../../src/data/things/validators.js';

function test(t, msg, fn) {
  t.test(msg, t => {
    try {
      fn(t);
    } catch (error) {
      if (error instanceof AggregateError) {
        showAggregate(error);
      }
      throw error;
    }
  });
}

// Basic types

test(t, 'isBoolean', t => {
  t.plan(4);
  t.ok(isBoolean(true));
  t.ok(isBoolean(false));
  t.throws(() => isBoolean(1), TypeError);
  t.throws(() => isBoolean('yes'), TypeError);
});

test(t, 'isNumber', t => {
  t.plan(6);
  t.ok(isNumber(123));
  t.ok(isNumber(0.05));
  t.ok(isNumber(0));
  t.ok(isNumber(-10));
  t.throws(() => isNumber('413'), TypeError);
  t.throws(() => isNumber(true), TypeError);
});

test(t, 'isCountingNumber', t => {
  t.plan(6);
  t.ok(isCountingNumber(3));
  t.ok(isCountingNumber(1));
  t.throws(() => isCountingNumber(1.75), TypeError);
  t.throws(() => isCountingNumber(0), TypeError);
  t.throws(() => isCountingNumber(-1), TypeError);
  t.throws(() => isCountingNumber('612'), TypeError);
});

test(t, 'isString', t => {
  t.plan(3);
  t.ok(isString('hello!'));
  t.ok(isString(''));
  t.throws(() => isString(100), TypeError);
});

test(t, 'isStringNonEmpty', t => {
  t.plan(4);
  t.ok(isStringNonEmpty('hello!'));
  t.throws(() => isStringNonEmpty(''), TypeError);
  t.throws(() => isStringNonEmpty('     '), TypeError);
  t.throws(() => isStringNonEmpty(100), TypeError);
});

// Complex types

test(t, 'isArray', t => {
  t.plan(3);
  t.ok(isArray([]));
  t.throws(() => isArray({}), TypeError);
  t.throws(() => isArray('1, 2, 3'), TypeError);
});

test(t, 'isDate', t => {
  t.plan(3);
  t.ok(isDate(new Date('2023-03-27 09:24:15')));
  t.throws(() => isDate(new Date(Infinity)), TypeError);
  t.throws(() => isDimensions('2023-03-27 09:24:15'), TypeError);
});

test(t, 'isObject', t => {
  t.plan(3);
  t.ok(isObject({}));
  t.ok(isObject([]));
  t.throws(() => isObject(null), TypeError);
});

test(t, 'validateArrayItems', t => {
  t.plan(6);

  t.ok(validateArrayItems(isNumber)([3, 4, 5]));
  t.ok(validateArrayItems(validateArrayItems(isNumber))([[3, 4], [4, 5], [6, 7]]));

  let caughtError = null;
  try {
    validateArrayItems(isNumber)([10, 20, 'one hundred million consorts', 30]);
  } catch (err) {
    caughtError = err;
  }

  t.not(caughtError, null);
  t.ok(caughtError instanceof AggregateError);
  t.equal(caughtError.errors.length, 1);
  t.ok(caughtError.errors[0] instanceof TypeError);
});

// Wiki data

t.test('isColor', t => {
  t.plan(9);
  t.ok(isColor('#123'));
  t.ok(isColor('#1234'));
  t.ok(isColor('#112233'));
  t.ok(isColor('#11223344'));
  t.ok(isColor('#abcdef00'));
  t.ok(isColor('#ABCDEF'));
  t.throws(() => isColor('#ggg'), TypeError);
  t.throws(() => isColor('red'), TypeError);
  t.throws(() => isColor('hsl(150deg 30% 60%)'), TypeError);
});

t.test('isCommentary', t => {
  t.plan(6);
  t.ok(isCommentary(`<i>Toby Fox:</i>\ndogsong.mp3`));
  t.ok(isCommentary(`Technically, this works:</i>`));
  t.ok(isCommentary(`<i><b>Whodunnit:</b></i>`));
  t.throws(() => isCommentary(123), TypeError);
  t.throws(() => isCommentary(``), TypeError);
  t.throws(() => isCommentary(`<i><u>Toby Fox:</u></i>`));
});

t.test('isContribution', t => {
  t.plan(4);
  t.ok(isContribution({who: 'artist:toby-fox', what: 'Music'}));
  t.ok(isContribution({who: 'Toby Fox'}));
  t.throws(() => isContribution(({who: 'group:umspaf', what: 'Organizing'})),
    {errors: /who/});
  t.throws(() => isContribution(({who: 'artist:toby-fox', what: 123})),
    {errors: /what/});
});

t.test('isContributionList', t => {
  t.plan(4);
  t.ok(isContributionList([{who: 'Beavis'}, {who: 'Butthead', what: 'Wrangling'}]));
  t.ok(isContributionList([]));
  t.throws(() => isContributionList(2));
  t.throws(() => isContributionList(['Charlie', 'Woodstock']));
});

test(t, 'isDimensions', t => {
  t.plan(6);
  t.ok(isDimensions([1, 1]));
  t.ok(isDimensions([50, 50]));
  t.ok(isDimensions([5000, 1]));
  t.throws(() => isDimensions([1]), TypeError);
  t.throws(() => isDimensions([413, 612, 1025]), TypeError);
  t.throws(() => isDimensions('800x200'), TypeError);
});

test(t, 'isDirectory', t => {
  t.plan(6);
  t.ok(isDirectory('savior-of-the-waking-world'));
  t.ok(isDirectory('MeGaLoVania'));
  t.ok(isDirectory('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'));
  t.throws(() => isDirectory(123), TypeError);
  t.throws(() => isDirectory(''), TypeError);
  t.throws(() => isDirectory('troll saint nicholas and the quest for the holy pail'), TypeError);
});

test(t, 'isDuration', t => {
  t.plan(5);
  t.ok(isDuration(60));
  t.ok(isDuration(0.02));
  t.ok(isDuration(0));
  t.throws(() => isDuration(-1), TypeError);
  t.throws(() => isDuration('10:25'), TypeError);
});

test(t, 'isFileExtension', t => {
  t.plan(6);
  t.ok(isFileExtension('png'));
  t.ok(isFileExtension('jpg'));
  t.ok(isFileExtension('sub_loc'));
  t.throws(() => isFileExtension(''), TypeError);
  t.throws(() => isFileExtension('.jpg'), TypeError);
  t.throws(() => isFileExtension('just an image bro!!!!'), TypeError);
});

t.test('isName', t => {
  t.plan(4);
  t.ok(isName('Dogz 2.0'));
  t.ok(isName('album:this-track-is-only-named-thusly-to-give-niklink-a-headache'));
  t.ok(isName(''));
  t.throws(() => isName(612));
});

t.test('isURL', t => {
  t.plan(4);
  t.ok(isURL(`https://hsmusic.wiki/foo/bar/hi?baz=25#hash`));
  t.throws(() => isURL(`/the/dog/zone/`));
  t.throws(() => isURL(25));
  t.throws(() => isURL(new URL(`https://hsmusic.wiki/perfectly/reasonable/`)));
});

test(t, 'validateReference', t => {
  t.plan(16);

  const typeless = validateReference();
  const track = validateReference('track');
  const album = validateReference('album');

  t.ok(track('track:doctor'));
  t.ok(track('track:MeGaLoVania'));
  t.ok(track('Showtime (Imp Strife Mix)'));
  t.throws(() => track('track:troll saint nic'), TypeError);
  t.throws(() => track('track:'), TypeError);
  t.throws(() => track('album:homestuck-vol-1'), TypeError);

  t.ok(album('album:sburb'));
  t.ok(album('album:the-wanderers'));
  t.ok(album('Homestuck Vol. 8'));
  t.throws(() => album('album:Hiveswap Friendsim'), TypeError);
  t.throws(() => album('album:'), TypeError);
  t.throws(() => album('track:showtime-piano-refrain'), TypeError);

  t.ok(typeless('Hopes and Dreams'));
  t.ok(typeless('track:snowdin-town'));
  t.throws(() => typeless(''), TypeError);
  t.throws(() => typeless('album:undertale-soundtrack'));
});

test(t, 'validateReferenceList', t => {
  const track = validateReferenceList('track');
  const artist = validateReferenceList('artist');

  t.plan(9);

  t.ok(track(['track:fallen-down', 'Once Upon a Time']));
  t.ok(artist(['artist:toby-fox', 'Mark Hadley']));
  t.ok(track(['track:amalgam']));
  t.ok(track([]));

  let caughtError = null;
  try {
    track(['Dog', 'album:vaporwave-2016', 'Cat', 'artist:john-madden']);
  } catch (err) {
    caughtError = err;
  }

  t.not(caughtError, null);
  t.ok(caughtError instanceof AggregateError);
  t.equal(caughtError.errors.length, 2);
  t.ok(caughtError.errors[0] instanceof TypeError);
  t.ok(caughtError.errors[1] instanceof TypeError);
});

test(t, 'oneOf', t => {
  t.plan(11);

  const isStringOrNumber = oneOf(isString, isNumber);

  t.ok(isStringOrNumber('hello world'));
  t.ok(isStringOrNumber(42));
  t.throws(() => isStringOrNumber(false));

  const mockError = new Error();
  const neverSucceeds = () => {
    throw mockError;
  };

  const isStringOrGetRekt = oneOf(isString, neverSucceeds);

  t.ok(isStringOrGetRekt('phew!'));

  let caughtError = null;
  try {
    isStringOrGetRekt(0xdeadbeef);
  } catch (err) {
    caughtError = err;
  }

  t.not(caughtError, null);
  t.ok(caughtError instanceof AggregateError);
  t.equal(caughtError.errors.length, 2);
  t.ok(caughtError.errors[0] instanceof TypeError);
  t.equal(caughtError.errors[0].check, isString);
  t.equal(caughtError.errors[1], mockError);
  t.equal(caughtError.errors[1].check, neverSucceeds);
});
