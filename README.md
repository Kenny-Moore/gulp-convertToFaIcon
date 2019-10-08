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
