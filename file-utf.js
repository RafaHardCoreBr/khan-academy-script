javascript:(function venice(){
'use strict';
const V='4.0', NS='vk4:';

/* ======================= 0. UTIL ======================= */
const norm=s=>String(s??'').replaceAll('\u00a0',' ').replace(/\s+/g,' ').trim();
const low=s=>norm(s).toLowerCase();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const log=(...a)=>console.log('%c[vn]','color:#6ea8fe',...a);
const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36)};
const LS={
  get:(k,d)=>{try{const v=localStorage.getItem(NS+k);return v===null?d:JSON.parse(v)}catch(e){return d}},
  set:(k,v)=>{try{localStorage.setItem(NS+k,JSON.stringify(v))}catch(e){}},
  del:k=>{try{localStorage.removeItem(NS+k)}catch(e){}},
  limpar:tudo=>{try{Object.keys(localStorage).filter(k=>k.startsWith(NS)&&(tudo||!k.includes('key'))).forEach(k=>localStorage.removeItem(k))}catch(e){}}
};
const cfg=(k,d)=>LS.get('cfg:'+k,d);
const setCfg=(k,v)=>LS.set('cfg:'+k,v);
const num=s=>{const m=String(s).replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?parseFloat(m[0]):null};
const brl=n=>String(n).replace('.',',');

if(window.__venice?.destroy){try{window.__venice.destroy()}catch(e){}}

/* ======================= 1. MATEMÁTICA SEGURA (sem eval) ======================= */
const MAT=function(){
  const pre=s=>low(s)
    .replace(/[×·∙]/g,'*').replace(/[÷:]/g,'/').replace(/[−–—]/g,'-')
    .replace(/raiz quadrada de/g,'sqrt').replace(/raiz c[úu]bica de/g,'cbrt')
    .replace(/√/g,'sqrt').replace(/\bpi\b/g,'3.141592653589793')
    .replace(/(\d)\s*%/g,'($1/100)').replace(/%/g,'/100')
    .replace(/\bde\b/g,'*').replace(/\bvezes\b/g,'*').replace(/\bmais\b/g,'+')
    .replace(/\bmenos\b/g,'-').replace(/\bdividido por\b/g,'/');
  const token=s=>{
    const t=[];let i=0;
    while(i<s.length){
      const c=s[i];
      if(/\s/.test(c)){i++;continue}
      if(/[0-9.]/.test(c)){
        let j=i;while(j<s.length&&/[0-9.]/.test(s[j]))j++;
        t.push({t:'n',v:parseFloat(s.slice(i,j))});i=j;continue;
      }
      if(/[a-z]/.test(c)){
        let j=i;while(j<s.length&&/[a-z]/.test(s[j]))j++;
        t.push({t:'f',v:s.slice(i,j)});i=j;continue;
      }
      if('+-*/^()'.includes(c)){t.push({t:c});i++;continue}
      i++;
    }
    return t;
  };
  const prec={'+':1,'-':1,'*':2,'/':2,'^':3};
  const rpn=t=>{
    const out=[],op=[];
    for(const k of t){
      if(k.t==='n'){out.push(k);continue}
      if(k.t==='f'){op.push(k);continue}
      if(k.t==='('){op.push(k);continue}
      if(k.t===')'){
        while(op.length&&op[op.length-1].t!=='(')out.push(op.pop());
        op.pop();continue;
      }
      const p=prec[k.t]||0;
      while(op.length&&op[op.length-1].t!=='('&&(prec[op[op.length-1].t]||0)>=p&&k.t!=='^')out.push(op.pop());
      op.push(k);
    }
    while(op.length)out.push(op.pop());
    return out;
  };
  const calc=r=>{
    const st=[];
    for(const k of r){
      if(k.t==='n'){st.push(k.v);continue}
      if(k.t==='f'){
        const a=st.pop();
        if(k.v==='sqrt')st.push(a===undefined?NaN:Math.sqrt(a));
        else if(k.v==='cbrt')st.push(a===undefined?NaN:Math.cbrt(a));
        else return NaN;
        continue;
      }
      const b=st.pop(),a=st.pop();
      if(a===undefined||b===undefined)return NaN;
      st.push(k.t==='+'?a+b:k.t==='-'?a-b:k.t==='*'?a*b:k.t==='/'?a/b:Math.pow(a,b));
    }
    return st.length===1?st[0]:NaN;
  };
  return {
    avaliar(s){
      const t=token(pre(s));
      if(!t.some(k=>k.t==='n'))return NaN;
      const v=calc(rpn(t));
      return isFinite(v)?v:NaN;
    },
    casas(txt){
      const t=low(txt),w={uma:1,duas:2,'três':3,tres:3,quatro:4,zero:0};
      const m=t.match(/(\d+|uma|duas|três|tres|quatro|zero)\s+casas?/);
      if(m)return w[m[1]]!==undefined?w[m[1]]:+m[1];
      return /inteiro|n[úu]mero inteiro/.test(t)?0:null;
    },
    arred(v,c){if(c===null||c===undefined)return v;const f=Math.pow(10,c);return Math.round(v*f)/f},
    mdc(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1},
    fracao(a,b){const d=this.mdc(a,b);return [a/d,b/d]},
    casar(valor,opcoes){
      for(const o of opcoes){
        const n=num(o);
        if(n!==null&&Math.abs(n-valor)<1e-6)return o;
      }
      const alvo=brl(Number(valor.toFixed(4)));
      for(const o of opcoes)if(low(o).includes(alvo)||low(o).includes(String(valor)))return o;
      return null;
    }
  };
}();

/* ======================= 2. EXTRAÇÃO DO DOM ======================= */
const raiz=()=>document.querySelector('#problemarea, .framework-perseus, [data-testid="perseus-renderer"]')||document.body;

