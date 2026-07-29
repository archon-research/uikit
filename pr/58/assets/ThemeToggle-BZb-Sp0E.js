import{j as t}from"./index-gse4nYL_.js";import{aM as g}from"./css-DUmBrdeP.js";import{c as r}from"./createLucideIcon-_rr2-yhm.js";/**
 * @license lucide-react v1.25.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["path",{d:"M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z",key:"1pdavp"}],["path",{d:"M20.054 15.987H3.946",key:"14rxg9"}]],x=r("laptop",k);/**
 * @license lucide-react v1.25.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],b=r("moon",_);/**
 * @license lucide-react v1.25.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],f=r("sun",y),n={root:"themeToggle__root",option:"themeToggle__option",input:"themeToggle__input",iconButton:"themeToggle__iconButton"},m=(...a)=>a.filter(Boolean).join(" "),p=[{mode:"auto",label:"Auto"},{mode:"light",label:"Light"},{mode:"dark",label:"Dark"}],i=["auto","light","dark"];function j(a){const o=i.indexOf(a);return i[(o+1)%i.length]??"auto"}function h({mode:a}){const o={"aria-hidden":!0,size:14,strokeWidth:1.75,absoluteStrokeWidth:!0};switch(a){case"auto":return t.jsx(x,{...o});case"light":return t.jsx(f,{...o});default:return t.jsx(b,{...o})}}function $({variant:a="segmented",className:o}={}){var l;const{mode:c,setMode:s}=g();if(a==="icon"){const e=j(c),d=((l=p.find(u=>u.mode===e))==null?void 0:l.label)??e;return t.jsx("button",{type:"button",className:m(n.root,`${n.root}--variant_icon`,n.iconButton,o),"aria-label":`Theme: ${c}. Switch to ${d}.`,title:`Theme: ${c}`,"data-scope":"theme-toggle","data-part":"icon-button","data-mode":c,onClick:()=>s(e),children:t.jsx(h,{mode:c})})}return t.jsx("div",{role:"radiogroup","aria-label":"Theme mode",className:m(n.root,`${n.root}--variant_segmented`,o),"data-scope":"theme-toggle","data-part":"root",children:p.map(e=>{const d=c===e.mode;return t.jsxs("label",{className:n.option,"data-part":"option","data-active":d?"":void 0,children:[t.jsx("input",{type:"radio",name:"theme-mode","aria-label":e.label,checked:d,onChange:()=>s(e.mode),className:n.input}),t.jsx(h,{mode:e.mode}),e.label]},e.mode)})})}export{$ as T};
