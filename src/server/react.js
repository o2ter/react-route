//
//  react.js
//
//  The MIT License
//  Copyright (c) 2021 - 2023 O2ter Limited. All rights reserved.
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  THE SOFTWARE.
//

import _ from 'lodash';

import express from 'express';
import cookieParser from 'cookie-parser';

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { I18nProvider } from '@o2ter/i18n';
import { AppRegistry } from 'react-native';
import { SSRProvider } from 'react-bootstrap';
import { StaticNavigator } from '@o2ter/react-ui';
import { SafeAreaProvider } from '../safeArea';
import { BootstrapSSRProvider } from '../components/BootstrapProvider/SSRProvider/server';

import { compress } from '../minify/compress';

function _preferredLocale(req) {

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

function _renderToHTML(App, {
  env,
  jsSrc,
  cssSrc,
  location,
  preferredLocale,
}) {

  const context = {};
  let selectedTheme = null;

  function Main() {
    return <SSRProvider>
      <BootstrapSSRProvider onSelectTheme={theme => { selectedTheme = theme }}>
        <I18nProvider preferredLocale={preferredLocale}>
          <StaticNavigator location={location} context={context}>
            <SafeAreaProvider><App /></SafeAreaProvider>
          </StaticNavigator>
        </I18nProvider>
      </BootstrapSSRProvider>
    </SSRProvider>;
  }

  AppRegistry.registerComponent('App', () => Main);
  const { element, getStyleElement } = AppRegistry.getApplication('App');

  const html = ReactDOMServer.renderToString(element);
  const css = ReactDOMServer.renderToStaticMarkup(getStyleElement());

  const title = _.isString(context.title) ? `<title>${context.title}</title>` : '';

  let meta_string = '';
  if (context.meta) {
    for (const [key, value] of Object.entries(context.meta)) {
      meta_string += `\n<meta name="${key}" content="${value}">`
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
        <script id="env" type="text/plain">${compress(JSON.stringify(env))}</script>
        <script src="${jsSrc}"></script>
      </body>
    </html>
  `;
}

export const ReactRoute = (App, {
  env = {},
  jsSrc = '/bundle.js',
  cssSrc = '/css/bundle.css',
}) => {

  const router = express.Router();
  router.use(cookieParser());

  router.get('*', (req, res) => {
    const preferredLocale = _preferredLocale(req);
    res.cookie('PREFERRED_LOCALE', preferredLocale, { maxAge: 31536000 });
    res.send(_renderToHTML(App, {
      env,
      jsSrc,
      cssSrc,
      preferredLocale,
      location: req.path,
    }));
  });

  return router;
}