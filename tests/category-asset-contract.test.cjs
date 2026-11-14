'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),theme=path.join(root,'theme/crios-rango-2026');
const main=fs.readFileSync(path.join(theme,'assets/css/main.css'),'utf8');
const directory=path.join(theme,'assets/images/categories');
test('CATEGORY_MEDIA_GEOMETRY=OUTLET_MEDIA_GEOMETRY; CATEGORY_CSS_SCALE_HACK=NO',()=>{
  const media=main.slice(main.indexOf('body.cr-parent-category-view .cr-parent-category__media,'),main.indexOf('body.cr-parent-category-view .cr-parent-category__placeholder'));
  assert.match(media,/aspect-ratio:\s*1\s*\/\s*1/);
  assert.match(media,/display:\s*grid/);
  assert.match(media,/place-items:\s*center/);
  assert.match(media,/overflow:\s*hidden/);
  const image=main.slice(main.indexOf('body.cr-parent-category-view .cr-parent-category__media img,'),main.indexOf('body.cr-parent-category-view .cr-parent-category__placeholder'));
  assert.match(image,/width:\s*100%/); assert.match(image,/height:\s*100%/);
  assert.match(image,/object-fit:\s*contain/); assert.match(image,/object-position:\s*center/);
  assert.match(image,/transform:\s*none/);
  assert.doesNotMatch(image,/scale\s*\(/);
});
test('CATEGORY_ASSET_SET=12_PNGS',()=>{
  const names=fs.readdirSync(directory).filter(name=>name.toLowerCase().endsWith('.png')).sort();
  assert.deepEqual(names,[
    'category_bautizo.png','category_bebe_nina.png','category_bebe_nino.png','category_calzado.png',
    'category_comunion_nina.png','category_comunion_nino.png','category_hombre.png','category_mujer.png',
    'category_nina.png','category_nino.png','category_outlet.png','category_recien_nacido.png'
  ]);
});