function lerEnunciado(){
  const r=raiz();
  const linhas=(r.innerText||'').split('\n').map(s=>norm(s))
    .filter(s=>s&&!/^(mostrar dicas?|mostrar próxima dica|mostrar proxima dica|verificar|concluir|próxima pergunta|dica|calculadora|escolha \d+ resposta|enviar|pular)$/i.test(s));
  return linhas.join('\n').slice(0,1500);
}
function lerOpcoes(){
  const r=raiz(),out=[];
  r.querySelectorAll('li').forEach(li=>{
    const t=norm(li.innerText);
    if(t&&t.length<400&&!li.querySelector('li'))out.push(t);
  });
  return [...new Set(out)];
}
function lerCampos(){
  const r=raiz(),out=[];
  [...r.querySelectorAll('.perseus-widget-container, .perseus-renderer > div')].forEach((w,i)=>{
    if(w.querySelectorAll('li').length)out.push({tipo:'opcoes',el:w,idx:i});
    else if(w.querySelector('textarea'))out.push({tipo:'texto',el:w,idx:i});
    else if(w.querySelector('input'))out.push({tipo:'numero',el:w,idx:i});
  });
  if(!out.length&&r.querySelector('input,textarea')){
    r.querySelectorAll('input,textarea').forEach((el,i)=>out.push({tipo:el.tagName==='TEXTAREA'?'texto':'numero',el,idx:i}));
  }
  return out;
}
function lerDicas(){
  const r=raiz();
  return [...r.querySelectorAll('[data-testid="hint"], .perseus-hint, [class*="hint-block"]')]
    .map(b=>norm(b.innerText)).filter(Boolean);
}

/* ======================= 3. CLASSIFICAÇÃO ======================= */
const ASSUNTO=[
  ['geometria',/área|area|perímetro|perimetro|volume|circunferência|circunferencia|triângulo|triangulo|retângulo|retangulo|raio|diâmetro|diametro/],
  ['porcentagem',/%|por cento|desconto|aumento percentual/],
  ['fracao',/fra[çc][ãa]o|numerador|denominador|\d+\/\d+/],
  ['proporcao',/propor[çc][ãa]o|raz[ãa]o|escala|regra de tr[êe]s/],
  ['equacao',/equa[çc][ãa]o|resolva para|isole|inc[óo]gnita|valor de x/],
  ['potencia',/pot[êe]ncia|expoente|elevado a|quadrado de|cubo de/],
  ['raiz',/raiz quadrada|raiz c[úu]bica|√/],
  ['unidade',/converta|converter|km|quil[ôo]metro|metro|litro|grama|polegada|milha/],
  ['aritmetica',/^[\d\s.,+\-*/×÷()^%]+$|quanto [ée]|calcule|some|subtraia|multiplique|divida/]
];
function classificar(txt,opcoes){
  const t=low(txt);
  let assunto='geral';
  for(const [nome,re] of ASSUNTO)if(re.test(t)){assunto=nome;break}
  const tipo=opcoes.length?'opcoes':/\?|explique|descreva|justifique|por que|o que é/.test(t)?'dissertativa':'calculo';
  return {assunto,tipo};
}

/* ======================= 4. SOLUCIONADORES ======================= */
const CONF={alta:'alta',media:'média',baixa:'baixa'};

