/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Fixed public peer compilation, used by the Python consumer. */
import {createPrivateCardContext} from './private-card-composition.mjs';
const [root,line]=process.argv.slice(2);createPrivateCardContext({root,line});process.stdout.write('private-card-peer-ok\n');
