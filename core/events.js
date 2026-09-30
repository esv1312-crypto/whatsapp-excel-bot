class EventBus{
  constructor(options={}){
    this.listeners=new Map();
    this.eventStore=options.eventStore||null;
  }
  on(type,handler){
    if(!this.listeners.has(type)) this.listeners.set(type,new Set());
    this.listeners.get(type).add(handler);
    return ()=>this.listeners.get(type)?.delete(handler);
  }
  emit(type,payload={}){
    const event={type,payload,at:new Date().toISOString()};
    if(this.eventStore) this.eventStore.append({
      type,
      ...payload,
      createdAt:event.at
    });
    for(const handler of this.listeners.get(type)||[]) handler(event);
    return event;
  }
}
module.exports={EventBus};