function extrairExpressao(txt){
  const limpo=txt.split('\n').filter(l=>/=/.test(l)||/[\d].*[+\-*/×÷^]/.test(l)).join(' ');
  const alvo=(limpo.match(/-?\d[\d\s.,+\-*/×÷()^%]*=/g)||[])[0];
  const bruto=alvo?alvo.replace(/=\s*$/,''):(limpo.match(/[-+]?[\d(][\d\s.,+\-*/×÷()^%]*/g)||[]).sort((a,b)=>b.length-a.length)[0];
  return bruto?norm(bruto):null;
}

const SOLV={
  aritmetica(p){
    const e=extrairExpressao(p.texto);
    if(!e)return null;
    const v=MAT.avaliar(e);
    if(isNaN(v))return null;
    const c=MAT.casas(p.texto);
    const r=MAT.arred(v,c);
    return {valores:[brl(r)],confianca:CONF.alta,etapas:[`expressão: ${e}`,`cálculo: ${brl(r)}`]};
  },
  porcentagem(p){
    const m=low(p.texto).match(/([\d.,]+)\s*%\s*(?:de|do|da)\s*([\d.,]+)/);
    if(!m)return null;
    const a=num(m[1]),b=num(m[2]);
    if(a===null||b===null)return null;
    const r=MAT.arred(a/100*b,MAT.casas(p.texto));
    return {valores:[brl(r)],confianca:CONF.alta,etapas:[`${brl(a)}% de ${brl(b)}`,`${brl(a)}/100 × ${brl(b)} = ${brl(r)}`]};
  },
  fracao(p){
    const m=low(p.texto).match(/(\d+)\s*\/\s*(\d+)/);
    if(!m)return null;
    const a=+m[1],b=+m[2];
    if(!b)return null;
    const [x,y]=MAT.fracao(a,b);
    return {valores:[`${x}/${y}`,brl(a/b)],confianca:CONF.media,etapas:[`${a}/${b}`,y===1?`= ${x}`:`simplificado: ${x}/${y}`,brl(a/b)]};
  },
  proporcao(p){
    const ns=(low(p.texto).match(/-?\d+(?:[.,]\d+)?/g)||[]).map(n=>num(n)).filter(n=>n!==null);
    if(ns.length<3)return null;
    const [a,b,c]=ns;
    if(!a)return null;
    const r=MAT.arred(b*c/a,MAT.casas(p.texto));
    return {valores:[brl(r)],confianca:CONF.media,etapas:[`${brl(a)} → ${brl(b)}`,`${brl(c)} → x`,`x = ${brl(b)} × ${brl(c)} / ${brl(a)} = ${brl(r)}`]};
  },
  equacao(p){
    const m=p.texto.match(/(-?\d*)\s*x\s*([+-]\s*\d+)?\s*=\s*(-?\d+)/i);
    if(!m)return null;
    const a=m[1]===''||m[1]==='+'?1:m[1]==='-'?-1:parseFloat(m[1]);
    const b=m[2]?parseFloat(m[2].replace(/\s/g,'')):0;
    const c=parseFloat(m[3]);
    if(!a)return null;
    const x=(c-b)/a;
    return {valores:[brl(x)],confianca:CONF.alta,etapas:[`${brl(a)}x ${b>=0?'+ '+brl(b):'- '+brl(-b)} = ${brl(c)}`,`${brl(a)}x = ${brl(c-b)}`,`x = ${brl(x)}`]};
  },
  potencia(p){
    const m=low(p.texto).match(/([\d.,]+)\s*(?:\^|elevado a|à potência de)\s*([\d.,]+)/);
    if(!m)return null;
    const r=Math.pow(num(m[1]),num(m[2]));
    if(!isFinite(r))return null;
    return {valores:[brl(r)],confianca:CONF.alta,etapas:[`${m[1]}^${m[2]} = ${brl(r)}`]};
  },
  raiz(p){
    const m=low(p.texto).match(/raiz quadrada de\s*([\d.,]+)|√\s*([\d.,]+)/);
    if(!m)return null;
    const n=num(m[1]||m[2]);
    const r=Math.sqrt(n);
    if(isNaN(r))return null;
    return {valores:[brl(r)],confianca:Number.isInteger(r)?CONF.alta:CONF.media,etapas:[`√${brl(n)} = ${brl(r)}`]};
  },
  unidade(p){
    const t=low(p.texto);
    const m=t.match(/([\d.,]+)\s*(km|m|cm|mm|kg|g|mg|l|ml|h|min|s)\b.*?(?:para|em)\s*(km|m|cm|mm|kg|g|mg|l|ml|h|min|s)\b/);
    if(!m)return null;
    const tab={km:1000,m:1,cm:0.01,mm:0.001,kg:1000,g:1,mg:0.001,l:1,ml:0.001,h:3600,min:60,s:1};
    if(!(m[2] in tab)||!(m[3] in tab))return null;
    if((tab[m[2]]>=100||tab[m[3]]>=100)!==(tab[m[2]]>=100||tab[m[3]]>=100))return null;
    const r=num(m[1])*tab[m[2]]/tab[m[3]];
    return {valores:[brl(MAT.arred(r,MAT.casas(p.texto)))],confianca:CONF.alta,
      etapas:[`${m[1]} ${m[2]} = ${brl(MAT.arred(r,4))} ${m[3]}`]};
  },
  geometria(p){
    const t=low(p.texto);
    const ns=(t.match(/-?\d+(?:[.,]\d+)?/g)||[]).map(n=>num(n)).filter(n=>n!==null);
    if(ns.length<1)return null;
    if(/círculo|circulo|circunferência|circunferencia/.test(t)&&/área|area/.test(t)){
      const r=ns[0],v=Math.PI*r*r;
      return {valores:[brl(MAT.arred(v,MAT.casas(p.texto)??2))],confianca:CONF.alta,etapas:[`área = π·r² = π·${brl(r)}²`,brl(v)]};
    }
    if(/retângulo|retangulo|quadrado/.test(t)&&/área|area/.test(t)&&ns.length>=2){
      const v=ns[0]*ns[1];
      return {valores:[brl(v)],confianca:CONF.alta,etapas:[`área = ${brl(ns[0])} × ${brl(ns[1])} = ${brl(v)}`]};
    }
    if(/triângulo|triangulo/.test(t)&&/área|area/.test(t)&&ns.length>=2){
      const v=ns[0]*ns[1]/2;
      return {valores:[brl(v)],confianca:CONF.alta,etapas:[`área = base × altura / 2 = ${brl(v)}`]};
    }
    if(/cubo|paralelepípedo|paralelepipedo/.test(t)&&/volume/.test(t)&&ns.length>=3){
      const v=ns[0]*ns[1]*ns[2];
      return {valores:[brl(v)],confianca:CONF.alta,etapas:[`volume = ${brl(ns[0])} × ${brl(ns[1])} × ${brl(ns[2])} = ${brl(v)}`]};
    }
    if(/perímetro|perimetro/.test(t)&&ns.length>=2){
      const v=2*(ns[0]+ns[1]);
      return {valores:[brl(v)],confianca:CONF.media,etapas:[`perímetro = 2 × (${brl(ns[0])} + ${brl(ns[1])}) = ${brl(v)}`]};
    }
    return null;
  },
  dissertativa(p){
    const t=low(p.texto);
    const tema=(t.match(/(?:explique|descreva|justifique|por que|o que é|qual a importância)[^?\n]*/g)||[])[0];
    const top=[];
    if(/por que|justifique/.test(t))top.push('cause → consequência');
    if(/compare|diferença|diferença entre/.test(t))top.push('semelhanças e diferenças');
    if(/importância|impacto/.test(t))top.push('relevância e efeitos');
    if(!top.length)top.push('definição','exemplo concreto','conclusão');
    const etapas=[
      tema?`pergunta central: ${tema.slice(0,140)}`:'organize a partir do enunciado',
      'estrutura sugerida: '+top.join(' → ')
    ];
    const dicas=lerDicas();
    if(dicas.length)etapas.push('a dica da própria página já entrega o eixo: '+dicas.join(' ').slice(0,220));
    return {valores:[],confianca:CONF.baixa,etapas};
  }
};

/* ======================= 5. MEMÓRIA E HISTÓRICO ======================= */
const memGet=k=>LS.get('mem:'+k,null);
const memSet=(k,v)=>LS.set('mem:'+k,v);
const histAdd=e=>{const h=LS.get('hist',[]);h.unshift(Object.assign({t:Date.now()},e));LS.set('hist',h.slice(0,200))};

/* ======================= 6. PROVEDORES ======================= */
const PROV=[
 {id:'gemini',nome:'Google Gemini',shape:'gemini',url:'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',doc:'https://ai.google.dev/gemini-api/docs',tier:'gratis-limite',key:1},
 {id:'groq',nome:'Groq',shape:'openai',url:'https://api.groq.com/openai/v1/chat/completions',doc:'https://console.groq.com/docs',tier:'gratis-limite',key:1},
 {id:'cerebras',nome:'Cerebras',shape:'openai',url:'https://api.cerebras.ai/v1/chat/completions',doc:'https://inference-docs.cerebras.ai',tier:'gratis-limite',key:1},
 {id:'openrouter',nome:'OpenRouter',shape:'openai',url:'https://openrouter.ai/api/v1/chat/completions',doc:'https://openrouter.ai/docs',tier:'gratis-limite',key:1},
 {id:'mistral',nome:'Mistral AI',shape:'openai',url:'https://api.mistral.ai/v1/chat/completions',doc:'https://docs.mistral.ai',tier:'gratis-limite',key:1},
 {id:'sambanova',nome:'SambaNova',shape:'openai',url:'https://api.sambanova.ai/v1/chat/completions',doc:'https://docs.sambanova.ai',tier:'gratis-limite',key:1},
 {id:'cohere',nome:'Cohere',shape:'cohere',url:'https://api.cohere.com/v1/chat',doc:'https://docs.cohere.com',tier:'gratis-limite',key:1},
 {id:'nvidia',nome:'NVIDIA NIM',shape:'openai',url:'https://integrate.api.nvidia.com/v1/chat/completions',doc:'https://docs.nvidia.com/nim',tier:'creditos',key:1},
 {id:'zai',nome:'Z.AI',shape:'openai',url:'https://api.z.ai/api/paas/v4/chat/completions',doc:'https://docs.z.ai',tier:'creditos',key:1},
 {id:'cloudflare',nome:'Cloudflare Workers AI',shape:'openai',url:'https://api.cloudflare.com/client/v4/accounts/{acc}/ai/v1/chat/completions',doc:'https://developers.cloudflare.com/workers-ai',tier:'gratis-limite',key:1},
 {id:'hackclub',nome:'Hack Club',shape:'openai',url:'https://ai.hackclub.com/proxy/v1/chat/completions',doc:'https://docs.ai.hackclub.com',tier:'gratis',key:1},
 {id:'venice',nome:'Venice',shape:'openai',url:'https://api.venice.ai/api/v1/chat/completions',doc:'https://docs.venice.ai',tier:'pago',key:1},
 {id:'deepseek',nome:'DeepSeek',shape:'openai',url:'https://api.deepseek.com/chat/completions',doc:'https://api-docs.deepseek.com',tier:'pago',key:1},
 {id:'openai',nome:'OpenAI',shape:'openai',url:'https://api.openai.com/v1/chat/completions',doc:'https://platform.openai.com/docs',tier:'pago',key:1},
 {id:'custom',nome:'Personalizado',shape:'openai',url:'',doc:'',tier:'—',key:1}
];
const MODELOS=[
 {id:'gemini-2.5-flash',p:'gemini',n:'Gemini 2.5 Flash',mat:4,vel:4,txt:4,tier:'gratis-limite'},
 {id:'gemini-2.5-flash-lite',p:'gemini',n:'Gemini 2.5 Flash Lite',mat:3,vel:5,txt:3,tier:'gratis-limite'},
 {id:'gemini-2.5-pro',p:'gemini',n:'Gemini 2.5 Pro',mat:5,vel:2,txt:5,tier:'gratis-limite'},
 {id:'llama-3.3-70b-versatile',p:'groq',n:'Llama 3.3 70B',mat:3,vel:5,txt:3,tier:'gratis-limite'},
 {id:'llama-3.1-8b-instant',p:'groq',n:'Llama 3.1 8B Instant',mat:2,vel:5,txt:2,tier:'gratis-limite'},
 {id:'qwen/qwen3-32b',p:'groq',n:'Qwen3 32B',mat:4,vel:4,txt:3,tier:'gratis-limite'},
 {id:'openai/gpt-oss-120b',p:'groq',n:'GPT-OSS 120B',mat:4,vel:4,txt:4,tier:'gratis-limite'},
 {id:'llama-3.3-70b',p:'cerebras',n:'Llama 3.3 70B (Cerebras)',mat:3,vel:5,txt:3,tier:'gratis-limite'},
 {id:'qwen-3-32b',p:'cerebras',n:'Qwen3 32B (Cerebras)',mat:4,vel:5,txt:3,tier:'gratis-limite'},
 {id:'openai/gpt-4o-mini',p:'openrouter',n:'GPT-4o mini',mat:3,vel:4,txt:4,tier:'creditos'},
 {id:'google/gemini-2.5-flash',p:'openrouter',n:'Gemini 2.5 Flash (OR)',mat:4,vel:4,txt:4,tier:'creditos'},
 {id:'meta-llama/llama-3.3-70b-instruct',p:'openrouter',n:'Llama 3.3 70B (OR)',mat:3,vel:4,txt:3,tier:'creditos'},
 {id:'qwen/qwen3-235b-a22b',p:'openrouter',n:'Qwen3 235B',mat:5,vel:3,txt:4,tier:'creditos'},
 {id:'mistral-small-latest',p:'mistral',n:'Mistral Small',mat:3,vel:5,txt:3,tier:'gratis-limite'},
 {id:'mistral-medium-latest',p:'mistral',n:'Mistral Medium',mat:4,vel:3,txt:4,tier:'pago'},
 {id:'magistral-small-latest',p:'mistral',n:'Magistral Small (raciocínio)',mat:4,vel:3,txt:3,tier:'gratis-limite'},
 {id:'Meta-Llama-3.3-70B-Instruct',p:'sambanova',n:'Llama 3.3 70B (Samba)',mat:3,vel:4,txt:3,tier:'gratis-limite'},
 {id:'DeepSeek-R1',p:'sambanova',n:'DeepSeek R1 (Samba)',mat:5,vel:2,txt:4,tier:'gratis-limite'},
 {id:'command-r-plus',p:'cohere',n:'Command R+',mat:3,vel:3,txt:4,tier:'creditos'},
 {id:'command-r',p:'cohere',n:'Command R',mat:3,vel:4,txt:3,tier:'gratis-limite'},
 {id:'meta/llama-3.3-70b-instruct',p:'nvidia',n:'Llama 3.3 70B (NIM)',mat:3,vel:4,txt:3,tier:'creditos'},
 {id:'deepseek-ai/deepseek-r1',p:'nvidia',n:'DeepSeek R1 (NIM)',mat:5,vel:2,txt:4,tier:'creditos'},
 {id:'glm-4.6',p:'zai',n:'GLM 4.6',mat:4,vel:3,txt:4,tier:'creditos'},
 {id:'glm-4.5-flash',p:'zai',n:'GLM 4.5 Flash',mat:3,vel:5,txt:3,tier:'gratis-limite'},
 {id:'@cf/meta/llama-3.3-70b-instruct-fp8-fast',p:'cloudflare',n:'Llama 3.3 70B (CF)',mat:3,vel:4,txt:3,tier:'gratis-limite'},
 {id:'openai/gpt-4o-mini',p:'hackclub',n:'GPT-4o mini (HC)',mat:3,vel:4,txt:4,tier:'gratis'},
 {id:'qwen/qwen3-32b',p:'hackclub',n:'Qwen3 32B (HC)',mat:4,vel:4,txt:3,tier:'gratis'},
 {id:'zai-org-glm-5-1',p:'venice',n:'GLM 5.1 (Venice)',mat:4,vel:3,txt:4,tier:'pago'},
 {id:'venice-uncensored',p:'venice',n:'Venice Uncensored',mat:3,vel:3,txt:4,tier:'pago'},
 {id:'deepseek-chat',p:'deepseek',n:'DeepSeek Chat',mat:4,vel:4,txt:4,tier:'pago'},
 {id:'deepseek-reasoner',p:'deepseek',n:'DeepSeek Reasoner',mat:5,vel:2,txt:4,tier:'pago'},
 {id:'gpt-4o-mini',p:'openai',n:'GPT-4o mini (OpenAI)',mat:3,vel:4,txt:4,tier:'pago'},
 {id:'gpt-4.1-mini',p:'openai',n:'GPT-4.1 mini',mat:4,vel:4,txt:4,tier:'pago'}
].map((m,i)=>Object.assign(m,{ord:m.mat*3+m.vel*2+m.txt*2,verif:'2026-11'}));

const pById=id=>PROV.find(p=>p.id===id);
const keyDe=p=>LS.get('key:'+p.id,'');
const setKey=(p,v)=>LS.set('key:'+p.id,v);
const selProv=()=>cfg('prov','');
const selMod=()=>cfg('model','');
const usarIA=()=>cfg('usarIA',true);
const usarGab=()=>cfg('usarGab',false);
const usarDicas=()=>cfg('usarDicas',true);
const stats=()=>LS.get('stats',{});
const marcar=(id,ok,ms)=>{
  const s=stats(),r=s[id]||{n:0,ok:0,ms:0};
  r.n++;if(ok)r.ok++;r.ms=r.ms?Math.round((r.ms+r.ms)/2):ms;
  s[id]=r;LS.set('stats',s);
};
const cool=LS.get('cool',{});
const salvarCool=()=>LS.set('cool',cool);

const cache=new Map();
const emVoo=new Map();
const cacheKey=(m,txt)=>m+'|'+hash(txt);

function adaptar(p,model,prompt){
  if(p.shape==='gemini')
    return {url:p.url.replace('{model}',model),headers:{'Content-Type':'application/json','x-goog-api-key':keyDe(p)},
      body:{contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0,maxOutputTokens:700}}};
  if(p.shape==='cohere')
    return {url:p.url,headers:{'Content-Type':'application/json',Authorization:'Bearer '+keyDe(p)},
      body:{model,message:prompt,temperature:0}};
  return {url:p.url.replace('{acc}',cfg('acc','')),headers:{'Content-Type':'application/json',Authorization:'Bearer '+keyDe(p)},
    body:{model,messages:[{role:'user',content:prompt}],temperature:0,max_tokens:700}};
}
function lerResposta(p,j){
  if(p.shape==='gemini')return j?.candidates?.[0]?.content?.parts?.map(x=>x.text).join('')||'';
  if(p.shape==='cohere')return j?.text||'';
  return j?.choices?.[0]?.message?.content||'';
}

