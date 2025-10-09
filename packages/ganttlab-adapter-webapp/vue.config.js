/*
  vue.config.js — make publicPath configurable via VUE_APP_PUBLIC_PATH
  Default is '/' so local dev/debug isn't affected. For GitHub Pages builds
  set VUE_APP_PUBLIC_PATH (see .github workflow which sets it from GITHUB_REPOSITORY).
*/
module.exports = {
  publicPath: process.env.VUE_APP_PUBLIC_PATH || '/',
};
