import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
const compiled=buildSync({entryPoints:[new URL('../src/lib/inquiry-context.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const module={exports:{}};new Function('module','exports','require',compiled)(module,module.exports,createRequire(import.meta.url));
const {inquiryDetails,inquiryRoleFromSearch,InquiryContextError}=module.exports;

test('optional context keeps a plain brief unchanged',()=>{
 assert.equal(inquiryDetails({details:'  Prepare an existing rental.  '}),'Prepare an existing rental.');
 assert.equal(inquiryDetails({details:'Scope',company:'Example',goal:'Rental'}),'Company / ownership entity: Example\nProject goal: Rental\n\nScope');
});
test('investor and broker links prefill only the intended role',()=>{
 assert.equal(inquiryRoleFromSearch('?context=investor'),'Investor / owner');
 assert.equal(inquiryRoleFromSearch('?context=broker'),'Broker / agent');
 for(const search of ['', '?context=unknown', '?context=%3Cscript%3E', '?type=Duplex'])assert.equal(inquiryRoleFromSearch(search),'');
});
test('broker context retains all optional fields as labelled plain text',()=>{
 const details=inquiryDetails({contactRole:'Broker / agent',company:'Example owner',brokerage:'Example brokerage',acquisitionStage:'Under contract',listingUrl:'https://example.test/listing?a=1&b=2',goal:'Rehab for resale',details:'Confirm the scope.'});
 for(const line of ['Your role: Broker / agent','Company / ownership entity: Example owner','Brokerage: Example brokerage','Acquisition stage: Under contract','Property / listing link: https://example.test/listing?a=1&b=2','Project goal: Rehab for resale','Confirm the scope.'])assert.ok(details.includes(line));
});
test('leaving broker mode omits the hidden brokerage value',()=>{
 assert.equal(inquiryDetails({contactRole:'Investor / owner',brokerage:'Previous brokerage',details:'Scope'}),'Your role: Investor / owner\n\nScope');
});
test('listing links reject executable schemes, incomplete URLs and embedded login details',()=>{
 for(const listingUrl of ['javascript:alert(1)','data:text/plain,example','file:///tmp/file','example.test/listing','https://user:pass@example.test/listing','https://example.test/'+ 'a'.repeat(600)])assert.throws(()=>inquiryDetails({listingUrl,details:'Scope'}),e=>e instanceof InquiryContextError&&e.field==='listingUrl');
 for(const listingUrl of ['http://example.test/listing','https://example.test/listing'])assert.ok(inquiryDetails({listingUrl,details:'Scope'}).includes(listingUrl));
});
test('complete brief size is bounded without silent truncation',()=>{
 const prefix=inquiryDetails({contactRole:'Investor / owner',details:'x'}).length-1;
 assert.equal(inquiryDetails({contactRole:'Investor / owner',details:'A'.repeat(5000-prefix)}).length,5000);
 assert.throws(()=>inquiryDetails({contactRole:'Investor / owner',details:'A'.repeat(5001-prefix)}),e=>e.field==='details'&&e.message.includes('1 characters'));
});
test('context labels cannot be forged with embedded newlines; unsupported choices fail',()=>{
 assert.match(inquiryDetails({company:'Example\nForged label: value',details:'Scope'}),/^Company \/ ownership entity: Example Forged label: value\n\nScope$/);
 assert.throws(()=>inquiryDetails({contactRole:'Unknown',details:'Scope'}),e=>e.field==='contactRole');
 assert.throws(()=>inquiryDetails({acquisitionStage:'Unknown',details:'Scope'}),e=>e.field==='acquisitionStage');
});
