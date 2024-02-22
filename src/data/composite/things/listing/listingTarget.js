import {isListingTarget} from '#validators';

export default function() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isListingTarget},
  };
};
