import {isURL} from '#validators';

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isURL},
    expose: {
      transform: (value) =>
        (value === null
          ? null
       : value.endsWith('/')
          ? value
          : value + '/'),
    },
  };
}
