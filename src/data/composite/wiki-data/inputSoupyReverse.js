import {input} from '#composite';
import {anyOf, isFunction, isString} from '#validators';

function inputSoupyReverse() {
  return input({
    validate:
      anyOf(
        isFunction,
        val => {
          isString(val);

          if (!val.startsWith('_soupyReverse:')) {
            throw new Error(`Expected soupyReverse.input() token`);
          }

          return true;
        }),
  });
}

inputSoupyReverse.input = key =>
  input.value('_soupyReverse:' + key);

export default inputSoupyReverse;

export function getSoupyReverseInputKey(value) {
  return value.slice('_soupyReverse:'.length).replace(/\.unique$/, '');
}

export function doesSoupyReverseInputWantUnique(value) {
  return value.endsWith('.unique');
}
