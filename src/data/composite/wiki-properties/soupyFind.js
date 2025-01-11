import {isObject} from '#validators';

function soupyFind() {
  return {
    flags: {update: true},
    update: {validate: isObject},
  };
}

export default soupyFind;
