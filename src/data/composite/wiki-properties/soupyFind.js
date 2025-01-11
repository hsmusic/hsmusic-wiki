import {input} from '#composite';
import {isObject} from '#validators';

function soupyFind() {
  return {
    flags: {update: true},
    update: {validate: isObject},
  };
}

soupyFind.input = key =>
  input.value('_soupyFind:' + key);

export default soupyFind;
