import ws from 'k6/ws';
const fixture=JSON.parse(open('./artifacts/load.private.json'));
export const options={vus:1,iterations:1};
export default function(){const r=ws.connect(fixture.origin.replace('http:','ws:')+'/api/launch/live',{headers:{Origin:fixture.origin,Cookie:fixture.clients[0].cookie}},socket=>{socket.on('open',()=>console.log('OPEN'));socket.on('message',v=>console.log('MESSAGE',v));socket.on('error',e=>console.log('SOCKET_ERROR',String(e?.error?.()||e?.message||e)));socket.on('close',()=>console.log('CLOSED'));socket.setTimeout(()=>socket.close(),2000);});console.log('HANDSHAKE_STATUS',r?.status);}