async function chamarIA(prompt,assunto){
  const pid=selProv(),mid=selMod();
  if(!pid)throw new Error('nenhum provedor selecionado');
  const p=pById(pid);
  if(!p)throw new Error('provedor desconhecido');
  if(!keyDe(p))throw new Error('sem chave em '+p.nome);
  const model=mid||(MODELOS.find(m=>m.p===pid)||{}).id;
  if(!model)throw new Error('sem modelo');

  const ck=cacheKey(model,assunto+prompt);
  if(cache.has(ck))return {texto:cache.get(ck),fonte:'cache'};
  if(emVoo.has(ck))return {texto:(await emVoo.get(ck)).texto,fonte:'junto'};

  const req=adaptar(p,model,prompt);
  const ctl=new AbortController();
  const lim=cfg('timeout',12)*1000;
  const t0=Date.now();
  const tarefa=(async()=>{
    const timer=setTimeout(()=>ctl.abort(),lim);
    try{
      const r=await fetch(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(req.body),signal:ctl.signal});
      if(r.status===429){
        const ra=+r.headers.get('Retry-After')||30;
        cool[p.id]=Date.now()+ra*1000;salvarCool();
        throw new Error(`${p.nome}: limite (429, aguarde ${ra}s)`);
      }
      if(r.status===401||r.status===403){throw new Error(`${p.nome}: chave recusada (${r.status})`)}
      if(r.status===404){throw new Error(`${p.nome}: modelo ou endpoint inexistente (404)`)}
      if(r.status===400){const t=await r.text().catch(()=>'');throw new Error(`${p.nome}: requisição inválida (400) ${t.slice(0,90)}`)}
      if(r.status>=500){throw new Error(`${p.nome}: servidor ${r.status}`)}
      if(!r.ok)throw new Error(`${p.nome}: HTTP ${r.status}`);
      const j=await r.json().catch(()=>null);
      const txt=norm(lerResposta(p,j));
      if(!txt)throw new Error(p.nome+': resposta vazia');
      cache.set(ck,txt);
      marcar(p.id,true,Date.now()-t0);
      return {texto:txt};
    }catch(e){
      marcar(p.id,false,Date.now()-t0);
      if(e.name==='AbortError')throw new Error(p.nome+': tempo esgotado');
      throw e;
    }finally{clearTimeout(timer);emVoo.delete(ck)}
  })();
  emVoo.set(ck,tarefa);
  return {texto:(await tarefa).texto,fonte:'rede'};
}

