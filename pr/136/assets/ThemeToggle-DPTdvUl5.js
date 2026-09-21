import{j as t}from"./index-lgiDflla.js";import{u as _}from"./ThemeProvider-YippRPke.js";import{c as r}from"./createLucideIcon-CJmqRW1I.js";/**
 * @license lucide-react v1.46.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g={name:"laptop",size:24,node:[["path",{d:"M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z",key:"1pdavp"}],["path",{d:"M20.054 15.987H3.946",key:"14rxg9"}]]};g.node;const y=r(g);/**
 * @license lucide-react v1.46.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k={name:"moon",size:24,node:[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]};k.node;const f=r(k);/**
 * @license lucide-react v1.46.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x={name:"sun",size:24,node:[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]};x.node;const j=r(x),a={root:"themeToggle__root",option:"themeToggle__option",input:"themeToggle__input",iconButton:"themeToggle__iconButton"},p=(...n)=>n.filter(Boolean).join(" "),h=[{mode:"auto",label:"Auto"},{mode:"light",label:"Light"},{mode:"dark",label:"Dark"}],i=["auto","light","dark"];function T(n){const o=i.indexOf(n);return i[(o+1)%i.length]??"auto"}function u({mode:n}){const o={"aria-hidden":!0,size:14,strokeWidth:1.75,absoluteStrokeWidth:!0};switch(n){case"auto":return t.jsx(y,{...o});case"light":return t.jsx(j,{...o});default:return t.jsx(f,{...o})}}function z({variant:n="segmented",appearance:o="chip",className:s}={}){var m;const{mode:c,setMode:l}=_();if(n==="icon"){const e=T(c),d=((m=h.find(b=>b.mode===e))==null?void 0:m.label)??e;return t.jsx("button",{type:"button",className:p(a.root,`${a.root}--variant_icon`,a.iconButton,o==="bare"&&`${a.iconButton}--appearance_bare`,s),"data-appearance":o,"aria-label":`Theme: ${c}. Switch to ${d}.`,title:`Theme: ${c}`,"data-scope":"theme-toggle","data-part":"icon-button","data-mode":c,onClick:()=>l(e),children:t.jsx(u,{mode:c})})}return t.jsx("div",{role:"radiogroup","aria-label":"Theme mode",className:p(a.root,`${a.root}--variant_segmented`,s),"data-scope":"theme-toggle","data-part":"root",children:h.map(e=>{const d=c===e.mode;return t.jsxs("label",{className:a.option,"data-part":"option","data-active":d?"":void 0,children:[t.jsx("input",{type:"radio",name:"theme-mode","aria-label":e.label,checked:d,onChange:()=>l(e.mode),className:a.input}),t.jsx(u,{mode:e.mode}),e.label]},e.mode)})})}export{z as T};
