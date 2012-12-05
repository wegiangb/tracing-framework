#!/usr/bin/env node
/**
 * Copyright 2012 Google, Inc. All Rights Reserved.
 *
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @fileoverview App shim script.
 * Runs a script with tracing enabled, dumping a snapshot at the end.
 *
 * @author benvanik@google.com (Ben Vanik)
 */

var fs = require('fs');
var path = require('path');
var vm = require('vm');

// Load WTF binary. Search a few paths.
// TODO(benvanik): look in ENV?
var searchPaths = [
  '.',
  './build-out',
  '../build-out'
];
var wtfPath = null;
for (var n = 0; n < searchPaths.length; n++) {
  var searchPath = path.join(searchPaths[n], 'wtf_trace_node_js_compiled.js');
  if (fs.existsSync(searchPath)) {
    wtfPath = searchPath;
    break;
  }
}
if (!wtfPath) {
  console.log('Unable to find wtf_trace_node_js_compiled.js');
  process.exit(-1);
  return;
}
require(path.join(process.cwd(), wtfPath.replace('.js', '')));

// Load the target script file.
var filename = path.join(process.cwd(), process.argv[2]);
var code = fs.readFileSync(filename, 'utf8');

// Setup process arguments to strip our run script.
// TODO(benvanik): look for -- to split args/etc
var args = process.argv.slice(3);
process.argv = args;
// TODO(benvanik): setup options from command line/etc?
var options = {
  'wtf.trace.session.maximumMemoryUsage': 128 * 1024 * 1024,
  'wtf.trace.mode': 'snapshotting',
  'wtf.trace.target': 'file://' + path.basename(filename, '.js')
};

// Starting the tracing framework.
wtf.trace.node.start(options);

// Execute the user script.
vm.runInThisContext(code, filename);
