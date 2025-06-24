export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      MAPBOX_API_KEY: process.env.MAPBOX_API_KEY,
    },
  };
};
