//
//  webpack.js
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
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

import { Compiler } from 'webpack';

type BootstrapPluginOptions = {
  themes: string;
  output: string;
}

export class BootstrapPlugin {

  options: BootstrapPluginOptions;

  constructor(options: BootstrapPluginOptions) {
    this.options = options;
  }

  apply(compiler: Compiler) {

    const { themes, output } = this.options ?? {};

    const random = crypto.randomUUID();

    const { webpack, context } = compiler;
    const outputDir = compiler.options.output.path;

    if (!_.isString(outputDir)) throw Error('output.path not defined.');

    const importPath = path.relative(outputDir, path.resolve(process.cwd(), themes));
    const compilerSrc = path.resolve(outputDir, `bootstrap-${random}.js`);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(compilerSrc, `
      import _ from 'lodash';
      import fs from 'fs/promises';
      import path from 'path';
      import themes from '${importPath}';
      import { BootstrapCompiler } from '@o2ter/react-route';
      (async () => {
        const compiled = {};
        for (const [name, theme] of _.entries(themes)) {
          compiled[name] = await BootstrapCompiler(theme);
        }
        fs.writeFile(path.join(__dirname, '${output}'), JSON.stringify(compiled));
      })();
    `);

    compiler.hooks.make.tapAsync('BootstrapPlugin', (compilation, callback) => {
      const dep = webpack.EntryPlugin.createDependency(compilerSrc, 'bootstrap');
      compilation.addEntry(context, dep, `bootstrap-${random}`, callback as any);
    });

    compiler.hooks.assetEmitted.tap('BootstrapPlugin', (file, { targetPath }) => {
      if (file === `bootstrap-${random}.js`) {
        execSync(`node ${targetPath}`);
        fs.unlinkSync(targetPath);
      }
    });
  }
}
