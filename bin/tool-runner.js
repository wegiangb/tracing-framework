#!/usr/bin/env node
/**
 * Copyright 2012 Google, Inc. All Rights Reserved.
 *
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @fileoverview Tool runner script.
 * Used to prepare the node environment and launch tools.
 *
 * @author benvanik@google.com (Ben Vanik)
 */


/**
 * Launches the given tool by name.
 *
 * @param {string} name Full type name of the {@see wtf.tools.Tool} subclass.
 * @return {number} Return code.
 */
exports.launchTool = function(name) {
  // Import Closure Library and deps.js.
  require('../src/wtf/bootstrap/node').importClosureLibrary([
    'wtf_js-deps.js'
  ]);

  var args = process.argv.slice(2);

  // Disable asserts unless debugging - asserts cause all code to deopt.
  // TODO(benvanik): real options parser stuff
  var debugIndex = args.indexOf('--debug');
  if (debugIndex == -1) {
    goog.DEBUG = false;
    goog.require('goog.asserts');
    goog.asserts.assert = function(condition) {
      return condition;
    };
  } else {
    goog.require('goog.asserts');
    goog.asserts.assert = function(condition, opt_message) {
      console.assert(condition, opt_msessage);
      return condition;
    };
    args.splice(debugIndex, 1);
  }

  // Load WTF and configure options.
  goog.require('wtf');
  wtf.NODE = true;
  goog.require('wtf.analysis.exports');

  // Setup platform abstraction layer.
  var platform = createPlatformAbstractionLayer();

  // Load tool by name.
  goog.require(name);
  var type = goog.getObjectByName(name);
  var tool = new type(platform);

  // Execute the tool, potentially async.
  var returnValue = tool.run(args);
  if (goog.isNumber(returnValue)) {
    process.exit(returnValue);
  } else {
    returnValue.addCallbacks(function() {
      process.exit(0);
    }, function(arg) {
      process.exit(arg);
    });
  }
};


function createPlatformAbstractionLayer() {
  goog.require('wtf.util.IPlatform');

  /**
   * @constructor
   * @implements {!wtf.util.IPlatform}
   */
  var NodePlatform = function() {
    goog.base(this);

    /**
     * @type {string}
     * @private
     */
    this.workingDirectory_ = process.cwd();
  };
  goog.inherits(NodePlatform, wtf.util.IPlatform);


  /**
   * @override
   */
  NodePlatform.prototype.getWorkingDirectory = function() {
    return this.workingDirectory_;
  };


  /**
   * @override
   */
  NodePlatform.prototype.readTextFile = function(path) {
    var fs = require('fs');

    try {
      return fs.readFileSync(path, 'utf8');
    } catch (e) {
      return null;
    }
  };


  /**
   * @override
   */
  NodePlatform.prototype.readBinaryFile = function(path) {
    var fs = require('fs');

    var nodeData = null;
    try {
      nodeData = fs.readFileSync(path);
    } catch (e) {
      return null;
    }

    // TODO(benvanik): a better way to convert
    var data = new Uint8Array(nodeData.length);
    for (var n = 0; n < data.length; n++) {
      data[n] = nodeData[n];
    }

    return data;
  };


  /**
   * @override
   */
  NodePlatform.prototype.writeTextFile = function(path, contents) {
    var fs = require('fs');

    fs.writeFileSync(path, contents, 'utf8');
  };


  /**
   * @override
   */
  NodePlatform.prototype.writeBinaryFile = function(path, contents) {
    var fs = require('fs');

    // TODO(benvanik): a better way to convert
    var nodeData = new Buffer(contents.length);
    for (var n = 0; n < nodeData.length; n++) {
      nodeData[n] = contents[n];
    }

    fs.writeFileSync(path, nodeData);
  };

  return new NodePlatform();
};