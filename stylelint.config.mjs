export default {
  extends: ['stylelint-config-recommended-scss'],
  // No broad disable comments: exceptions belong in this reviewed configuration.
  ignoreDisables: true,
  rules: {
    'block-no-empty': [true, { ignore: ['comments'] }],
    'declaration-block-no-duplicate-properties': true,
    'declaration-block-no-duplicate-custom-properties': true,
    'declaration-no-important': true,
    'keyframe-declaration-no-important': true,
  },
};
