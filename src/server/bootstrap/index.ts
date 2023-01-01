//
//  bootstrap.js
//
//  The MIT License
//  Copyright (c) 2021 - 2022 O2ter Limited. All rights reserved.
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

import crypto from 'crypto';
import express from 'express';
import { ThemeVariables } from '@o2ter/react-ui';
import { compileString } from '@o2ter/bootstrap.js';

import * as color_defaults from './colors';
import * as theme_color_defaults from './theme_colors';

const md5 = (str: string) => crypto.createHash('md5').update(str).digest('hex')

export const BootstrapCompiler = async (theme: ThemeVariables) => {

  const styles: Record<string, string | number> = {};

  if (theme.grays?.['100']) styles['gray-100'] = theme.grays['100'];
  if (theme.grays?.['200']) styles['gray-200'] = theme.grays['200'];
  if (theme.grays?.['300']) styles['gray-300'] = theme.grays['300'];
  if (theme.grays?.['400']) styles['gray-400'] = theme.grays['400'];
  if (theme.grays?.['500']) styles['gray-500'] = theme.grays['500'];
  if (theme.grays?.['600']) styles['gray-600'] = theme.grays['600'];
  if (theme.grays?.['700']) styles['gray-700'] = theme.grays['700'];
  if (theme.grays?.['800']) styles['gray-800'] = theme.grays['800'];
  if (theme.grays?.['900']) styles['gray-900'] = theme.grays['900'];

  if (!_.isEmpty(theme.colors)) {
    for (const [name, color] of _.entries(theme.colors)) {
      styles[name] = color;
    }
    styles['colors'] = `(${_.map({
      ...color_defaults,
      ...theme.colors,
    }, (color, name) => `"${name}": ${color}`).join(',')})`
  }

  if (!_.isEmpty(theme.themeColors)) {
    for (const [name, color] of _.entries(theme.themeColors)) {
      styles[name] = color;
    }
    styles['theme-colors'] = `(${_.map({
      ...theme_color_defaults,
      ...theme.themeColors,
    }, (color, name) => `"${name}": ${color}`).join(',')})`;
  }

  if (_.isNumber(theme.minContrastRatio)) styles['min-contrast-ratio'] = theme.minContrastRatio;
  if (_.isString(theme.colorContrastDark)) styles['color-contrast-dark'] = theme.colorContrastDark;
  if (_.isString(theme.colorContrastLight)) styles['color-contrast-light'] = theme.colorContrastLight;

  if (_.isNumber(theme.spacer)) styles['spacer'] = `${theme.spacer}px`;
  if (!_.isEmpty(theme.spacers)) {
    styles['spacers'] = `(${_.map(theme.spacers, (spacer, name) => `${name}: ${spacer}px`).join(',')})`;
  }

  if (_.isNumber(theme.borderWidth)) styles['border-width'] = `${theme.borderWidth}px`;
  if (!_.isEmpty(theme.borderWidths)) {
    styles['border-widths'] = `(${_.map(theme.borderWidths, (width, name) => `${name}: ${width}px`).join(',')})`;
  }

  if (_.isNumber(theme.borderRadiusBase)) styles['border-radius'] = `${theme.borderRadiusBase}px`;
  if (!_.isEmpty(theme.borderRadius)) {
    if (_.isNumber(theme.borderRadius['sm'])) styles['border-radius-sm'] = `${theme.borderRadius['sm']}px`;
    if (_.isNumber(theme.borderRadius['lg'])) styles['border-radius-lg'] = `${theme.borderRadius['lg']}px`;
    if (_.isNumber(theme.borderRadius['xl'])) styles['border-radius-xl'] = `${theme.borderRadius['xl']}px`;
    if (_.isNumber(theme.borderRadius['xxl'])) styles['border-radius-2xl'] = `${theme.borderRadius['xxl']}px`;
  }

  if (_.isString(theme.bodyBackground)) styles['body-bg'] = theme.bodyBackground;
  if (_.isString(theme.bodyColor)) styles['body-color'] = theme.bodyColor;

  if (!_.isEmpty(theme.breakpoints)) {
    styles['grid-breakpoints'] = `(${_.map(theme.breakpoints, (breakpoint, name) => `${name}: ${breakpoint}px`).join(',')})`;
  }

  if (_.isString(theme.fontWeightBase)) styles['font-weight-base'] = theme.fontWeightBase;
  if (!_.isEmpty(theme.fontWeights)) {
    if (_.isString(theme.fontWeights['light'])) styles['font-weight-light'] = theme.fontWeights['light'];
    if (_.isString(theme.fontWeights['normal'])) styles['font-weight-normal'] = theme.fontWeights['normal'];
    if (_.isString(theme.fontWeights['semibold'])) styles['font-weight-semibold'] = theme.fontWeights['semibold'];
    if (_.isString(theme.fontWeights['bold'])) styles['font-weight-bold'] = theme.fontWeights['bold'];
  }

  return compileString(styles);
}

export const BootstrapRoute = (
  themes: Record<string, ThemeVariables>,
  precompiled: Record<string, string>,
) => {
  const router = express.Router();
  for (const [name, theme] of _.entries(themes)) {
    const promise = precompiled[name] ? [precompiled[name], md5(precompiled[name])] : BootstrapCompiler(theme).then(s => [s, md5(s)]);
    router.get(`/${name}.css`, async (req, res) => {
      const [css, etag] = await promise;
      const match = req.headers['if-none-match'];
      if (match === `"${etag}"`) {
        res.status(304).end();
        return;
      }
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'public, max-age=0');
      res.setHeader('ETag', `"${etag}"`);
      res.send(css);
    });
  }
  return router;
}
