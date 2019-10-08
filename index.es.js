const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const path = require('path');
const svgpath = require('svgpath');

//const svgpath = svgpathimport.svgpath;
const defaultFaHeight = 512;
const defaultFaFixedWidthRatio = 1.25;

// through2 is a thin wrapper around node transform streams
var through = require('through2');
var PluginError = require('plugin-error');

// Consts
const PLUGIN_NAME = 'gulp-convertToFaIcon';

// Plugin level function(dealing with files)
function gulpConvertToFaIcon(prefix, indexFile) {

  var latestFile;
  var latestMod;
  var fileName;

  var customLibSpecString = `var prefix = '${prefix}';\n`;
  var customLibCacheIcons = "";
  var customLibCacheString = "";
  var customLibExportIcons = "";
  var customLibExportString = "";
  var baseEnc;
  if (!prefix) {
    throw new PluginError(PLUGIN_NAME, 'Missing fa library prefix!');
  }

  // Creating a stream through which each file will pass
  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      this.emit('error', new Error('gulp-concat: Streaming not supported'));
      return cb();
    }
    baseEnc = enc;
    // set latest file if not already set,
    // or if the current file was modified more recently.
    if (!latestMod || file.stat && file.stat.mtime > latestMod) {
      latestFile = file;
      latestMod = file.stat && file.stat.mtime;
    }

    fileName = path.basename(file.path, '.svg');
    let baseIconName = fileName.replace(/(-|_)([A-z])/g, (g) => g[1].toUpperCase());
    let libIconName = baseIconName.charAt(0).toUpperCase() + baseIconName.slice(1);
    
    if (libIconName.indexOf(prefix) !== 0) {
      libIconName = prefix + libIconName;
    }
    
    let iconSpec = { prefix: prefix, iconName: fileName };

    let iconEl = getElement(file.contents);
    let icon = parseIconSpec(iconSpec, iconEl);

    customLibSpecString += 
    `
var ${libIconName} = {
  prefix: '${prefix}',
  iconName: '${fileName}',
  icon: [ ${icon[0]}, ${icon[1]}, [], '', ${JSON.stringify(icon[4])} ]
};\n`
    customLibCacheIcons += `,\n  ${libIconName}: ${libIconName}`;
    customLibExportIcons += `, ${libIconName}`;

    if (indexFile) {
      return cb(null);
    }

    let iconDef = `
    'use strict';
    Object.defineProperty(exports, '__esModule', { value: true });
    var prefix = "${prefix}";
    var iconName = "${fileName}";
    var width = ${icon[0]};
    var height = ${icon[1]};
    var ligatures = [];
    var unicode = '';
    var svgPathData = ${JSON.stringify(icon[4])};
    
    exports.definition = {
      prefix: prefix,
      iconName: iconName,
      icon: [
        width,
        height,
        ligatures,
        unicode,
        svgPathData
      ]};
    
    exports.${libIconName} = exports.definition;
    exports.prefix = prefix;
    exports.iconName = iconName;
    exports.width = width;
    exports.height = height;
    exports.ligatures = ligatures;
    exports.unicode = unicode;
    exports.svgPathData = svgPathData;
    `;

    if (file.isBuffer()) {
      file.contents = Buffer.from(iconDef, enc);
      let filePath = path.parse(file.path);
      filePath.ext = ".js";
      filePath.base = "";
      file.path = path.format(filePath);
    }

    return cb(null, file);

  }, function (cb) {
    // no files passed in, no file goes out
    if (!latestFile || !indexFile) {
      return cb();      
    }
    customLibCacheIcons = customLibCacheIcons.charAt(0) === ',' ? customLibCacheIcons.slice(1) : customLibCacheIcons; //remove first comma
    customLibCacheString = `\nvar _iconsCache = {${customLibCacheIcons}\n};\n\n`;
    customLibExportString = `export { _iconsCache as ${prefix}, prefix${customLibExportIcons} };`;

    
    var joinedFile;
    // if file opt was a file path
    // clone everything from the latest file
    if (typeof indexFile === 'string') {
      joinedFile = latestFile.clone({contents: false});
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
  let _icon;
  let viewBox = iconEl.getAttribute('viewBox').split(' ');
  let width = Number.parseFloat(viewBox[2]);
  let height = Number.parseFloat(viewBox[3]);

  let x = Number.parseFloat(viewBox[0]);
  let y = Number.parseFloat(viewBox[1]);

  let children = parseChildren(iconEl.childNodes);
  
  iconEl.classes = iconEl.classList;
  iconEl.styles = iconEl.style;

  let params = parseParams(iconEl, {});
  _icon = convertToMergedIcon(children, [width, height, [], "", "", x, y], params, iconSpec);

  return _icon;
}

function parseChildren(children, inherited) {
  if (children && children.length > 0) {
    let parsedChildren = [];
    for (let child of Array.prototype.slice.call(children)) {
      child = child[0] || child;
      if (child.nodeType === 1) {
        let attributes = parseAttributes(child.attributes);
        if (attributes.display !== 'none') {
          if (child.nodeName === 'title' && child.parentElement && child.parentElement.attributes) {
            child.parentElement.attributes.title = child.textContent;
          } else {
            let inheritance = null;
            let classList = child.classList;
            if (inherited) {
              if (inherited.classList.length > 0) {
                classList.add(...inherited.classList);
              }
              if ('transform' in inherited.attributes) {
                attributes['transform'] = attributes['transform'] || '';
                attributes['transform'] = inherited.attributes['transform'] + ' ' + attributes['transform'];
              }
            }

            if (child.nodeName === 'g') {
              inheritance = { classList, attributes };
            }

            let childIcon = {
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
              for (let prop in Array.prototype.slice.call(child.style)) {
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
    return parsedChildren
  }
  return [];
}

function parseAttributes(attributes) {
  if (attributes && attributes.length > 0) {
    let parsedAttributes = {};
    for (let prop in attributes) {
      let attribute = attributes[prop];
      attribute = attribute[0] || attribute;
      if (attribute.value) {
        parsedAttributes[attribute.name] = attribute.value;
      }
    }
    return parsedAttributes
  }
  return {};
}

function parseParams(element, { classes, title, styles, symbol, transform, mask, attributes }) {
  classes = classes || [];
  
  classes = [...Array.from(element.classes), ...classes];
  title = element.title || title;

  styles = Object.assign(element.styles, styles);
  attributes = Object.assign(element.attributes, attributes);

  if (attributes && styles) {
    if (styles.fill) {
      attributes.fill = attributes.fill || styles.fill;
      delete styles.fill;
    }
    if (attributes.fill) {
      //font-awesome forces fill to be currentcolor, 
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
  let params = { classes, title, styles, symbol, transform, mask, attributes };
  return params;
}

function normalizeIcon(icon, params) {
  let offsetX = -icon[5] || 0;
  let offsetY = -icon[6] || 0;
  let fixedWidth = false;
  if (params && params.classes && params.classes.indexOf("fa-fw") > -1) {
    fixedWidth = true;
  }

  let faNormalizeScale = defaultFaHeight / icon[1];

  if (fixedWidth) {
    let maxFixedWidth = defaultFaHeight * defaultFaFixedWidthRatio;
    if ((icon[0] * faNormalizeScale) > maxFixedWidth) {
      faNormalizeScale = maxFixedWidth / icon[0];
      offsetY += ((defaultFaHeight / faNormalizeScale) - icon[1]) / 2;
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

  faNormalizedPath.translate(offsetX, offsetY)
    .scale(faNormalizeScale);
  icon[0] = icon[0] * faNormalizeScale;
  icon[1] = defaultFaHeight;
  icon[4] = faNormalizedPath.toString(); //serialize(faNormalizedPath);

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
  let faIcon = base.slice(0);
  faIcon[4] = faIcon[4] || '';
  faIcon = normalizeIcon(faIcon, params);
  if (children && children.length > 0) {
    for (let child of Array.prototype.slice.call(children)) {
      child = child[0] || child;
      if (child.children && child.children.length > 0) {
        let childIcon = mergeIcon(child.children, base, params, duoPathMap);
        faIcon[4] += " " + childIcon[4];
      } else if (child.tag !== 'g') {
        let childIcon = base.slice(0);
        childIcon[4] = convertToPath(child);
        let childParams = parseParams(child, params);
        if (childParams) {
          childIcon = normalizeIcon(childIcon, childParams);
          let mapKey = childParams.attributes;
          mapKey.classes = childParams.classes;
          delete mapKey.id;
          mapKey = JSON.stringify(mapKey);
          if (duoPathMap) {
            let duoPath = duoPathMap.get(mapKey) || '';
            if (duoPath && duoPath.length > 0) {
              duoPath += ' ';
            }
            duoPathMap.set(mapKey, duoPath + childIcon[4]);
          }
        }
        faIcon[4] += " " + childIcon[4];
      }
    }
  }
  return faIcon;
}

function convertToMergedIcon(children, base, params, iconSpec) {
  let duoPathMap = new Map();
  let icon = mergeIcon(children, base, params, duoPathMap);
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
    iconSpec = Object.assign({}, iconSpec, { icon: icon });
  } else {
    iconSpec = { icon: icon };
  }

  return icon;
}

function convertToFaIcon(element, base, params) {
  let faIcon = base.slice(0);
  if (element.tag === 'icon') {
    let { icon: icon } = element.icon;
    faIcon = icon;
  } else {
    faIcon[4] = convertToPath(element);
    faIcon = normalizeIcon(faIcon, params);
  }
  return faIcon;

}

function convertToPath(element) {
  let vectorData = "";
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
      // code block
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

function convertRectangles(x = 0, y = 0, width = 0, height = 0) {
  var x = parseFloat(x, 10);
  var y = parseFloat(y, 10);
  var width = parseFloat(width, 10);
  var height = parseFloat(height, 10);

  if (width < 0 || height < 0) {
    return '';
  }

  return 'M' + x + ',' + y + 'L' + (x + width) + ',' + y + ' ' + (x + width) + ',' + (y + height) + ' ' + x + ',' + (y + height) + 'z';
}

function convertLine(x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
  return 'M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2;
}

/** pass the value of the attribute `points` into this function */
function convertPoly(points, types) {
  types = types || 'polyline';

  var pointsArr = points
    /** clear redundant characters */
    .split('     ').join('')
    .trim()
    .split(/\s+|,/);
  var x0 = pointsArr.shift();
  var y0 = pointsArr.shift();

  var output = 'M' + x0 + ',' + y0 + 'L' + pointsArr.join(' ');

  return types === 'polygon' ? output + 'z' : output;
}

function convertCE(cx = 0, cy = 0) {
  function calcOuput(cx = 0, cy = 0, rx = 0, ry = rx) {
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

function compileContentInstruction(compiler, resources, node, instruction) {
  let fragment = document.createDocumentFragment();
  //TODO: consider adding a div to wrap the user content so it's easier to hide/show

  while (node.firstChild) {
    fragment.appendChild(node.firstChild); //copy the content of your element into a fragment
  }

  instruction.contentFactory = compiler.compile(fragment, resources); //compile the fragment
}


// Exporting the plugin main function
module.exports = gulpConvertToFaIcon;
