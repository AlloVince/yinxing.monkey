module.exports = {
  presets:
    [
      [
        '@babel/env',
        {
          targets: {
            chrome: 63,
            firefox: 57
          },
          useBuiltIns: false,
          debug: false
        }
      ]
    ],
  plugins: [
  ]
};
