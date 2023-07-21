import _ from 'lodash';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { I18nProvider } from '@o2ter/i18n';
import { AppRegistry } from 'react-native';
import { SSRProvider } from 'react-bootstrap';
import { StaticNavigator } from '@o2ter/react-ui';
import { SafeAreaProvider } from '../safeArea';
import { BootstrapSSRProvider } from '../components/BootstrapProvider/server';
import { compress } from '../minify/compress';
import { serialize } from 'proto.io/dist/common';
import { ServerResourceContext } from '../components/ServerResourceProvider/context';

export function _preferredLocale(req) {

  if (_.isString(req.cookies['PREFERRED_LOCALE'])) {
    return req.cookies['PREFERRED_LOCALE'];
  }

  if (_.isString(req.headers['accept-language'])) {

    const acceptLanguage = req.headers['accept-language'].split(',');

    for (const language of acceptLanguage) {

      return language.split(';')[0].trim();
    }
  }
}
export function _renderToHTML(App, {
  env, jsSrc, cssSrc, location, preferredLocale, resources,
}) {

  const context = {};
  let selectedTheme = null;

  function Main() {
    return <ServerResourceContext.Provider value={resources}>
      <SSRProvider>
        <BootstrapSSRProvider onSelectTheme={theme => { selectedTheme = theme; }}>
          <I18nProvider preferredLocale={preferredLocale}>
            <StaticNavigator location={location} context={context}>
              <SafeAreaProvider><App /></SafeAreaProvider>
            </StaticNavigator>
          </I18nProvider>
        </BootstrapSSRProvider>
      </SSRProvider>
    </ServerResourceContext.Provider>;
  }

  AppRegistry.registerComponent('App', () => Main);
  const { element, getStyleElement } = AppRegistry.getApplication('App');

  const html = ReactDOMServer.renderToString(element);
  const css = ReactDOMServer.renderToStaticMarkup(getStyleElement());

  const title = _.isString(context.title) ? `<title>${context.title}</title>` : '';

  let meta_string = '';
  if (context.meta) {
    for (const [key, value] of Object.entries(context.meta)) {
      meta_string += `\n<meta name="${key}" content="${value}">`;
    }
  }

  let bootstrap = '';
  if (!_.isEmpty(selectedTheme) && !_.isEmpty(env.BOOTSTRAP_BASE_URL)) {
    const path = `${env.BOOTSTRAP_BASE_URL}/${selectedTheme}.css`;
    bootstrap = `<link id="bootstrap" rel="stylesheet" href="${path}"></link>`;
  }

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover">
        ${title}${meta_string}
        <link rel="stylesheet" href="${cssSrc}" />
        ${css}${bootstrap}
      </head>
      <body>
        <div id="root">${html}</div>
        <script id="env" type="text/plain">${compress(serialize(env))}</script>
        <script id="resources" type="text/plain">${compress(serialize(resources))}</script>
        <script src="${jsSrc}"></script>
      </body>
    </html>
  `;
}
