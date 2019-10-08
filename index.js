'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var jsdom = require("jsdom");
var JSDOM = jsdom.JSDOM;

var path = require('path');
var svgpath = require('svgpath');

var through = require('through2');
var PluginError = require('plugin-error');

var defaultFaHeight = 512;
var defaultFaFixedWidthRatio = 1.25;

var PLUGIN_NAME = 'gulp-convertToFaIcon';

function gulpConvertToFaIcon(prefix, indexFile) {

  var latestFile;
  var latestMod;
  var fileName;

  var customLibSpecString = 'var prefix = \'' + prefix + '\';\n';
  var customLibCacheIcons = "";
  var customLibCacheString = "";
  var customLibExportIcons = "";
  var customLibExportString = "";
  var baseEnc;
  if (!prefix) {
    throw new PluginError(PLUGIN_NAME, 'Missing fa library prefix!');
  }

  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      this.emit('error', new Error('gulp-concat: Streaming not supported'));
      return cb();
    }
    baseEnc = enc;

    if (!latestMod || file.stat && file.stat.mtime > latestMod) {
      latestFile = file;
      latestMod = file.stat && file.stat.mtime;
    }

    fileName = path.basename(file.path, '.svg');
    var baseIconName = fileName.replace(/(-|_)([A-z])/g, function (g) {
      return g[1].toUpperCase();
    });
    var libIconName = baseIconName.charAt(0).toUpperCase() + baseIconName.slice(1);

    if (libIconName.indexOf(prefix) !== 0) {
      libIconName = prefix + libIconName;
    }

    var iconSpec = { prefix: prefix, iconName: fileName };

    var iconEl = getElement(file.contents);
    var icon = parseIconSpec(iconSpec, iconEl);

    customLibSpecString += '\nvar ' + libIconName + ' = {\n  prefix: \'' + prefix + '\',\n  iconName: \'' + fileName + '\',\n  icon: [ ' + icon[0] + ', ' + icon[1] + ', [], \'\', ' + JSON.stringify(icon[4]) + ' ]\n};\n';
    customLibCacheIcons += ',\n  ' + libIconName + ': ' + libIconName;
    customLibExportIcons += ', ' + libIconName;

    if (indexFile) {
      return cb(null);
    }

    var iconDef = '\n    \'use strict\';\n    Object.defineProperty(exports, \'__esModule\', { value: true });\n    var prefix = "' + prefix + '";\n    var iconName = "' + fileName + '";\n    var width = ' + icon[0] + ';\n    var height = ' + icon[1] + ';\n    var ligatures = [];\n    var unicode = \'\';\n    var svgPathData = ' + JSON.stringify(icon[4]) + ';\n    \n    exports.definition = {\n      prefix: prefix,\n      iconName: iconName,\n      icon: [\n        width,\n        height,\n        ligatures,\n        unicode,\n        svgPathData\n      ]};\n    \n    exports.' + libIconName + ' = exports.definition;\n    exports.prefix = prefix;\n    exports.iconName = iconName;\n    exports.width = width;\n    exports.height = height;\n    exports.ligatures = ligatures;\n    exports.unicode = unicode;\n    exports.svgPathData = svgPathData;\n    ';

    if (file.isBuffer()) {
      file.contents = Buffer.from(iconDef, enc);
      var filePath = path.parse(file.path);
      filePath.ext = ".js";
      filePath.base = "";
      file.path = path.format(filePath);
    }

    return cb(null, file);
  }, function (cb) {
    if (!latestFile || !indexFile) {
      return cb();
    }
    customLibCacheIcons = customLibCacheIcons.charAt(0) === ',' ? customLibCacheIcons.slice(1) : customLibCacheIcons;
    customLibCacheString = '\nvar _iconsCache = {' + customLibCacheIcons + '\n};\n\n';
    customLibExportString = 'export { _iconsCache as ' + prefix + ', prefix' + customLibExportIcons + ' };';

    var joinedFile;

    if (typeof indexFile === 'string') {
      joinedFile = latestFile.clone({ contents: false });
      joinedFile.path = path.join(latestFile.base, indexFile);
      joinedFile.contents = Buffer.from(customLibSpecString + customLibCacheString + customLibExportString, baseEnc);
      this.push(joinedFile);
    }
    return cb();
  });
}