/* ======================= 7. PROMPTS ======================= */
function promptDe(p,assunto,erro){
  const base=`Enunciado:\n${p.texto}`;
  const cab={matematica:'Você resolve matemática de forma objetiva. Mostre a conta em 1 linha.',
    ciencia:'Você explica ciências de forma direta, sem rodeios.',
    texto:'Você interpreta textos: aponte a evidência e conclua.',
    historia:'Você responde história com causa, fato e consequência.',
    dissertativa:'Você monta resposta dissertativa em 3 tópicos curtos.'}[assunto]||'Você responde de forma curta e correta.';
  const opc=p.opcoes.length?`\nAlternativas:\n${p.opcoes.map((o,i)=>`${i+1}) ${o}`).join('\n')}`:'';
  const campos=p.campos.length?`\nCampos a preencher: ${p.campos.map(c=>c.tipo).join(', ')}`:'';
  const err=erro?`\nA tentativa anterior falhou (${erro}). Reveja o cálculo.`:'';
  return `${cab}\n\n${base}${opc}${campos}${err}\n\nResponda em no máximo 5 linhas. Se for alternativa, diga o número. Se for número, dê só o valor final.`;
}

/* ======================= 8. UI ======================= */
const box=document.createElement('div');
box.id='vn';
box.innerHTML=`
<div id="vn-h"><b>⣿ Venice <span id="vn-v">v${V}</span></b><span id="vn-d">arraste</span></div>
<div id="vn-tabs">
  <button data-t="main" class="on">Principal</button>
  <button data-t="local">Local</button>
  <button data-t="ias">IAs</button>
  <button data-t="hist">Histórico</button>
  <button data-t="cfg">Config</button>
</div>
<div id="vn-body"></div>`;
document.body.appendChild(box);

