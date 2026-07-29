import{j as e}from"./index-BW_12cMO.js";import{r as o}from"./css-CoYVp5QC.js";const c=(...s)=>s.filter(Boolean).join(" ");function t({className:s,children:a,...n}){return e.jsx("code",{...n,className:c("code","code--variant_inline",s),"data-scope":"code","data-part":"inline",children:a})}function i({className:s,children:a,...n}){return e.jsx("pre",{...n,className:c("code","code--variant_block",s),"data-scope":"code","data-part":"block",children:e.jsx("code",{children:a})})}const p={title:"Atoms/Code"},r=o({display:"grid",gap:"6",p:"6",backgroundColor:"surface.canvas",fontFamily:"sans",color:"text.default",maxWidth:"68ch"}),d=o({fontSize:"md",lineHeight:"relaxed",color:"text.default"}),l=o({fontSize:"sm",color:"text.muted"}),u=()=>e.jsx("div",{className:r,children:e.jsxs("p",{className:d,children:["Run ",e.jsx(t,{children:"npm run generate"})," to regenerate the styled-system, then import tokens from ",e.jsx(t,{children:"@archon-research/design-system"}),". The"," ",e.jsx(t,{children:"surface.canvas"})," token backs the page frame."]})}),x=()=>e.jsxs("div",{className:r,children:[e.jsx("p",{className:l,children:"Multi-line block"}),e.jsx(i,{children:`import { Panel, StatTile } from '@archon-research/design-system';

export function Summary() {
  return (
    <Panel title="Overview">
      <StatTile label="AUM" value="$10.68M" />
    </Panel>
  );
}`})]}),f=()=>e.jsxs("div",{className:r,children:[e.jsxs("p",{className:d,children:["Install the package with ",e.jsx(t,{children:"npm i @archon-research/design-system"})," ","and wire the provider:"]}),e.jsx(i,{children:`import { ThemeProvider } from '@archon-research/design-system';

<ThemeProvider>
  <App />
</ThemeProvider>`})]});typeof window<"u"&&window.document&&window.document.createElement&&document.documentElement.setAttribute("data-storyloaded","");export{x as Block,f as Both,u as Inline,p as default};
