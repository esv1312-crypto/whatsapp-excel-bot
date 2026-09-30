class EventStore {
  constructor(options={}) {
    this.stateStore=options.stateStore||null;
    this.events=[];
    this.maxEvents=options.maxEvents||10000;
  }

  append(event={}){
    if(!event.type) throw new Error('Event type is required');
    const entry={...event,id:event.id||`event_${Date.now()}_${this.events.length}`,createdAt:event.createdAt||new Date().toISOString()};
    this.events.push(entry);
    if(this.events.length>this.maxEvents) this.events.splice(0,this.events.length-this.maxEvents);
    this._persist();
    return entry;
  }

  list(filter={}){
    return this.events.filter(event=>{
      if(filter.type&&event.type!==filter.type) return false;
      if(filter.taskId&&event.taskId!==filter.taskId) return false;
      if(filter.project&&event.project!==filter.project) return false;
      return true;
    });
  }

  load(){
    if(!this.stateStore) return this.events;
    const state=this.stateStore.load();
    this.events=Array.isArray(state.events)?state.events:[];
    return this.events;
  }

  _persist(){
    if(!this.stateStore) return;
    this.stateStore.update({events:this.events});
  }
}
module.exports={EventStore};