const st=document.createElement('style');
st.textContent=`
#vn{position:fixed;right:14px;bottom:14px;z-index:2147483647;width:360px;max-width:calc(100vw - 16px);
 font:12px/1.45 system-ui,sans-serif;background:#111318;color:#e8eaf0;border:1px solid #2b2f3a;
 border-radius:12px;padding:9px 11px;box-shadow:0 12px 32px rgba(0,0,0,.55)}
#vn-h{font-weight:700;margin:-3px -3px 6px;padding:3px;display:flex;justify-content:space-between;
 align-items:center;color:#9ecbff;cursor:grab;user-select:none;touch-action:none;border-radius:6px;font-size:12.5px}
#vn-h.drag{cursor:grabbing;background:#171b22}
#vn-v,#vn-d{font-weight:400;font-size:10px;color:#4d5566}
#vn-tabs{display:flex;gap:3px;margin-bottom:6px}
#vn-tabs button{flex:1;font-size:10px;padding:5px 2px;background:#151920;border:1px solid #242a34;
 color:#8b93a5;border-radius:6px;cursor:pointer}
#vn-tabs button.on{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
#vn-body{max-height:min(62vh,440px);overflow:auto}
.vn-card{background:#0a0c10;border:1px solid #1d222b;border-radius:8px;padding:7px;margin-bottom:6px;font-size:11px}
.vn-lbl{font-size:9.5px;color:#5d6577;text-transform:uppercase;letter-spacing:.04em}
.vn-row{display:flex;gap:5px;margin-top:5px;align-items:center}
#vn button.act{flex:1;cursor:pointer;border:1px solid #2f3542;background:#1a1e26;color:#e8eaf0;
 border-radius:7px;padding:7px;font:inherit;font-size:11.5px}
#vn button.act:hover{background:#252b36}
#vn button.pri{background:#1d4ed8;border-color:#1d4ed8}
#vn button.ok{background:#14532d;border-color:#166534;color:#86efac}
.vn-in{flex:1;min-width:0;background:#0a0c10;border:1px solid #2f3542;border-radius:6px;color:#e8eaf0;
 padding:5px 6px;font:inherit;font-size:10.5px}
.vn-sel{flex:1;min-width:0;background:#0a0c10;border:1px solid #2f3542;border-radius:6px;color:#e8eaf0;
 padding:5px;font:inherit;font-size:10.5px}
.vn-mini{font-size:9.5px;color:#6b7385}
.vn-tag{display:inline-block;padding:1px 5px;border-radius:4px;font-size:9px;margin-left:4px}
.t-alta{background:#14532d;color:#86efac}.t-media{background:#4a3a10;color:#fcd34d}
.t-baixa{background:#4a1d1d;color:#fca5a5}
.vn-item{border-bottom:1px solid #1a1f28;padding:5px 0;font-size:10.5px}
.vn-item b{color:#9ecbff;font-weight:600}
#vn label{display:flex;gap:5px;align-items:center;color:#8b93a5;font-size:10.5px;margin-top:4px}
`;
document.head.appendChild(st);

const body=box.querySelector('#vn-body');
const POS='vk4:pos';
function place(x,y){
  const r=box.getBoundingClientRect();
  box.style.left=Math.min(Math.max(8,x),innerWidth-r.width-8)+'px';
  box.style.top=Math.min(Math.max(8,y),innerHeight-r.height-8)+'px';
  box.style.right=box.style.bottom='auto';
}
try{const p=LS.get('pos',null);if(p)place(p.x,p.y)}catch(e){}
let drag=null;
const hh=box.querySelector('#vn-h');
hh.addEventListener('pointerdown',e=>{
  if(e.target.closest('button,input,select,label'))return;
  const r=box.getBoundingClientRect();
  drag={dx:e.clientX-r.left,dy:e.clientY-r.top};hh.classList.add('drag');
  try{hh.setPointerCapture(e.pointerId)}catch(_){}
  e.preventDefault();
});
hh.addEventListener('pointermove',e=>{if(drag)place(e.clientX-drag.dx,e.clientY-drag.dy)});
const soltar=()=>{
  if(!drag)return;drag=null;hh.classList.remove('drag');
  const r=box.getBoundingClientRect();LS.set('pos',{x:r.left,y:r.top});
};
hh.addEventListener('pointerup',soltar);hh.addEventListener('pointercancel',soltar);

