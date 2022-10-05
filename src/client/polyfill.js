//
//  polyfill.js
//
//  Copyright (c) 2021 - 2022 O2ter Limited. All rights reserved.
//

if (!global.SharedArrayBuffer) {
  global.SharedArrayBuffer = {
    prototype: {
      get byteLength() { }
    }
  };
}