function getElement(iconBuffer) {
  var iconDOM = new JSDOM(iconBuffer);
  var iconEl = iconDOM.window.document.querySelector('svg');
  return iconEl;
}

function parseIconSpec(iconSpec, iconEl) {
  var _icon = void 0;
  var viewBox = iconEl.getAttribute('viewBox').split(' ');
  var width = Number.parseFloat(viewBox[2]);
  var height = Number.parseFloat(viewBox[3]);

  var x = Number.parseFloat(viewBox[0]);
  var y = Number.parseFloat(viewBox[1]);

  var children = parseChildren(iconEl.childNodes);

  iconEl.classes = iconEl.classList;
  iconEl.styles = iconEl.style;

  var params = parseParams(iconEl, {});
  _icon = convertToMergedIcon(children, [width, height, [], "", "", x, y], params, iconSpec);

  return _icon;
}

function parseChildren(children, inherited) {
  if (children && children.length > 0) {
    var parsedChildren = [];
    for (var _iterator = Array.prototype.slice.call(children), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var child = _ref;

      child = child[0] || child;
      if (child.nodeType === 1) {
        var attributes = parseAttributes(child.attributes);
        if (attributes.display !== 'none') {
          if (child.nodeName === 'title' && child.parentElement && child.parentElement.attributes) {
            child.parentElement.attributes.title = child.textContent;
          } else {
            var inheritance = null;
            var classList = child.classList;
            if (inherited) {
              if (inherited.classList.length > 0) {
                classList.add.apply(classList, inherited.classList);
              }
              if ('transform' in inherited.attributes) {
                attributes['transform'] = attributes['transform'] || '';
                attributes['transform'] = inherited.attributes['transform'] + ' ' + attributes['transform'];
              }
            }

            if (child.nodeName === 'g') {
              inheritance = { classList: classList, attributes: attributes };
            }

            var childIcon = {
              tag: child.nodeName,
              attributes: attributes,
              classes: classList,
              styles: {},
              title: '',
              children: parseChildren(child.children, inheritance)
            };
            if (childIcon.attributes && childIcon.attributes.class) {
              childIcon.classes = child.classList;
              delete childIcon.attributes.class;
            }
            if (childIcon.attributes && childIcon.attributes.style) {
              for (var prop in Array.prototype.slice.call(child.style)) {
                childIcon.styles[child.style[prop]] = child.style[child.style[prop]];
              }
              delete childIcon.attributes.style;
            }
            if (childIcon.attributes && childIcon.attributes.title) {
              childIcon.title = childIcon.attributes.title;
              delete childIcon.attributes.title;
            }
            parsedChildren.push(childIcon);
          }
        }
      }
    }
    return parsedChildren;
  }
  return [];
}

function parseAttributes(attributes) {
  if (attributes && attributes.length > 0) {
    var parsedAttributes = {};
    for (var prop in attributes) {
      var attribute = attributes[prop];
      attribute = attribute[0] || attribute;
      if (attribute.value) {
        parsedAttributes[attribute.name] = attribute.value;
      }
    }
    return parsedAttributes;
  }
  return {};
}

function parseParams(element, _ref2) {
  var classes = _ref2.classes,
      title = _ref2.title,
      styles = _ref2.styles,
      symbol = _ref2.symbol,
      transform = _ref2.transform,
      mask = _ref2.mask,
      attributes = _ref2.attributes;

  classes = classes || [];

  classes = [].concat(Array.from(element.classes), classes);
  title = element.title || title;

  styles = _extends(element.styles, styles);
  attributes = _extends(element.attributes, attributes);

  if (attributes && styles) {
    if (styles.fill) {
      attributes.fill = attributes.fill || styles.fill;
      delete styles.fill;
    }
    if (attributes.fill) {
      if (styles) {
        styles.color = attributes.fill;
        if (styles.color === 'none') {
          styles.color = 'transparent';
        }
        if (styles.fill) {
          styles.color = 'transparent';
        }
      }
    }
  }
  var params = { classes: classes, title: title, styles: styles, symbol: symbol, transform: transform, mask: mask, attributes: attributes };
  return params;
}

