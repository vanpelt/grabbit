module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);

  const isTest = api.env("test");

  const presets = ["babel-preset-expo"];
  const plugins = [["inline-import", { extensions: [".sql"] }]];

  if (isTest) {
    plugins.push("babel-plugin-dynamic-import-node");
  } else {
    plugins.push("@babel/plugin-transform-dynamic-import");
  }

  return {
    presets,
    plugins,
  };
};
