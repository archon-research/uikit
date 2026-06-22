import{j as e}from"./index-BCU_NtZW.js";import{u as s}from"./css-CbGVj0y6.js";import{c as r}from"./createLucideIcon-BSadag7M.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["path",{d:"M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z",key:"1pdavp"}],["path",{d:"M20.054 15.987H3.946",key:"14rxg9"}]],i=r("laptop",l);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]],p=r("moon",c);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],h=r("sun",u),m={display:"flex",alignItems:"center",gap:6,width:"100%",boxSizing:"border-box",padding:4,borderRadius:10,border:"1px solid var(--colors-border-subtle, #d0d5dd)",background:"var(--colors-surface-subtle, #f8f9fb)"},n={display:"inline-flex",alignItems:"center",justifyContent:"center",flex:1,minWidth:0,gap:6,border:0,borderRadius:8,padding:"6px 10px",fontSize:12,lineHeight:1.2,cursor:"pointer",background:"transparent",color:"var(--colors-text-muted, #667085)"},b={position:"absolute",width:1,height:1,margin:-1,padding:0,border:0,overflow:"hidden",clip:"rect(0 0 0 0)",clipPath:"inset(100%)",whiteSpace:"nowrap"},f={background:"var(--colors-surface-default, #ffffff)",color:"var(--colors-text-default, #111827)",boxShadow:"0 1px 2px rgba(0, 0, 0, 0.08)"},x=[{mode:"auto",label:"Auto"},{mode:"light",label:"Light"},{mode:"dark",label:"Dark"}];function g({mode:a}){const t={"aria-hidden":!0,size:14,strokeWidth:1.75,absoluteStrokeWidth:!0};switch(a){case"auto":return e.jsx(i,{...t});case"light":return e.jsx(h,{...t});default:return e.jsx(p,{...t})}}function j(){const{mode:a,setMode:t}=s();return e.jsx("div",{role:"radiogroup","aria-label":"Theme mode",style:m,children:x.map(o=>{const d=a===o.mode;return e.jsxs("label",{style:d?{...n,...f}:n,children:[e.jsx("input",{type:"radio",name:"theme-mode","aria-label":o.label,checked:d,onChange:()=>t(o.mode),style:b}),e.jsx(g,{mode:o.mode}),o.label]},o.mode)})})}export{j as T};