function normalizeIcon(icon, params) {
  var offsetX = -icon[5] || 0;
  var offsetY = -icon[6] || 0;
  var fixedWidth = false;
  if (params && params.classes && params.classes.indexOf("fa-fw") > -1) {
    fixedWidth = true;
  }

  var faNormalizeScale = defaultFaHeight / icon[1];

  if (fixedWidth) {
    var maxFixedWidth = defaultFaHeight * defaultFaFixedWidthRatio;
    if (icon[0] * faNormalizeScale > maxFixedWidth) {
      faNormalizeScale = maxFixedWidth / icon[0];
      offsetY += (defaultFaHeight / faNormalizeScale - icon[1]) / 2;
    }
  }

  var faNormalizedPath = svgpath(icon[4]);

  if (params && params.attributes) {
    if (params.attributes['stroke']) {
      params.attributes['stroke-width'] = params.attributes['stroke-width'] || 1;
    }
    if (params.attributes['stroke-width']) {
      params.attributes['stroke-width'] = params.attributes['stroke-width'] * faNormalizeScale;
    }
    if (params.attributes['stroke-miterlimit']) {
      params.attributes['stroke-miterlimit'] = params.attributes['stroke-miterlimit'] * faNormalizeScale;
    }
    if (params.attributes['transform']) {
      faNormalizedPath.transform(params.attributes['transform']);
      delete params.attributes['transform'];
    }
  }

  faNormalizedPath.translate(offsetX, offsetY).scale(faNormalizeScale);
  icon[0] = icon[0] * faNormalizeScale;
  icon[1] = defaultFaHeight;
  icon[4] = faNormalizedPath.toString();

  return icon;
}

function getSize(size) {
  var unitRe = /^\s*([+-]?[\d\.]*)\s*(.*)\s*$/i;
  var match = unitRe.exec(size);
  if (match != null && match.length > 2) {
    var bare = match[1] === '';
    var val = bare ? 0 : Number(match[1]);
    var unit = match[2];
    size = val + (unit !== '' ? unit : 'px');
  }

  return size;
}

function mergeIcon(children, base, params, duoPathMap) {
  var faIcon = base.slice(0);
  faIcon[4] = faIcon[4] || '';
  faIcon = normalizeIcon(faIcon, params);
  if (children && children.length > 0) {
    for (var _iterator2 = Array.prototype.slice.call(children), _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
      var _ref3;

      if (_isArray2) {
        if (_i2 >= _iterator2.length) break;
        _ref3 = _iterator2[_i2++];
      } else {
        _i2 = _iterator2.next();
        if (_i2.done) break;
        _ref3 = _i2.value;
      }

      var child = _ref3;

      child = child[0] || child;
      if (child.children && child.children.length > 0) {
        var childIcon = mergeIcon(child.children, base, params, duoPathMap);
        faIcon[4] += " " + childIcon[4];
      } else if (child.tag !== 'g') {
        var _childIcon = base.slice(0);
        _childIcon[4] = convertToPath(child);
        var childParams = parseParams(child, params);
        if (childParams) {
          _childIcon = normalizeIcon(_childIcon, childParams);
          var mapKey = childParams.attributes;
          mapKey.classes = childParams.classes;
          delete mapKey.id;
          mapKey = JSON.stringify(mapKey);
          if (duoPathMap) {
            var duoPath = duoPathMap.get(mapKey) || '';
            if (duoPath && duoPath.length > 0) {
              duoPath += ' ';
            }
            duoPathMap.set(mapKey, duoPath + _childIcon[4]);
          }
        }
        faIcon[4] += " " + _childIcon[4];
      }
    }
  }
  return faIcon;
}

