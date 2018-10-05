// rdotswift.js

exports.format = format;

var Identifier = require("./src/ATS/Identifier");
var TokenKinds = require("./src/Syntax/TokenKinds");

var CLASS = "class";
var IF = "if";
var TYPES = ["array", "bool", "color", "dimen", "integer", "string"];
var MAX_COMMENT_LENGTH = 64;

/**
 * generates Swift source code
 *
 * @param R {Object}
 * @param [options] {Object}
 * @returns {String}
 */

function format(R, options) {
  if (!options) options = {};
  var out = [];
  var header = (options.header !== false);

  if (header) {
    out.push("// Generated by rdotswift <https://github.com/kawanet/rdotswift>");
    out.push("");
  }

  if (options[IF]) {
    out.push("#if " + options[IF]);
    out.push("");
  }

  if (header) {
    if (options.appkit) {
      out.push("import AppKit");
    } else {
      out.push("import UIKit");
    }
    out.push("");
  }

  if (!options.extension) {
    var className = options[CLASS] || "R";
    out.push("final class " + className + " {");
    TYPES.map(function(type, idx) {
      if (idx) out.push("");
      out.push("    final class " + type + " {");
      out.push("    }");
    });
    out.push("}");
    out.push("");
  }

  if (options.source) {
    out.push("// " + options.source);
    out.push("");
  }

  out = out.concat(array(R.array, options));
  out = out.concat(bool(R.bool, options));
  out = out.concat(color(R.color, options));
  out = out.concat(dimen(R.dimen, options));
  out = out.concat(integer(R.integer, options));
  out = out.concat(string(R.string, options));

  if (options.endif || (options[IF] && options.endif !== false)) {
    out.push("#endif");
    out.push("");
  }

  return out.join("\n");
}

function integer(src, options) {
  var rows = [];
  for (var key in src) {
    var val = src[key];
    rows.push(comment(val));
    var row = prefix(key) + " = " + val;
    rows.push(row);
  }
  return extension("integer", rows, options);
}

function array(src, options) {
  var rows = [];
  for (var key in src) {
    var val = src[key];
    rows.push(comment(val));
    val = JSON.stringify(val);
    var row = prefix(key) + " = " + val;
    rows.push(row);
  }
  return extension("array", rows, options);
}

function string(src, options) {
  var rows = [];
  for (var key in src) {
    var val = src[key];
    rows.push(comment(val));
    val = JSON.stringify(val + "").replace(/\\\\/g, "\\");
    var row = prefix(key) + " = " + val;
    rows.push(row);
  }
  return extension("string", rows, options);
}

function color(src, options) {
  var rows = [];
  var uicolor = options.appkit ? "NSColor" : "UIColor";
  for (var key in src) {
    var val = src[key];
    if (!val) return;
    rows.push(comment(val));
    var row = prefix(key) + " = ";
    val += "";

    // #RGB -> #RRGGBB
    // #ARGB -> #AARRGGBB
    if (val.search(/^#[0-9A-Fa-f]{3,4}$/) === 0) {
      val = val.split("").map(function(c) {
        return c + c;
      }).join("").substr(1);
    }

    if (val.match(/^#[0-9A-Fa-f]{6,8}$/)) {
      var rgb = parseInt(val.substr(1), 16);
      var blue = rgb & 0xFF;
      rgb >>= 8;
      var green = rgb & 0xFF;
      rgb >>= 8;
      var red = rgb & 0xFF;
      rgb >>= 8;
      var alpha = (val.length === 9) ? (rgb & 0xFF) : 255;
      row += uicolor + "(red: " + c(red) + ", green: " + c(green) + ", blue:" + c(blue) + ", alpha: " + c(alpha) + ")";
    } else {
      row += JSON.stringify(val);
    }
    rows.push(row);
  }
  return extension("color", rows, options);

  function c(val) {
    return Math.round(val / 255 * 1000) / 1000;
  }
}

function dimen(src, options) {
  var rows = [];
  for (var key in src) {
    var val = src[key];
    if (!val) return;
    rows.push(comment(val));
    var row = prefix(key) + ": CGFloat = " + parseFloat(val);
    rows.push(row);
  }
  return extension("dimen", rows, options);
}

function bool(src, options) {
  var rows = [];
  for (var key in src) {
    var val = src[key];
    rows.push(comment(val));
    var row = prefix(key) + " = " + val;
    rows.push(row);
  }
  return extension("bool", rows, options);
}

function extension(type, rows, options) {
  if (rows.length) {
    var className = options[CLASS] || "R";
    className += "." + type;
    rows.unshift("extension " + className + " {");
    rows.push("}");
    rows.push("");
  }
  return rows;
}

function comment(val) {
  if (val === "") val = "(empty)";
  val += "";
  val = val.replace(/\r/g, "\\r");
  val = val.replace(/\n/g, "\\n");
  val = val.replace(/\t/g, "\\t");
  val = val.replace(/\s+/g, " ");
  if (val.length > MAX_COMMENT_LENGTH) {
    val = val.substr(0, MAX_COMMENT_LENGTH) + "...";
  }
  return "    /// " + val;
}

function prefix(key) {
  key = key.replace(Identifier.isOperatorStartCodePoint, "_");
  key = key.replace(Identifier.isOperatorContinuationCodePoint, "_");

  if (TokenKinds[key]) {
    key = "`" + key + "`";
  }
  return "    static let " + key;
}
