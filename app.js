const SERVICE_UUID='12345678-1234-5678-1234-56789abcdef0';
const CHARACTERISTIC_UUID='12345678-1234-5678-1234-56789abcdef1';
const $=id=>document.getElementById(id);
let data={voltage:120,current:0,power:0,energy:0,frequency:60,pf:0};
let demoTimer=null,demo=false,device=null,characteristic=null,samples=[],lastHistory=0;
function text(id,v){const e=$(id);if(e)e.textContent=v}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function setStatus(msg,type='info'){text('bleStatus',msg); const e=$('bleDot');if(e)e.className='status-dot '+type}
function render(){
 text('voltage',Number(data.voltage||0).toFixed(1));text('current',Number(data.current||0).toFixed(2));text('power',Number(data.power||0).toFixed(0));text('energy',Number(data.energy||0).toFixed(3));text('frequency',Number(data.frequency||0).toFixed(1));text('pf',Number(data.pf||0).toFixed(2));
 text('measuredPower',Number(data.power||0).toFixed(0)+' W');text('chartPower',Number(data.power||0).toFixed(0)+' W');
 const tariff=Number($('tariff')?.value)||1.2,p=Number(data.power)||0,e=Number(data.energy)||0;
 text('cost','$'+(e*tariff).toFixed(2)+' MXN');text('daily','$'+(p/1000*24*tariff).toFixed(2)+' MXN');
 const c=$('condition');if(c){let cls='neutral',title='Sin carga',sub='No se detecta consumo significativo.';if(p>1500){cls='bad';title='Potencia muy alta';sub='Revisa el equipo y su placa de datos.'}else if(p>800){cls='warn';title='Consumo elevado';sub='La potencia supera 800 W.'}else if(p>2){cls='ok';title='Equipo consumiendo';sub='Lectura recibida correctamente.'}c.className='condition '+cls;c.innerHTML=`<span>●</span><div><strong>${title}</strong><small>${sub}</small></div>`}
 samples.push(p);if(samples.length>50)samples.shift();drawChart();
}
function history(){const now=Date.now();if(now-lastHistory<1200)return;lastHistory=now;const b=$('historyBody');if(!b)return;if(b.querySelector('.empty'))b.innerHTML='';const tr=document.createElement('tr');tr.innerHTML=`<td>${new Date().toLocaleTimeString('es-MX')}</td><td>${Number(data.voltage||0).toFixed(1)} V</td><td>${Number(data.current||0).toFixed(2)} A</td><td>${Number(data.power||0).toFixed(0)} W</td><td>${Number(data.energy||0).toFixed(3)} kWh</td><td>${Number(data.pf||0).toFixed(2)}</td>`;b.prepend(tr);while(b.children.length>20)b.lastElementChild.remove()}
function drawChart(){const c=$('powerChart');if(!c)return;const ctx=c.getContext('2d'),r=window.devicePixelRatio||1,w=c.clientWidth||600,h=c.clientHeight||260;c.width=w*r;c.height=h*r;ctx.setTransform(r,0,0,r,0,0);ctx.clearRect(0,0,w,h);ctx.strokeStyle='#e5eaf1';for(let i=0;i<5;i++){const y=20+(h-40)*i/4;ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(w-15,y);ctx.stroke()}if(samples.length<2)return;const max=Math.max(100,...samples)*1.15;ctx.beginPath();samples.forEach((v,i)=>{const x=35+(w-50)*i/(samples.length-1),y=h-20-v/max*(h-40);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle='#1769ff';ctx.lineWidth=3;ctx.stroke()}
function parsePayload(raw){if(raw instanceof DataView)raw=new TextDecoder().decode(raw);if(raw instanceof ArrayBuffer)raw=new TextDecoder().decode(raw);raw=String(raw).trim();try{return JSON.parse(raw)}catch{}const a=raw.split(',').map(Number);return a.length>=6&&a.every(Number.isFinite)?{voltage:a[0],current:a[1],power:a[2],energy:a[3],frequency:a[4],pf:a[5]}:null}
function bleData(e){const d=parsePayload(e.target.value);if(d){data={...data,...d};render();history();setStatus('Conectado · recibiendo datos','ok')}}
async function connect(){
 if(!window.isSecureContext){setStatus('Necesitas HTTPS o localhost','bad');alert('Bluetooth del navegador solo funciona en HTTPS o en localhost. No abras index.html con doble clic. Ejecuta npm start y entra a http://localhost:3000');return}
 if(!navigator.bluetooth){setStatus('Bluetooth no disponible en este navegador','bad');alert('Usa Google Chrome o Microsoft Edge en un equipo compatible con Bluetooth.');return}
 try{setStatus('Abriendo selector de dispositivos…');device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[SERVICE_UUID]});text('deviceName',device.name||'ESP32');
 device.addEventListener('gattserverdisconnected',()=>{setStatus('ESP32 desconectado','bad');$('bleBtn').textContent='🔵 Conectar ESP32'});
 setStatus('Conectando con '+(device.name||'ESP32')+'…');const server=await device.gatt.connect();const service=await server.getPrimaryService(SERVICE_UUID);characteristic=await service.getCharacteristic(CHARACTERISTIC_UUID);await characteristic.startNotifications();characteristic.addEventListener('characteristicvaluechanged',bleData);setStatus('Conectado · esperando mediciones','ok');$('bleBtn').textContent='🟢 ESP32 conectado'}
 catch(e){setStatus(e.name==='NotFoundError'?'Selección cancelada':'Error: '+e.message,'bad')}
}
function demoTick(){const t=Date.now()/3000;const p=Math.max(0,180+Math.sin(t)*45+(Math.random()-.5)*25);data={voltage:119.5+Math.random()*1.5,current:p/120,power:p,energy:(Number(data.energy)||0)+p/1000/2400,frequency:59.8+Math.random()*.4,pf:.91+Math.random()*.06};render();history()}
function toggleDemo(){if(demo){demo=false;clearInterval(demoTimer);demoTimer=null;$('demoBtn').textContent='▶ Iniciar demostración';setStatus('Listo para conectar')}else{demo=true;$('demoBtn').textContent='■ Detener demostración';setStatus('Modo demostración activo','demo');demoTick();demoTimer=setInterval(demoTick,1500)}}
async function checkAI(){
 try{const r=await fetch('/api/health');const h=await r.json();const el=$('aiState');if(el){el.textContent=h.aiConfigured?'IA conectada ✓':'IA sin configurar';el.classList.toggle('connected',!!h.aiConfigured);el.title=h.message||'';}if(!h.aiConfigured){text('aiHelp','Para activar la búsqueda web con IA, configura tu clave API en el archivo .env y reinicia el servidor.');}else{text('aiHelp',`Búsqueda web con IA lista · ${h.model||'modelo configurado'}`)}}catch{const el=$('aiState');if(el)el.textContent='Servidor no disponible';text('aiHelp','Inicia la plataforma con npm start para habilitar la IA.');}
}
async function analyze(){
 const input=$('applianceInput'),btn=$('analyzeBtn'),name=input?.value.trim();
 if(!name){text('aiState','Falta el electrodoméstico');input?.focus();return}
 if(btn){btn.disabled=true;btn.textContent='🔎 Buscando en la web…'}
 text('aiState','Buscando fabricante, ficha técnica y potencia…');text('aiHelp','La búsqueda puede tardar unos segundos.');
 if($('diagnostic'))$('diagnostic').innerHTML='<b>Consultando fuentes web…</b><p>Buscando especificaciones del fabricante y preparando la comparación con la medición actual.</p>';
 try{
  const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appliance:name,measurements:{...data,modo:demo?'demostracion':'medicion',timestamp:new Date().toISOString()}})});
  let d;try{d=await r.json()}catch{throw Error('El servidor no devolvió una respuesta válida. Comprueba que ejecutaste npm start.')}
  if(!r.ok)throw Error(d.error||`Error del servidor (${r.status})`);
  const x=d.result||{};text('refPower',x.potencia_referencia_w!=null?Number(x.potencia_referencia_w).toLocaleString('es-MX')+' W':'No encontrada');
  text('difference',x.diferencia_porcentual!=null?Number(x.diferencia_porcentual).toFixed(1)+'%':'No calculable');
  const estado=String(x.estado||'DATOS_INSUFICIENTES');
  if($('diagnostic'))$('diagnostic').innerHTML=`<b>${esc(x.nombre||name)}</b><p><strong>Fabricante:</strong> ${esc(x.fabricante||'No identificado')} &nbsp; <strong>Modelo:</strong> ${esc(x.modelo||'No identificado')}</p><p>${esc(x.diagnostico||x.comparacion||'Sin diagnóstico.')}</p><p><strong>Comparación:</strong> ${esc(x.comparacion||'No disponible')}</p><p><strong>Estado:</strong> ${esc(estado)}</p>`;
  if($('recommendation'))$('recommendation').innerHTML=x.recomendacion?`<b>Recomendación:</b> ${esc(x.recomendacion)}`:'';
  if($('sources'))$('sources').innerHTML=(x.fuentes||[]).filter(s=>s.url&&/^https?:\/\//i.test(s.url)).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.titulo||s.url)}</a>`).join(' · ')||'<span>No se recibieron enlaces de fuentes; verifica el resultado antes de tomar decisiones.</span>';
  text('aiState','Búsqueda completada ✓');text('aiHelp',`Resultado generado con ${d.model||'la IA'} y búsqueda web. ${demo?'Estás comparando contra datos simulados, no contra una medición real.':''}`);
 }catch(e){text('aiState','No se pudo conectar con la IA');text('aiHelp',e.message);if($('diagnostic'))$('diagnostic').innerHTML=`<b>No se pudo completar la búsqueda</b><p>${esc(e.message)}</p><p>Revisa el archivo .env, tu clave API, la conexión a internet y vuelve a intentar.</p>`;if($('sources'))$('sources').innerHTML='';}
 finally{if(btn){btn.disabled=false;btn.textContent='🤖 Buscar y comparar'}}
}
$('bleBtn')?.addEventListener('click',connect);$('demoBtn')?.addEventListener('click',toggleDemo);$('analyzeBtn')?.addEventListener('click',analyze);$('clearHistory')?.addEventListener('click',()=>{$('historyBody').innerHTML='<tr><td colspan="6" class="empty">Sin mediciones todavía</td></tr>';samples=[];drawChart()});$('tariff')?.addEventListener('input',render);window.addEventListener('resize',drawChart);render();checkAI();
