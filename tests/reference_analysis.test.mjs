import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cropBounds} from '../web/reference_analysis_graph.mjs';

test('reference contain crop: wide image, reversed edges, fractional pixels and padding',()=>{
 assert.deepEqual(cropBounds(100,100,200,100,{x1:0,y1:0,x2:100,y2:100}),[0,0,200,100]);
 assert.deepEqual(cropBounds(100,100,200,100,{x1:75,y1:60,x2:25,y2:40}),[50,30,150,70]);
 assert.deepEqual(cropBounds(100,100,100,100,{x1:10.1,y1:20.2,x2:30.1,y2:40.1}),[10,20,31,41]);
 assert.throws(()=>cropBounds(100,100,200,100,{x1:0,y1:0,x2:100,y2:20}),/E_CROP_OUTSIDE/);
 assert.throws(()=>cropBounds(100,100,100,100,{x1:true,y1:0,x2:100,y2:100}),/E_CROP_INVALID/);
});