let aba='main';
const irPara=t=>{aba=t;box.querySelectorAll('#vn-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));desenhar()};
box.querySelectorAll('#vn-tabs button').forEach(b=>b.onclick=()=>irPara(b.dataset.t));

/* ======================= 9. ESTADO ======================= */
let ultimo=null, rodando=false, estado='idle', baseAtual='';

/* ======================= 10. ORQUESTRADOR ======================= */
function extrair(){
  const texto=lerEnunciado();
  if(!texto)return null;
  const opcoes=lerOpcoes(),campos=lerCampos();
  const {assunto,tipo}=classificar(texto,opcoes);
  return {texto,opcoes,campos,assunto,tipo,base:hash(texto)};
}

async function resolver(comIA){
  if(rodando)return;
  const p=extrair();
  if(!p){ultimo={erro:'Nada legível na página.'};desenhar();return}
  if(p.base!==baseAtual){baseAtual=p.base;estado='idle'}
  const t0=Date.now();
  ultimo={texto:p.texto,assunto:p.assunto,tipo:p.tipo,metodo:'—',conf:'baixa',etapas:[],fonte:'—',ms:0,erro:null};
  rodando=true;desenhar();
  try{
    /* 2. memória */
    const m=memGet(p.base);
    if(m&&m.valores&&m.valores.length){
      ultimo.valores=m.valores;ultimo.metodo=m.metodo;ultimo.etapas=m.etapas||[];
      ultimo.conf=m.conf||'media';ultimo.fonte='memória';
      ultimo.ms=Date.now()-t0;estado='pronto';return;
    }
    /* 3. solucionador determinístico */
    const sol=SOLV[p.assunto]?.(p);
    if(sol){
      ultimo.valores=sol.valores;ultimo.metodo='cálculo local';ultimo.etapas=sol.etapas;
      ultimo.conf=sol.confianca;ultimo.fonte='local';
      if(p.tipo==='opcoes'&&sol.valores.length){
        const casou=MAT.casar(num(sol.valores[0]),p.opcoes);
        if(casou){ultimo.escolha=casou;ultimo.etapas.push('alternativa correspondente: '+casou)}
      }
      memSet(p.base,{valores:sol.valores,metodo:'cálculo local',etapas:sol.etapas,conf:sol.confianca});
      ultimo.ms=Date.now()-t0;estado='pronto';
      if(!comIA)return;
    }
    /* 4. dicas visíveis */
    if(usarDicas()){
      const d=lerDicas();
      if(d.length)ultimo.etapas.push('dica da página: '+d.join(' ').slice(0,240));
    }
    /* 5. IA */
    if(comIA&&usarIA()){
      if(!selProv()){ultimo.etapas.push('IA ligada mas sem provedor escolhido');}
      else{
        ultimo.fonte='IA…';desenhar();
        try{
          const r=await chamarIA(promptDe(p,p.assunto,ultimo.erro),p.assunto);
          ultimo.ia=r.texto;ultimo.fonte=r.fonte==='cache'?'IA (cache)':'IA';
          ultimo.conf=ultimo.conf==='alta'?'alta':'media';
        }catch(e){ultimo.erro=e.message;ultimo.fonte='IA falhou'}
      }
    }
    if(!ultimo.valores&&!ultimo.ia&&!ultimo.etapas.length)ultimo.erro='Sem dados suficientes para resolver.';
    ultimo.ms=Date.now()-t0;
    estado=ultimo.valores||ultimo.ia?'pronto':'falhou';
    histAdd({base:p.base,assunto:p.assunto,tipo:p.tipo,metodo:ultimo.metodo,conf:ultimo.conf,fonte:ultimo.fonte,ms:ultimo.ms,ok:!ultimo.erro});
  }catch(e){ultimo.erro=e.message}
  finally{rodando=false;desenhar()}
}

/* ======================= 11. PREENCHER (sem verificar) ======================= */
function escreve(el,v){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  el.focus?.();
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,String(v));
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
  el.blur?.();
}
function preencher(){
  const p=extrair();
  if(!p||!ultimo)return;
  let n=0;
  const alvo=ultimo.escolha||ultimo.valores?.[0];
  if(!alvo)return desenhar('nada para preencher');
  if(p.tipo==='opcoes'){
    const li=[...raiz().querySelectorAll('li')].find(x=>low(x.innerText)===low(alvo));
    if(li){(li.querySelector('button,input,[role="radio"]')||li).click();n++}
  }else{
    const el=p.campos[0]?.el?.querySelector?.('input,textarea')||p.campos[0]?.el;
    if(el&&'value' in el){escreve(el,alvo);n++}
  }
  desenhar(n?'preenchido':'não achei o campo');
}
/* verificação só quando o usuário manda */
function verificar(){
  const b=[...document.querySelectorAll('button')].find(x=>!x.disabled&&
    /^(verificar|concluir|enviar|checar)$/i.test(norm(x.innerText)));
  if(!b)return desenhar('sem botão de verificar');
  b.click();
  desenhar('verificado');
}

/* ======================= 12. DESENHO DAS ABAS ======================= */
function desenhar(aviso){
  const p=ultimo;
  if(aba==='main'){
    const conf=p?.conf?`<span class="vn-tag t-${p.conf}">${p.conf}</span>`:'';
    body.innerHTML=`
<div class="vn-card"><span class="vn-lbl">tipo</span> ${p?`${p.tipo} · ${p.assunto}`:'—'} ${conf}</div>
<div class="vn-card"><span class="vn-lbl">método</span> ${p?.metodo||'—'}
  <div class="vn-mini">fonte: ${p?.fonte||'—'}${p?.ms?` · ${p.ms}ms`:''} · IA ${usarIA()?'ligada':'desligada'}</div></div>
<div class="vn-card"><span class="vn-lbl">explicação</span>
  ${p?.etapas?.length?p.etapas.map(e=>'<div class="vn-mini">· '+e+'</div>').join(''):'<div class="vn-mini">—</div>'}
  ${p?.valores?.length?`<div style="margin-top:5px;color:#86efac"><b>${p.valores.join(' | ')}</b></div>`:''}
  ${p?.escolha?`<div style="color:#86efac">alternativa: ${p.escolha}</div>`:''}
  ${p?.ia?`<div style="margin-top:5px">${p.ia}</div>`:''}
  ${p?.erro?`<div style="color:#fca5a5;margin-top:4px">${p.erro}</div>`:''}</div>
${aviso?`<div class="vn-card vn-mini">${aviso}</div>`:''}
<div class="vn-row"><button class="act pri" id="vn-r">Resolver</button>
  <button class="act" id="vn-ria">Resolver com IA</button></div>
<div class="vn-row"><button class="act" id="vn-p">Preencher</button>
  <button class="act" id="vn-v">Verificar</button></div>`;
    body.querySelector('#vn-r').onclick=()=>resolver(false);
    body.querySelector('#vn-ria').onclick=()=>resolver(true);
    body.querySelector('#vn-p').onclick=preencher;
    body.querySelector('#vn-v').onclick=verificar;
  }
  if(aba==='local'){
    const p=extrair();
    body.innerHTML=`
<div class="vn-card"><span class="vn-lbl">leitura da página</span>
 <div class="vn-mini">assunto: ${p?.assunto||'—'} · tipo: ${p?.tipo||'—'} · alternativas: ${p?.opcoes.length||0} · campos: ${p?.campos.length||0}</div>
 <div class="vn-mini" style="margin-top:4px;white-space:pre-wrap">${(p?.texto||'').slice(0,300)||'—'}</div></div>
<div class="vn-card"><span class="vn-lbl">dicas disponíveis</span>
 ${lerDicas().length?lerDicas().map(d=>'<div class="vn-mini">· '+d.slice(0,160)+'</div>').join(''):'<div class="vn-mini">nenhuma visível</div>'}
 <div class="vn-row"><button class="act" id="vn-dica">mostrar dica</button></div></div>
<div class="vn-card"><span class="vn-lbl">solucionadores</span>
 <div class="vn-mini">aritmética · fração · porcentagem · proporção · equação · potência · raiz · unidade · geometria · dissertativa</div></div>`;
    body.querySelector('#vn-dica').onclick=async()=>{
      const b=[...document.querySelectorAll('button')].find(x=>!x.disabled&&/mostrar dicas?|próxima dica|proxima dica/i.test(norm(x.innerText)));
      if(b){b.click();await wait(400)}
      desenhar();
    };
  }
  if(aba==='ias'){
    const provs=PROV.filter(x=>x.id!=='custom');
    const filtro=cfg('filtro','');
    const lista=MODELOS.filter(m=>(!filtro||low(m.n).includes(low(filtro)))).sort((a,b)=>b.ord-a.ord);
    body.innerHTML=`
<div class="vn-card"><span class="vn-lbl">chaves por provedor</span>
 ${provs.map(x=>`<div class="vn-item"><b>${x.nome}</b> <span class="vn-mini">${x.tier}</span>
   <div class="vn-row"><input class="vn-in" id="k-${x.id}" placeholder="${keyDe(x)?'chave salva':''}" type="password">
   <button class="act" data-k="${x.id}">salvar</button></div>
   <div class="vn-mini">${stats()[x.id]?`ok ${stats()[x.id].ok}/${stats()[x.id].n} · ${stats()[x.id].ms}ms`:'sem uso'}${x.doc?` · <a href="${x.doc}" target="_blank" style="color:#7fb2ff">doc</a>`:''}</div></div>`).join('')}</div>
<div class="vn-card"><span class="vn-lbl">modelo ativo</span>
 <select class="vn-sel" id="vn-mod"><option value="">— escolha —</option>
 ${lista.map(m=>`<option value="${m.id}" ${selMod()===m.id?'selected':''}>${m.n} (${pById(m.p)?.nome||m.p}) · M${m.mat} V${m.vel} T${m.txt}</option>`).join('')}</select>
 <div class="vn-row"><input class="vn-in" id="vn-filtro" placeholder="buscar modelo" value="${filtro}">
 <button class="act" id="vn-fok">filtrar</button></div>
 <div class="vn-mini">M=matemática V=velocidade T=texto (1-5). Ordenado por utilidade.</div></div>`;
    body.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.k,v=body.querySelector('#k-'+id).value.trim();
      if(!v)return;setKey(pById(id),v);delete cool[id];salvarCool();desenhar('chave de '+pById(id).nome+' salva');
    });
    body.querySelector('#vn-mod').onchange=e=>{setCfg('model',e.target.value);setCfg('prov',(MODELOS.find(m=>m.id===e.target.value)||{}).p||'');desenhar()};
    body.querySelector('#vn-fok').onclick=()=>{setCfg('filtro',body.querySelector('#vn-filtro').value);desenhar()};
  }
  if(aba==='hist'){
    const h=LS.get('hist',[]);
    body.innerHTML=`<div class="vn-card"><span class="vn-lbl">histórico (${h.length})</span>
 ${h.length?h.slice(0,40).map(x=>`<div class="vn-item"><b>${x.assunto}</b> ${x.conf} · ${x.fonte} · ${x.ms}ms</div>`).join(''):'<div class="vn-mini">vazio</div>'}
 <div class="vn-row"><button class="act" id="vn-hl">limpar histórico</button></div></div>`;
    body.querySelector('#vn-hl').onclick=()=>{LS.del('hist');desenhar()};
  }
  if(aba==='cfg'){
    body.innerHTML=`
<label><input type="checkbox" id="c-ia" ${usarIA()?'checked':''}> IA habilitada</label>
<label><input type="checkbox" id="c-dica" ${usarDicas()?'checked':''}> usar dicas da página</label>
<label><input type="checkbox" id="c-gab" ${usarGab()?'checked':''}> usar gabarito interno (itemData)</label>
<div class="vn-card"><span class="vn-lbl">timeout (s)</span>
 <input class="vn-in" id="c-to" type="number" min="4" max="60" value="${cfg('timeout',12)}"></div>
<div class="vn-card"><span class="vn-lbl">conta Cloudflare (para Workers AI)</span>
 <input class="vn-in" id="c-acc" placeholder="account id" value="${cfg('acc','')}"></div>
<div class="vn-card"><span class="vn-lbl">segurança</span>
 <div class="vn-mini">Sem backend, as chaves ficam em localStorage e vão junto no corpo da requisição feita pelo navegador. Quem abrir o devtools vê. Com proxy próprio, a chave fica no servidor.</div>
 <input class="vn-in" id="c-proxy" placeholder="proxy (https://...)" value="${cfg('proxy','')}"></div>
<div class="vn-row"><button class="act" id="c-clear">apagar memória e histórico</button></div>
<div class="vn-row"><button class="act" id="c-rm">remover Venice</button></div>`;
    body.querySelector('#c-ia').onchange=e=>{setCfg('usarIA',e.target.checked);desenhar()};
    body.querySelector('#c-dica').onchange=e=>{setCfg('usarDicas',e.target.checked);desenhar()};
    body.querySelector('#c-gab').onchange=e=>{setCfg('usarGab',e.target.checked);desenhar()};
    body.querySelector('#c-to').onchange=e=>{setCfg('timeout',+e.target.value||12);desenhar()};
    body.querySelector('#c-acc').onchange=e=>setCfg('acc',e.target.value.trim());
    body.querySelector('#c-proxy').onchange=e=>setCfg('proxy',e.target.value.trim());
    body.querySelector('#c-clear').onclick=()=>{LS.limpar(false);desenhar('memória e histórico apagados')};
    body.querySelector('#c-rm').onclick=()=>window.__venice.destroy();
  }
}
desenhar();

document.addEventListener('keydown',at,true);
function at(e){
  if(e.altKey&&e.key.toLowerCase()==='r'){e.preventDefault();resolver(false)}
  if(e.altKey&&e.key.toLowerCase()==='p'){e.preventDefault();preencher()}
}
window.__venice={destroy(){
  document.removeEventListener('keydown',at,true);
  box.remove();st.remove();delete window.__venice;
},resolver,preencher,verificar};
})();