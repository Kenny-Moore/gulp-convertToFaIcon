## Information

<table>
<tr> 
<td>Package</td><td>gulp-convertToFaIcon</td>
</tr>
<tr>
<td>Description</td>
<td>This is a tool for converting svg files into font awesome 5 icon definitions</td>
</tr>
<tr>
<td>Node Version</td>
<td>>= 0.10</td>
</tr>
</table>

Convert This:

```html
<svg data-icon="expand-all" class="fa-fw" role="img" xmlns="http://www.w3.org/2000/svg" 
	 x="0px" y="0px" viewBox="0 0 24 24">
  <path style="fill:#F44336;" d="M7,4l5,5l5-5H7z"/>
  <path style="fill:#F44336;" d="M17,20l-5-5l-5,5H17z"/>
  <rect x="3" y="11" style="fill:#212121;" width="18" height="2"/>
</svg>
```

into 

```js
var prefix = "custom";
var iconName = "expand-all";
var width = 512;
var height = 512;
var ligatures = [];
var unicode = '';
var svgPathData = ["M149.33333333333331 362.66666666666663l106.66666666666666 106.66666666666666 106.66666666666666-106.66666666666666H149.33333333333331z M362.66666666666663 149.33333333333331l-106.66666666666666-106.66666666666666L149.33333333333331 149.33333333333331H362.66666666666663z","M64 277.3333333333333L448 277.3333333333333 448 320 64 320z M64 192L448 192 448 234.66666666666666 64 234.66666666666666z"];

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

exports.customExpandAll = exports.definition;
exports.prefix = prefix;
exports.iconName = iconName;
exports.width = width;
exports.height = height;
exports.ligatures = ligatures;
exports.unicode = unicode;
exports.svgPathData = svgPathData;
```

or multiple SVGs into a library:

```js
var prefix = 'custom';

var customCollapseAll = {
  prefix: 'custom',
  iconName: 'collapse-all',
  icon: [ 512, 512, [], '', ["M149.33333333333331 85.33333333333333l106.66666666666666 106.66666666666666 106.66666666666666-106.66666666666666H149.33333333333331z M362.66666666666663 426.66666666666663l-106.66666666666666-106.66666666666666-106.66666666666666 106.66666666666666H362.66666666666663z","M64 234.66666666666666L448 234.66666666666666 448 277.3333333333333 64 277.3333333333333z"] ]
};

var customExpandAll = {
  prefix: 'custom',
  iconName: 'expand-all',
  icon: [ 512, 512, [], '', ["M149.33333333333331 362.66666666666663l106.66666666666666 106.66666666666666 106.66666666666666-106.66666666666666H149.33333333333331z M362.66666666666663 149.33333333333331l-106.66666666666666-106.66666666666666L149.33333333333331 149.33333333333331H362.66666666666663z","M64 277.3333333333333L448 277.3333333333333 448 320 64 320z M64 192L448 192 448 234.66666666666666 64 234.66666666666666z"] ]
};

var _iconsCache = {
  customCollapseAll: customCollapseAll,
  customExpandAll: customExpandAll
};

export { _iconsCache as custom, prefix, customCollapseAll, customExpandAll };
```

to use like this:

```js
import * as fontawesome from  '@fortawesome/fontawesome-svg-core';
import custom from  'icons/library';

fontawesome.library.add(custom);

```

## Usage
> THIS IS A WORKING POC, USE AT YOUR OWN RISK

`gulpConvertToFaIcon(<string>[prefix][, <string>[roll up lib to path]])`

You can create an icon def file for each svg:
```js
const gulp = require('gulp');
const gulpConvertToFaIcon = require('gulp-convertToFaIcon');

gulp.task('default', () =>
	gulp.src('src/icons/**/*.svg')
		.pipe(gulpConvertToFaIcon('faCustom'))
		.pipe(gulp.dest('dist'));
);
```

or roll up svg files into a single library def:
```js
const gulp = require('gulp');
const gulpConvertToFaIcon = require('gulp-convertToFaIcon');

gulp.task('default', () =>
	gulp.src('src/icons/**/*.svg')
		.pipe(gulpConvertToFaIcon('faCustom', 'src/icons/libindex.js'))
		.pipe(gulp.dest('dist'));
);
```