function convertToMergedIcon(children, base, params, iconSpec) {
  var duoPathMap = new Map();
  var icon = mergeIcon(children, base, params, duoPathMap);
  if (duoPathMap.size === 2) {
    icon[4] = Array.from(duoPathMap.values());
  }
  if (duoPathMap.size === 1) {
    icon[4] = Array.from(duoPathMap.values());
    icon[4].push('');
  }
  if (Array.isArray(icon[4]) && params && params.classes && params.classes.indexOf("fa-swap-opacity") > -1) {
    icon[4] = icon[4].reverse();
  }

  if (iconSpec) {
    iconSpec = _extends({}, iconSpec, { icon: icon });
  } else {
    iconSpec = { icon: icon };
  }

  return icon;
}

function convertToPath(element) {
  var vectorData = "";
  if (element && 'attributes' in element) {
    switch (element.tag) {
      case 'path':
        vectorData = element.attributes.d;
        break;
      case 'circle':
        vectorData = convertCE(element.attributes.cx, element.attributes.cy, element.attributes.rx || element.attributes.r);
        break;
      case 'ellipse':
        vectorData = convertCE(element.attributes.cx, element.attributes.cy, element.attributes.rx, element.attributes.ry);
        break;
      case 'polygon':
      case 'polyline':
        vectorData = convertPoly(element.attributes.points, element.tag);
        break;
      case 'line':
        vectorData = convertLine(element.attributes.x1, element.attributes.y1, element.attributes.x2, element.attributes.y2);
        break;
      case 'rect':
        vectorData = convertRectangles(element.attributes.x, element.attributes.y, element.attributes.width, element.attributes.height);
        break;
      default:
        vectorData = "";
    }
    delete element.attributes.d;
    delete element.attributes.cx;
    delete element.attributes.cy;
    delete element.attributes.rx;
    delete element.attributes.ry;
    delete element.attributes.points;
    delete element.attributes.x1;
    delete element.attributes.y1;
    delete element.attributes.x2;
    delete element.attributes.y2;
    delete element.attributes.x;
    delete element.attributes.y;
    delete element.attributes.width;
    delete element.attributes.height;
  }
  return vectorData;
}

function convertRectangles() {
  var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var width = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var height = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

  var x = parseFloat(x, 10);
  var y = parseFloat(y, 10);
  var width = parseFloat(width, 10);
  var height = parseFloat(height, 10);

  if (width < 0 || height < 0) {
    return '';
  }

  return 'M' + x + ',' + y + 'L' + (x + width) + ',' + y + ' ' + (x + width) + ',' + (y + height) + ' ' + x + ',' + (y + height) + 'z';
}

function convertLine() {
  var x1 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var y1 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var x2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var y2 = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

  return 'M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2;
}

function convertPoly(points, types) {
  types = types || 'polyline';

  var pointsArr = points.split('     ').join('').trim().split(/\s+|,/);
  var x0 = pointsArr.shift();
  var y0 = pointsArr.shift();

  var output = 'M' + x0 + ',' + y0 + 'L' + pointsArr.join(' ');

  return types === 'polygon' ? output + 'z' : output;
}

function convertCE() {
  var cx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var cy = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  function calcOuput() {
    var cx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var cy = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var rx = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var ry = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : rx;

    if (rx <= 0 || ry <= 0) {
      return '';
    }

    var output = 'M' + (cx - rx).toString() + ',' + cy.toString();
    output += 'a' + rx.toString() + ',' + ry.toString() + ' 0 1,0 ' + (2 * rx).toString() + ',0';
    output += 'a' + rx.toString() + ',' + ry.toString() + ' 0 1,0' + (-2 * rx).toString() + ',0';

    return output;
  }

  switch (arguments.length) {
    case 3:
      return calcOuput(parseFloat(cx, 10), parseFloat(cy, 10), parseFloat(arguments[2], 10), parseFloat(arguments[2], 10));
    case 4:
      return calcOuput(parseFloat(cx, 10), parseFloat(cy, 10), parseFloat(arguments[2], 10), parseFloat(arguments[3], 10));
      break;
    default:
      return '';
  }
}

module.exports = gulpConvertToFaIcon;