const fs=require('fs');
const path=require('path');

class StateStore {
  constructor(options={}) {
    this.filePath=options.filePath||path.join(process.cwd(),'data','office-state.json');
    this.state=options.state||{version:1,updatedAt:null,projects:{},tasks:{},specialists:{},teams:{},events:[],experiences:[],lessons:[]};
  }

  load(){
    if(!fs.existsSync(this.filePath)) return this.state;
    const raw=fs.readFileSync(this.filePath,'utf8');
    this.state=JSON.parse(raw);
    return this.state;
  }

  save(state=this.state){
    const dir=path.dirname(this.filePath);
    fs.mkdirSync(dir,{recursive:true});
    this.state={...state,updatedAt:new Date().toISOString()};
    const temp=this.filePath+'.tmp';
    fs.writeFileSync(temp,JSON.stringify(this.state,null,2));
    fs.renameSync(temp,this.filePath);
    return this.state;
  }

  update(patch={}){
    this.state={...this.state,...patch};
    return this.save(this.state);
  }

  clear(){
    if(fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    this.state={version:1,updatedAt:null,projects:{},tasks:{},specialists:{},teams:{},events:[],experiences:[],lessons:[]};
    return this.state;
  }
}
module.exports={StateStore};
