import{w as l,n as e,L as a}from"./components-DwEURCTs.js";import{c as t,B as h}from"./index-DN1fSIrR.js";/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],d=t("chevron-right",m);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]],u=t("house",x);function g({items:n,showBackButton:r=!0,dashboardPath:o="/"}){const c=l();return e.jsxs("nav",{className:"flex items-center gap-2 text-sm text-muted-foreground print:hidden",children:[r&&e.jsx(h,{variant:"ghost",size:"sm",onClick:()=>c(-1),className:"mr-1 h-8 px-2",children:"← Back"}),e.jsxs(a,{to:o,className:"flex items-center gap-1 transition-colors hover:text-foreground",children:[e.jsx(u,{className:"size-4"}),e.jsx("span",{children:"Documents"})]}),n.map((s,i)=>e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(d,{className:"size-4"}),s.href?e.jsx(a,{to:s.href,className:"transition-colors hover:text-foreground",children:s.label}):e.jsx("span",{className:"font-medium text-foreground",children:s.label})]},i))]})}export{g as B};
