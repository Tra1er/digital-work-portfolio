(()=>{'use strict';
const $=id=>document.getElementById(id), MAX=5*1024*1024;
const sample='Name,Email,City,Order\n"  Anna   Kowalska  "," ANNA@example.com "," Warsaw "," A-001 "\n"Jan Nowak","jan@example.com",Krakow,A-002\n"Anna Kowalska","anna@example.com",Warsaw,A-001\n"    "," "," "," "\n"  Ola   Zielinska ","ola@example.com  ",Poznan,A-003\n"Jan Nowak","jan@example.com",Krakow,A-002';
let output='',fileName='cleaned.csv';
function setStatus(message,kind=''){const s=$('status');s.textContent=message;s.className='notice '+kind}
function parseCSV(input,delim){
  const text=input.replace(/^\uFEFF/,''); const rows=[];let row=[],v='',inQuotes=false,fieldStarted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQuotes){if(ch==='"'){if(text[i+1]==='"'){v+='"';i++}else inQuotes=false}else v+=ch;continue}
    if(ch==='"'&&!fieldStarted){inQuotes=true;fieldStarted=true;continue}
    if(ch===delim){row.push(v);v='';fieldStarted=false;continue}
    if(ch==='\r'||ch==='\n'){row.push(v);rows.push(row);row=[];v='';fieldStarted=false;if(ch==='\r'&&text[i+1]==='\n')i++;continue}
    v+=ch;fieldStarted=true;
  }
  if(inQuotes) throw new Error('Unclosed quoted field. Please check the source file.');
  if(v.length || row.length || fieldStarted){row.push(v);rows.push(row)}
  return rows;
}
function countDelimiter(text,delimiter){let quote=false,count=0;for(let i=0;i<text.length&&i<12000;i++){const x=text[i];if(x==='"'){if(quote&&text[i+1]==='"'){i++;continue}quote=!quote}else if(!quote&&(x==='\r'||x==='\n'))break;else if(!quote&&x===delimiter)count++}return count}
function getDelimiter(text){const v=$('delimiter').value;if(v!=='auto')return v==='tab'?'\t':v;const opts=[',',';','\t'];return opts.sort((a,b)=>countDelimiter(text,b)-countDelimiter(text,a))[0]}
function escapeCell(value){const str=String(value);return /[",\r\n]/.test(str)?'"'+str.replace(/"/g,'""')+'"':str}
function toCSV(rows){return rows.map(row=>row.map(escapeCell).join(',')).join('\r\n')+'\r\n'}
function clean(){
  const raw=$('raw').value;if(!raw.trim())throw new Error('Paste data or load the example first.');if(new Blob([raw]).size>MAX)throw new Error('File exceeds the 5 MB limit.');
  const original=parseCSV(raw,getDelimiter(raw));if(!original.length)throw new Error('No data rows found.');
  const header=original[0];const data=original.slice(1);const length=header.length;
  if(length>200)throw new Error('More than 200 columns detected. Check your input delimiter.');
  if(data.some(r=>r.length!==length))throw new Error(`Inconsistent column count. Expected ${length} columns but at least one row differs. Please inspect the source delimiter and quoting.`);
  if(data.length>50000)throw new Error('The demo supports up to 50,000 data rows.');
  const trim=$('trim').checked,spaces=$('spaces').checked,omitEmpty=$('empty').checked,dedupe=$('duplicates').checked,ignoreCase=$('case').checked,formulas=$('formula').checked;
  let changed=0, removedEmpty=0,removedDuplicates=0;
  function fix(s){let t=s;if(trim)t=t.trim();if(spaces)t=t.replace(/ {2,}/g,' ');if(formulas&&/^[\t\r\n ]*[=+\-@]/.test(t))t="'"+t; if(s!==t)changed++;return t}
  const newHeader=header.map(fix),seen=new Set(),out=[];
  for(const originalRow of data){const row=originalRow.map(fix);if(omitEmpty&&row.every(x=>!x.trim())){removedEmpty++;continue}const key=JSON.stringify(ignoreCase?row.map(x=>x.toLocaleLowerCase()):row);if(dedupe&&seen.has(key)){removedDuplicates++;continue}seen.add(key);out.push(row)}
  output=toCSV([newHeader,...out]);$('rows').textContent=out.length;$('removed').textContent=removedEmpty+removedDuplicates;$('changed').textContent=changed;
  $('meta').textContent=`${data.length} input data rows → ${out.length} output data rows. ${removedEmpty} empty rows and ${removedDuplicates} duplicate rows removed. Preview shows up to 12 rows.`;
  const table=$('preview');table.replaceChildren();const thead=document.createElement('thead'),tr=document.createElement('tr');for(const h of newHeader){const th=document.createElement('th');th.textContent=h;tr.appendChild(th)}thead.appendChild(tr);table.appendChild(thead);const tbody=document.createElement('tbody');for(const row of out.slice(0,12)){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}tbody.appendChild(tr)}table.appendChild(tbody);
  $('download').disabled=false;setStatus(`Success. Cleaned ${data.length} input rows. ${removedEmpty+removedDuplicates} rows removed, ${changed} cells changed.`,'good');
}
$('run').addEventListener('click',()=>{try{clean()}catch(e){output='';$('download').disabled=true;setStatus(e.message,'error')}});
$('sample').addEventListener('click',()=>{$('raw').value=sample;fileName='sample_cleaned.csv';setStatus('Example loaded. Choose Clean my file.');});
$('clear').addEventListener('click',()=>{$('raw').value='';$('upload').value='';output='';$('download').disabled=true;setStatus('Cleared.');$('rows').textContent=$('removed').textContent=$('changed').textContent='—';$('meta').textContent='The first rows of your cleaned file will appear here.';$('preview').innerHTML='<tbody><tr><td>Nothing processed yet.</td></tr></tbody>'});
$('upload').addEventListener('change',async()=>{const f=$('upload').files[0];if(!f)return;if(f.size>MAX){setStatus('File exceeds the 5 MB limit.','error');return;}try{$('raw').value=await f.text();fileName=f.name.replace(/\.[^.]+$/,'')+'_cleaned.csv';setStatus(`${f.name} loaded. Choose Clean my file.`)}catch(e){setStatus(`Unable to read file: ${e.message}`,'error')}});
$('download').addEventListener('click',()=>{if(!output)return;const u=URL.createObjectURL(new Blob(['\uFEFF',output],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)});
})();
