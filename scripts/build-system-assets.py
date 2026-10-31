"""Pack the official anatomy OBJ sources into indexed glTF; retain each named part.
Run after retrieving the official sources described in research-assets.md.
"""
import json,struct,pathlib,zipfile,re,hashlib
root=pathlib.Path(__file__).resolve().parents[1];research=root.parent/'research-assets';out=root/'public/models';archive=zipfile.ZipFile(research/'bodyparts3d-4.0.zip');meta=json.loads((research/'all-models.json').read_text())
skeleton=[x for x in meta if 3152<=int(re.search(r'FJ(\d+)',x['file'])[1])<=3395]
muscles=json.loads((research/'muscle-picks.json').read_text())
def pack(system,items):
 raw=bytearray();g={'asset':{'version':'2.0','generator':'Anatome indexed BodyParts3D packer'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'accessors':[],'bufferViews':[],'materials':[]};parts=[]
 colors={'bone':[.74,.67,.54,1],'cartilage':[.65,.76,.78,1],'disc':[.62,.71,.75,1],'muscle':[.58,.25,.21,1]}
 for kind,color in colors.items():g['materials'].append({'name':kind,'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':0,'roughnessFactor':.8}})
 def accessor(data,component,count,typ,target,minimum=None,maximum=None):
  while len(raw)%4:raw.append(0)
  off=len(raw);raw.extend(data);vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(data),'target':target})
  a={'bufferView':vi,'componentType':component,'count':count,'type':typ}
  if minimum is not None:a.update(min=minimum,max=maximum)
  ix=len(g['accessors']);g['accessors'].append(a);return ix
 for m in items:
  filename=m.get('file',pathlib.Path(m.get('name','')).name);fj=filename[:-4]
  content=(research/'system-source'/filename).read_text() if system=='muscles' else archive.read(m['path']).decode()
  header=content.split('\nv ')[0];name=re.search(r'# English name : ([^\r\n]*)',header)[1];concept=re.search(r'# Concept ID : ([^\r\n]*)',header)[1]
  if not name.strip():raise ValueError('Missing anatomy name '+filename)
  kind='muscle' if system=='muscles' else 'cartilage' if 'cartilage' in name.lower() else 'disc' if 'disk' in name.lower() else 'bone'
  vs=[];ns=[];faces=[]
  for line in content.splitlines():
   if line.startswith('v '):vs.append(tuple(map(float,line.split()[1:4])))
   elif line.startswith('vn '):ns.append(tuple(map(float,line.split()[1:4])))
   elif line.startswith('f '):
    refs=[tuple(int(a) if a else 0 for a in token.split('/')) for token in line.split()[1:]]
    for i in range(1,len(refs)-1):faces.append([refs[0],refs[i],refs[i+1]])
  unique={};pv=[];nv=[];indices=[]
  for face in faces:
   for ref in face:
    key=(ref[0],ref[2] if len(ref)>2 else ref[0])
    if key not in unique:
     unique[key]=len(pv);pv.append(vs[key[0]-1]);nv.append(ns[key[1]-1])
    indices.append(unique[key])
  count=len(pv);minimum=[min(p[i] for p in pv) for i in range(3)];maximum=[max(p[i] for p in pv) for i in range(3)]
  pos=accessor(struct.pack('<'+'f'*count*3,*[x for v in pv for x in v]),5126,count,'VEC3',34962,minimum,maximum)
  normal=accessor(struct.pack('<'+'f'*count*3,*[x for v in nv for x in v]),5126,count,'VEC3',34962)
  short=count<65536;idx=accessor(struct.pack('<'+('H' if short else 'I')*len(indices),*indices),5123 if short else 5125,len(indices),'SCALAR',34963)
  mesh=len(g['meshes']);g['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':pos,'NORMAL':normal},'indices':idx,'material':list(colors).index(kind)}]})
  node=len(g['nodes']);g['nodes'].append({'name':fj,'mesh':mesh,'extras':{'partId':fj,'anatomicalName':name,'sourceId':concept,'kind':kind}});g['scenes'][0]['nodes'].append(node)
  parts.append(dict(id=fj,name=name,sourceId=concept,kind=kind,vertices=count,triangles=len(faces),sourceBounds={'min':minimum,'max':maximum},sourceFile=filename,sourceArchive=('partof_BP3D_4.0_obj_99.zip' if system=='skeleton' or 'partof_BP3D_4.0_obj_99/'+filename in archive.namelist() else 'isa_BP3D_4.0_obj_99.zip'),sha256=hashlib.sha256(content.encode()).hexdigest()))
 g['buffers']=[{'byteLength':len(raw)}];g['asset']['extras']={'source':'BodyParts3D 4.0, Database Center for Life Science','license':'CC BY 4.0','licenseUrl':'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html','geometryChanges':'OBJ to indexed float32 glTF conversion; anatomical coordinates and source normals preserved; no decimation or reflection'}
 js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);raw.extend(b'\0'*((-len(raw))%4));glb=struct.pack('<3I',0x46546c67,2,12+8+len(js)+8+len(raw))+struct.pack('<2I',len(js),0x4e4f534a)+js+struct.pack('<2I',len(raw),0x004e4942)+raw
 (out/(system+'.glb')).write_bytes(glb);print(system,len(parts),'parts',len(glb)/1e6,'MB',sum(x['triangles'] for x in parts),'triangles',flush=True)
 return parts
systems={}
for system,items in [('skeleton',skeleton),('muscles',muscles)]:systems[system]=pack(system,items)
assets={'skeleton':dict(label='Skeletal system',file='/models/skeleton.glb',description='238 named skeletal parts in their anatomical positions, including bone specimens, intervertebral discs and costal cartilages. This source collection does not contain every adult bone.'),'muscles':dict(label='Major muscles',file='/models/muscles.glb',description='66 named components of major skeletal muscles, preserved in their source anatomical positions. Includes bilateral muscles and separately modelled heads or regions; this is a selected collection, not every muscle.')}
(out/'systems.json').write_text(json.dumps({k:dict(**assets[k],parts=systems[k],source='BodyParts3D 4.0, Database Center for Life Science',sourcePage='https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',license='CC BY 4.0',licenseUrl='https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',retrieved='2026-10-30',assetSha256=hashlib.sha256((out/(k+'.glb')).read_bytes()).hexdigest(),assetBytes=(out/(k+'.glb')).stat().st_size,transformations='Indexed float32 glTF packing, no decimation or reflection; source coordinates and normals retained in GLB. At runtime rotate -90 degrees about X, centre uniformly and scale common assembly to maximum dimension 5.3. Isolation applies the same proper transform to a selected source component.') for k in systems},indent=2)+'\n')
publicparts={k:[{p:v for p,v in x.items() if p in ['id','name','sourceId','kind']} for x in val] for k,val in systems.items()}
(root/'src/systemData.ts').write_text("export type SystemId = 'skeleton' | 'muscles';\nexport type SystemPart = {id:string;name:string;sourceId:string;kind:'bone'|'cartilage'|'disc'|'muscle'};\nexport const systemParts:Record<SystemId,SystemPart[]> = "+json.dumps(publicparts,indent=2)+";\nexport const systemAssets:Record<SystemId,{file:string;description:string;label:string}> = "+json.dumps(assets,indent=2)+";\n")

# Preserve the final coherent Z-Anatomy muscle collection when its pinned source is present.
if (research/'MuscularSystem100.fbx').exists():
 import subprocess
 subprocess.run(['node',str(root/'scripts/build-z-anatomy.mjs')],cwd=root,check=True)
