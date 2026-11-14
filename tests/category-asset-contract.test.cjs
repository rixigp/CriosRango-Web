'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),theme=path.join(root,'theme/crios-rango-2026');
const main=fs.readFileSync(path.join(theme,'assets/css/main.css'),'utf8');
const directory=path.join(theme,'assets/images/categories');
const knownGood={"category_bautizo.png":"df956693c79dc811e4d85cfc043fea263630b8a4","category_bebe_nina.png":"39eb345224472a976609d2b5eb3e852606d0ad09","category_bebe_nino.png":"fb8c16996625b3ca2b3384d2821c84b1da89a2d6","category_calzado.png":"04b4df0a99b062a06f547ffbe27859c89855eb2e","category_comunion_nina.png":"2ae0cfa5745b4282803be5d1ef6b6a2b17b6b109","category_comunion_nino.png":"676dbe9c28db3912ae41455508578ad79c3a4ebf","category_hombre.png":"754138c3c46d732873752ab29ff84a34e7cf0562","category_mujer.png":"5df5a6beae502df37c75876d4565f1f1bb3ba0ee","category_nina.png":"9b372b34087c524fe681843108edd86d05aef91a","category_nino.png":"dc670ce632b1434d4ae5c9d09cdc161127db7762","category_outlet.png":"57155f1966131dfbb2e128038f458992c7619adf","category_recien_nacido.png":"1f7002bb697ea3e8fb33d8fe8b4538d59359c182"};
const gitBlobSha=buffer=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+buffer.length+'\0'),buffer])).digest('hex');

test('CATEGORY_ASSETS_MATCH_KNOWN_GOOD_1808=YES',()=>{
  const names=fs.readdirSync(directory).filter(name=>name.toLowerCase().endsWith('.png')).sort();
  assert.deepEqual(names,Object.keys(knownGood).sort());
  for(const [name,sha] of Object.entries(knownGood)) assert.equal(gitBlobSha(fs.readFileSync(path.join(directory,name))),sha,name+' must remain byte-for-byte identical to '+sha);
});
test('CATEGORY_GRID_GEOMETRY_PRESERVED=YES; CATEGORY_TOOLBAR_INDEPENDENT_FROM_GRID=YES; OUTLET_UNCHANGED=YES',()=>{
  assert.ok(main.includes('.cr-category-hub__shell { width:100%; }'),'known-good full-width category shell');
  assert.match(main,/\.cr-category-hub__grid\s*\{[\s\S]*?max-width:\s*1080px/);
  assert.match(main,/\.cr-category-hub__grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(main,/\.cr-category-hub__grid \.cr-app-category__media/);
  assert.match(main,/\.cr-category-hub__grid \.cr-app-category__image/);
  assert.match(main,/\.cr-parent-category__toolbar\s*\{\s*width:\s*100%/);
  assert.doesNotMatch(main,/\.cr-category-hub__grid[^}]*transform\s*:/);
});
