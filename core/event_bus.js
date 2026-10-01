class EventBus {
  constructor(options={}){ this.listeners=new Map(); this.eventStore=options.eventStore||null; }
  on(type,handler){ if(typeof handler!=='function') throw new Error('Event handler must be a function'); if(!this.listeners.has(type)) this.listeners.set(type,new Set()); this.listeners.get(type).add(handler); return ()=>this.off(type,handler); }
  off(type,handler){ const set=this.listeners.get(type); if(!set)return false; const removed=set.delete(handler); if(!set.size)this.listeners.delete(type); return removed; }
  emit(type,payload={}){ const event={type,payload,at:new Date().toISOString()}; if(this.eventStore)this.eventStore.append({type,...payload,createdAt:event.at}); for(const handler of [...(this.listeners.get(type)||[])])handler(event); return event; }
}
module.exports={EventBus};
