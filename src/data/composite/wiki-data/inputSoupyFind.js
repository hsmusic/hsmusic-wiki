import {input} from '#composite';
import {anyOf, isFunction, isString} from '#validators';

function inputSoupyFind() {
  return input({
    validate:
      anyOf(
        isFunction,
        val => {
          isString(val);

          if (!val.startsWith('_soupyFind:')) {
            throw new Error(`Expected soupyFind.input() token`);
          }

          return true;
        }),
  });
}

inputSoupyFind.input = key =>
  input.value('_soupyFind:' + key);

export default inputSoupyFind;

export function getSoupyFindInputKey(value) {
  return value.slice('_soupyFind:'.length);
}
