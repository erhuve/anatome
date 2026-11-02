/** Convert pinned Z-Anatomy sources without anatomical decimation or pose edits. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
const root = new URL('../', import.meta.url), research = new URL('../../research-assets/', import.meta.url);
const commit = '6c7f9016bd5899ac8edafd31b9900c151df42ed6';
const sourceUrl = `https://github.com/LluisV/Z-Anatomy/blob/${commit}/Resources/Models/FBX/MuscularSystem100.fbx`;
const sourceBytes = await readFile(new URL('MuscularSystem100.fbx', research));
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
const model = new FBXLoader().parse(sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength), '');
model.updateMatrixWorld(true);
const previous = {muscles:{parts:JSON.parse(await readFile(new URL('source-muscle-aliases.json', import.meta.url), 'utf8'))}};
const report = JSON.parse(await readFile(new URL('public/models/systems.json', root), 'utf8'));
const keep = name => name.startsWith('Tensor_fasciae_latae') || !/bursa|bursae|tendon|tendinous|retinaculum|fascia|tract|ligament|aponeurosis|tarsus|Cross_Section|Linea_alba|septum|arch|sheath|Trochlea/i.test(name);
const sideOf = name => /\bleft\b|\.l$/.test(name.toLowerCase()) ? 'left' : /\bright\b|\.r$/.test(name.toLowerCase()) ? 'right' : 'midline';
const canonical = name => name.toLowerCase().replace(/\.([lr])$/, (_, s) => s === 'l' ? ' left' : ' right').replace(/[()_]/g, ' ').replace(/\b(?:left|right|muscles?)\b/g, '').replace(/scapular spinal/g, 'spinal').replace(/clavicular head of pectoralis/g, 'clavicular part of pectoralis').replace(/sternocostal head of pectoralis/g, 'sternocostal part of pectoralis').replace(/external abdominal oblique/g, 'external oblique').replace(/\s+/g, ' ').trim();
const human = name => {
 const side = sideOf(name); const base = name.replace(/\.[lr]$/, '').replace(/\bmuscle\b/gi, '').replace(/[()_]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^Bucinator$/i, 'Buccinator');
 return side === 'midline' ? base[0].toUpperCase() + base.slice(1) : side[0].toUpperCase() + side.slice(1) + ' ' + base[0].toLowerCase() + base.slice(1);
};
await MeshoptEncoder.ready;
const chunks=[];let binLength=0,fallbackLength=0;
const g={asset:{version:'2.0',generator:'Anatomeme pinned Z-Anatomy FBX converter'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],accessors:[],bufferViews:[],materials:[{name:'Muscle',pbrMetallicRoughness:{baseColorFactor:[.58,.25,.21,1],metallicFactor:0,roughnessFactor:.8}}],extensionsUsed:['EXT_meshopt_compression'],extensionsRequired:['EXT_meshopt_compression']};
function stream(array, stride, type, count, mode, min, max) {
 const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);const encoded=MeshoptEncoder.encodeGltfBuffer(bytes,count,stride,mode);
 const pad=(-binLength)&3;if(pad){chunks.push(Buffer.alloc(pad));binLength+=pad;}
 const offset=binLength;chunks.push(Buffer.from(encoded));binLength+=encoded.length;
 const view=g.bufferViews.length;
 g.bufferViews.push({buffer:1,byteOffset:fallbackLength,byteLength:bytes.length,...(mode==='ATTRIBUTES'?{byteStride:stride,target:34962}:{target:34963}),extensions:{EXT_meshopt_compression:{buffer:0,byteOffset:offset,byteLength:encoded.length,byteStride:stride,count,mode}}});fallbackLength+=bytes.length;fallbackLength=(fallbackLength+3)&~3;
 const accessor=g.accessors.length;g.accessors.push({bufferView:view,componentType:type,count,type:mode==='ATTRIBUTES'?'VEC3':'SCALAR',...(min?{min,max}:{})});return accessor;
}
const parts=[];let reversed=0,aliases=0;
model.traverse(o=>{
 if(!(o instanceof THREE.Mesh)||!keep(o.name))return;
 const originalName=o.userData.originalName||o.name;const side=sideOf(originalName);
 const matches=previous.muscles.parts.filter(p=>sideOf(p.name)===side&&canonical(p.name)===canonical(originalName));
 const alias=matches.length===1?matches[0]:undefined;if(alias)aliases++;
 const id=alias?.id||`ZA_M_${o.ID}`;const name=alias?.name||human(originalName);const sourceId=`FBX:${o.ID}`;
 const attr=o.geometry.getAttribute('position'),normalAttr=o.geometry.getAttribute('normal'),index=o.geometry.index;
 const basis=new THREE.Matrix4().set(10,0,0,0, 0,0,-10,0, 0,10,0,0, 0,0,0,1).multiply(o.matrixWorld);
 const normalMatrix=new THREE.Matrix3().getNormalMatrix(basis);
 const position=new Float32Array(attr.count*3),normals=new Float32Array(attr.count*3);const v=new THREE.Vector3();
 for(let i=0;i<attr.count;i++){
  v.fromBufferAttribute(attr,i).applyMatrix4(basis);position.set(v.toArray(),i*3);
  v.fromBufferAttribute(normalAttr,i).applyMatrix3(normalMatrix).normalize();normals.set(v.toArray(),i*3);
 }
 let indices=new Uint32Array(index?Array.from(index.array):Array.from({length:attr.count},(_,i)=>i));
 let volume=0;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<indices.length;i+=3){a.fromArray(position,indices[i]*3);b.fromArray(position,indices[i+1]*3);c.fromArray(position,indices[i+2]*3);volume+=a.dot(b.cross(c));}
 const flipped=volume<0;if(flipped){reversed++;for(let i=0;i<indices.length;i+=3){const k=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=k;}}
 let agreement=0,samples=0;const faceNormal=new THREE.Vector3(),sampleNormal=new THREE.Vector3();
 for(let i=0;i<indices.length;i+=Math.max(3,Math.floor(indices.length/600)*3)){a.fromArray(position,indices[i]*3);b.fromArray(position,indices[i+1]*3);c.fromArray(position,indices[i+2]*3);faceNormal.copy(b).sub(a).cross(c.sub(a));if(faceNormal.lengthSq()>1e-12){sampleNormal.fromArray(normals,indices[i]*3);agreement+=faceNormal.normalize().dot(sampleNormal);samples++;}}
 const normalFlipped=agreement<0;if(normalFlipped)for(let i=0;i<normals.length;i++)normals[i]*=-1;
 // Exact float32 indexing: no vertex quantisation, merging only identical attributes.
 const pbits=new Uint32Array(position.buffer),nbits=new Uint32Array(normals.buffer);const map=new Map(),uniqueP=[],uniqueN=[],outIndices=new Uint32Array(indices.length);
 for(let j=0;j<indices.length;j++){
  const i=indices[j],k=i*3;const key=`${pbits[k]},${pbits[k+1]},${pbits[k+2]},${nbits[k]},${nbits[k+1]},${nbits[k+2]}`;
  let dst=map.get(key);if(dst===undefined){dst=uniqueP.length/3;map.set(key,dst);uniqueP.push(position[k],position[k+1],position[k+2]);uniqueN.push(normals[k],normals[k+1],normals[k+2]);}outIndices[j]=dst;
 }
 const [remap,count]=MeshoptEncoder.reorderMesh(outIndices,true,true);const pv=new Float32Array(count*3),nv=new Float32Array(count*3);
 for(let i=0;i<uniqueP.length/3;i++){const r=remap[i];if(r===0xffffffff)continue;pv.set(uniqueP.slice(i*3,i*3+3),r*3);nv.set(uniqueN.slice(i*3,i*3+3),r*3);}
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<pv.length;i++){const a=i%3;min[a]=Math.min(min[a],pv[i]);max[a]=Math.max(max[a],pv[i]);}
 const pos=stream(pv,12,5126,count,'ATTRIBUTES',min,max),normal=stream(nv,12,5126,count,'ATTRIBUTES');
 const short=count<65536;const ids=short?Uint16Array.from(outIndices):outIndices;
 const indicesAccessor=stream(ids,short?2:4,short?5123:5125,ids.length,'TRIANGLES');
 const mesh=g.meshes.length;g.meshes.push({name,primitives:[{attributes:{POSITION:pos,NORMAL:normal},indices:indicesAccessor,material:0}]});
 const extra={partId:id,anatomicalName:name,sourceId,kind:'muscle',source:'Z-Anatomy',sourceName:originalName,license:'CC BY-SA 4.0'};
 const node=g.nodes.length;g.nodes.push({name:id,mesh,extras:extra});g.scenes[0].nodes.push(node);
 parts.push({id,name,sourceId,kind:'muscle',source:'Z-Anatomy',sourceName:originalName,sourceUrl,license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',side,...(alias?{matchedLegacyId:alias.id,fmaId:alias.sourceId}:{}),vertices:count,sourceExpandedVertices:attr.count,triangles:ids.length/3,sourceBounds:{min,max},sourceFile:'MuscularSystem100.fbx',sourceCommit:commit,sourceNodeId:o.ID,sourceMatrix:o.matrixWorld.toArray(),coordinateConversion:'(worldX,worldY,worldZ) centimetres -> (10X,-10Z,10Y) millimetres; proper uniform scale and X rotation, no pose changes',legacyName:alias?.name,windingReversed:flipped,normalDirectionReversed:normalFlipped,faceNormalAgreement:Math.abs(agreement/Math.max(samples,1)),sha256:sourceHash,geometrySha256:createHash('sha256').update(Buffer.from(pv.buffer)).update(Buffer.from(nv.buffer)).update(Buffer.from(ids.buffer)).digest('hex')});
});
const pad=(-binLength)&3;if(pad){chunks.push(Buffer.alloc(pad));binLength+=pad;}
g.buffers=[{byteLength:binLength},{byteLength:fallbackLength,extensions:{EXT_meshopt_compression:{fallback:true}}}];
g.asset.extras={source:'Z-Anatomy by Gauthier Kervyn and contributors',sourceCommit:commit,sourceUrl,sourceSha256:sourceHash,license:'CC BY-SA 4.0',geometryChanges:'Baked source transforms, proper centimetre/Y-up to millimetre/Z-up conversion, exact float32 indexing, outward winding correction where needed, lossless meshopt encoding. No decimation, sculpting, pose changes or invented counterpart geometry.'};
let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((-json.length)&3,32)]);const bin=Buffer.concat(chunks);const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+bin.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);const glb=Buffer.concat([header,jh,json,bh,bin]);
await writeFile(new URL('public/models/muscles.glb',root),glb);
report.muscles={label:'Skeletal muscles',file:'/models/muscles.glb',description:`${parts.length} named source components of skeletal muscles, including bilateral heads and regions, face/jaw, trunk, limbs, deep back, neck, pelvic floor and extraocular muscles. Not a claim of every anatomical variant.`,sourceLabel:'Z-Anatomy · Gauthier Kervyn and contributors',source:'Z-Anatomy',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',sourcePage:sourceUrl,sourceCommit:commit,sourceSha256:sourceHash,provenance:'Coherent original Z-Anatomy muscle atlas; source-world transforms baked with proper unit/axis conversion. No anatomical decimation, deformation or mixing with another pose.',assetSha256:createHash('sha256').update(glb).digest('hex'),assetBytes:glb.length,retrieved:'2026-10-30',transformations:g.asset.extras.geometryChanges,parts};
report.skeleton={...report.skeleton,sourceLabel:'BodyParts3D · Database Center for Life Science',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',provenance:'Original BodyParts3D 4.0 skeletal source coordinates and components.'};
report.skeleton.parts=report.skeleton.parts.map(p=>({...p,source:'BodyParts3D',sourceName:p.name,sourceUrl:'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'}));
await writeFile(new URL('public/models/muscle-aliases.json',root),JSON.stringify(parts.filter(p=>p.matchedLegacyId).map(p=>({id:p.id,legacyName:p.legacyName,sourceName:p.sourceName,sourceId:p.sourceId,source:p.source,reason:'Same anatomical component and side after conservative terminology normalization; heads and regional qualifiers retained.'})),null,2)+'\n');
await writeFile(new URL('public/models/systems.json',root),JSON.stringify(report,null,2)+'\n');
const fields=['id','name','sourceId','kind','source','sourceName','sourceUrl','license','licenseUrl','fmaId'];const simple={};const assets={};for(const k of ['skeleton','muscles']){simple[k]=report[k].parts.map(p=>Object.fromEntries(fields.filter(f=>p[f]!==undefined).map(f=>[f,p[f]])));assets[k]=Object.fromEntries(['label','file','description','sourceLabel','license','licenseUrl','provenance'].map(f=>[f,report[k][f]]));}
await writeFile(new URL('src/systemData.ts',root),`export type SystemId = 'skeleton' | 'muscles';\nexport type SystemPart = {id:string;name:string;sourceId:string;kind:'bone'|'cartilage'|'disc'|'muscle';source?:string;sourceName?:string;sourceUrl?:string;license?:string;licenseUrl?:string;fmaId?:string};\nexport const systemParts:Record<SystemId,SystemPart[]> = ${JSON.stringify(simple,null,2)};\nexport const systemAssets:Record<SystemId,{file:string;description:string;label:string;sourceLabel?:string;license?:string;licenseUrl?:string;provenance?:string}> = ${JSON.stringify(assets,null,2)};\n`);
console.log(JSON.stringify({parts:parts.length,triangles:parts.reduce((a,p)=>a+p.triangles,0),bytes:glb.length,legacyAliases:aliases,reversedWinding:reversed,sourceSha256:sourceHash}));
