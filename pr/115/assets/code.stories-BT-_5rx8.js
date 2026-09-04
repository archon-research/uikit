import{j as e}from"./index-Cv4DGFQw.js";import{b as t}from"./css-JXLaXsS0.js";const i=(...n)=>n.filter(Boolean).join(" ");function s({className:n,children:r,...o}){return e.jsx("code",{...o,className:i("code","code--variant_inline",n),"data-scope":"code","data-part":"inline",children:r})}function l({className:n,children:r,...o}){return e.jsx("pre",{...o,className:i("code","code--variant_block",n),"data-scope":"code","data-part":"block",children:e.jsx("code",{children:r})})}const x={title:"Atoms/Code"},a=t({display:"grid",gap:"6",p:"6",backgroundColor:"surface.canvas",fontFamily:"sans",color:"text.default",maxWidth:"68ch"}),c=t({fontSize:"md",lineHeight:"relaxed",color:"text.default"}),d=t({fontSize:"sm",color:"text.muted"}),u=()=>e.jsx("div",{className:a,children:e.jsxs("p",{className:c,children:["Run ",e.jsx(s,{children:"npm run generate"})," to regenerate the styled-system, then import tokens from ",e.jsx(s,{children:"@archon-research/design-system"}),". The"," ",e.jsx(s,{children:"surface.canvas"})," token backs the page frame."]})}),m=t({fontSize:"sm",lineHeight:"relaxed",color:"text.default"}),f=()=>e.jsxs("div",{className:a,children:[e.jsxs("p",{className:c,children:["In 16px body copy, ",e.jsx(s,{children:"npm run generate"})," tracks the line it sits in."]}),e.jsxs("p",{className:m,children:["In 14px caption copy, ",e.jsx(s,{children:"npm run generate"})," scales down with the surrounding text."]})]}),j=()=>e.jsxs("div",{className:a,children:[e.jsx("p",{className:d,children:"Multi-line block"}),e.jsx(l,{children:`import { Panel, StatTile } from '@archon-research/design-system';

export function Summary() {
  return (
    <Panel title="Overview">
      <StatTile label="AUM" value="$10.68M" />
    </Panel>
  );
}`})]}),g=()=>e.jsxs("div",{className:a,children:[e.jsxs("p",{className:c,children:["Install the package with ",e.jsx(s,{children:"npm i @archon-research/design-system"})," ","and wire the provider:"]}),e.jsx(l,{children:`import { ThemeProvider } from '@archon-research/design-system';

<ThemeProvider>
  <App />
</ThemeProvider>`})]});typeof window<"u"&&window.document&&window.document.createElement&&document.documentElement.setAttribute("data-storyloaded","");export{j as Block,g as Both,u as Inline,f as InlineInProse,x as default};
