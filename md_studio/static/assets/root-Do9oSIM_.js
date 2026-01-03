import{r as n,j as e}from"./jsx-runtime-BiXka7E7.js";import{c as y,B as k,a as w,u as T,w as N,T as P,b as C}from"./index-BwWm0JV9.js";import{I as E,F as H}from"./ImportButton-BcqHX3kq.js";import{l as $,n as S,o as B,p as I,_ as V,L as j,O,M as R,q as D,S as F}from"./components-CZmywKMH.js";import{L as W}from"./loader-circle-BRNhzI2j.js";import"./slug-DE7USKAG.js";/**
 * @remix-run/react v2.17.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let M="positions";function q({getKey:a,...i}){let{isSpaMode:o}=$(),d=S(),h=B();I({getKey:a,storageKey:M});let c=n.useMemo(()=>{if(!a)return null;let u=a(d,h);return u!==d.key?u:null},[]);if(o)return null;let m=((u,r)=>{if(!window.history.state||!window.history.state.key){let t=Math.random().toString(32).slice(2);window.history.replaceState({key:t},"")}try{let l=JSON.parse(sessionStorage.getItem(u)||"{}")[r||window.history.state.key];typeof l=="number"&&window.scrollTo(0,l)}catch(t){console.error(t),sessionStorage.removeItem(u)}}).toString();return n.createElement("script",V({},i,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${m})(${JSON.stringify(M)}, ${JSON.stringify(c)})`}}))}const A=n.createContext(void 0),_="md-studio-theme";function b(){return typeof window>"u"?"light":window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}function J({children:a}){const[i,o]=n.useState(()=>{if(typeof window>"u")return"system";const r=localStorage.getItem(_);return r&&["dark","light","system"].includes(r)?r:"system"}),[d,h]=n.useState(()=>{if(typeof window>"u")return"light";const r=localStorage.getItem(_),t=r&&["dark","light","system"].includes(r)?r:"system";return t==="system"?b():t}),[c,m]=n.useState(!1);n.useEffect(()=>{m(!0)},[]),n.useEffect(()=>{const r=document.documentElement,t=i==="system"?b():i;h(t),r.classList.remove("light","dark"),r.classList.add(t)},[i]),n.useEffect(()=>{if(i!=="system")return;const r=window.matchMedia("(prefers-color-scheme: dark)"),t=()=>{const l=b();h(l),document.documentElement.classList.remove("light","dark"),document.documentElement.classList.add(l)};return r.addEventListener("change",t),()=>r.removeEventListener("change",t)},[i]);const u=r=>{o(r),localStorage.setItem(_,r)};return c?e.jsx(A.Provider,{value:{theme:i,setTheme:u,resolvedTheme:d},children:a}):e.jsx(e.Fragment,{children:a})}function z(){const a=n.useContext(A);return a===void 0?{theme:"system",setTheme:()=>{},resolvedTheme:"light"}:a}/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],Y=y("chevron-left",G);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],Q=y("circle-check",K);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54",key:"1djwo0"}],["path",{d:"M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",key:"1tzkfa"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05",key:"14pb5j"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],X=y("earth",U);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],ee=y("info",Z);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]],se=y("menu",te);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],oe=y("moon",ne);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const re=[["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z",key:"2d38gg"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]],ae=y("octagon-x",re);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],L=y("plus",ie);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const de=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],ce=y("sun",de);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const le=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],me=y("triangle-alert",le);function he(){const{theme:a,setTheme:i,resolvedTheme:o}=z(),[d,h]=n.useState(!1);n.useEffect(()=>{h(!0)},[]);const c=a==="dark"||a==="system"&&o==="dark";return d?e.jsx(k,{type:"button",variant:"ghost",size:"icon",className:w("print:hidden"),onClick:()=>i(c?"light":"dark"),"aria-label":c?"Switch to light mode":"Switch to dark mode",title:c?"Switch to light mode":"Switch to dark mode",children:c?e.jsx(ce,{className:"size-4"}):e.jsx(oe,{className:"size-4"})}):e.jsx("div",{className:"h-9 w-9","aria-hidden":"true"})}function ue({docs:a,dashboardPath:i}){const[o,d]=n.useState(!0),[h,c]=n.useState(!0),[m,u]=n.useState(!1),{pathname:r}=S(),{basePath:t}=T(),l=()=>d(s=>!s),p=()=>{h||d(!1)};return n.useEffect(()=>{if(typeof window>"u")return;const s=window.matchMedia("(min-width: 1280px)"),f=window.matchMedia("(max-width: 639px)"),x=v=>{d(v.matches),c(v.matches)},g=v=>{u(v.matches)};return d(s.matches),c(s.matches),u(f.matches),typeof s.addEventListener=="function"?(s.addEventListener("change",x),f.addEventListener("change",g),()=>{s.removeEventListener("change",x),f.removeEventListener("change",g)}):(s.addListener(x),f.addListener(g),()=>{s.removeListener(x),f.removeListener(g)})},[]),e.jsxs("aside",{className:w("flex h-full flex-col border-border bg-muted/20 transition-all duration-200 ease-in-out print:hidden","md:static md:translate-x-0 md:shadow-none",m&&o?"fixed inset-0 z-40 w-screen bg-background":o?"w-72":"w-16"),children:[e.jsxs("div",{className:"sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-border bg-muted/20 px-2 py-3",children:[e.jsx(k,{type:"button",variant:"ghost",size:"icon",className:"shrink-0",onClick:l,"aria-label":o?"Collapse sidebar":"Expand sidebar",children:o?e.jsx(Y,{className:"size-4"}):e.jsx(se,{className:"size-4"})}),o?e.jsxs("div",{className:"flex flex-1 items-center justify-between gap-2",children:[e.jsx("h2",{className:"text-sm font-semibold uppercase tracking-wide text-muted-foreground",children:e.jsx(j,{to:i,children:"MD Studio"})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(E,{variant:"ghost",size:"sm",iconOnly:!0}),e.jsx(k,{asChild:!0,size:"sm",children:e.jsxs(j,{to:N("/new",t),onClick:p,children:[e.jsx(L,{className:"mr-2 size-4","aria-hidden":"true"}),"New"]})})]})]}):e.jsxs(e.Fragment,{children:[e.jsx(E,{variant:"ghost",size:"icon",iconOnly:!0,className:"ml-auto hidden md:inline-flex"}),e.jsx(k,{asChild:!0,size:"icon",variant:"default",className:"hidden md:inline-flex",children:e.jsxs(j,{to:N("/new",t),onClick:p,children:[e.jsx(L,{className:"size-4","aria-hidden":"true"}),e.jsx("span",{className:"sr-only",children:"Create document"})]})})]})]}),e.jsx("div",{className:"no-scrollbar flex-1 overflow-y-auto px-2 py-4",children:a.length===0?e.jsx("p",{className:w("rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground",!o&&"sr-only"),children:"No documents yet. Create your first one!"}):e.jsx("nav",{children:e.jsx("ul",{className:"flex flex-col gap-1",children:a.map(s=>{const f=r===`/doc/${s.slug}`||r===`/doc/${s.slug}/edit`;return e.jsx("li",{children:e.jsxs(j,{to:N(`/doc/${s.slug}`,t),onClick:p,className:w("group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors","hover:bg-muted hover:text-foreground",f?"bg-muted text-foreground":"text-muted-foreground",!o&&"justify-center"),children:[e.jsxs("span",{className:w("relative flex size-5 items-center justify-center"),children:[e.jsx(H,{className:"size-4","aria-hidden":"true"}),s.isPublic?e.jsx(X,{className:"absolute -right-1 -top-1 size-3 text-primary"}):null]}),o?e.jsx("span",{className:"flex-1 truncate",children:s.title}):e.jsx("span",{className:"sr-only",children:s.title})]})},s.slug)})})})}),o?e.jsxs("div",{className:"sticky bottom-0 z-10 shrink-0 border-t border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground",children:["Tip: Press ",e.jsx("span",{className:"font-semibold",children:"N"})," for a new document or"," ",e.jsx("span",{className:"font-semibold",children:"/"})," to focus search."]}):null]})}function fe({docs:a,dashboardPath:i}){const{pathname:o}=S(),{basePath:d}=T(),h=o?o.replace(/\/+$/,"")||"/":"",c=d.replace(/\/+$/,""),m=c&&h.startsWith(c)?h.slice(c.length)||"/":h,u="/doc",r="/new",t="/s",l=m==="/"||m==="",p=m===u||m.startsWith(`${u}/`),s=m===r;return m===t||m.startsWith(`${t}/`)||!l&&!p&&!s?null:e.jsx(ue,{docs:a,dashboardPath:i})}const pe=({...a})=>{const{resolvedTheme:i}=z();return e.jsx(P,{theme:i,className:"toaster group",icons:{success:e.jsx(Q,{className:"size-4"}),info:e.jsx(ee,{className:"size-4"}),warning:e.jsx(me,{className:"size-4"}),error:e.jsx(ae,{className:"size-4"}),loading:e.jsx(W,{className:"size-4 animate-spin"})},style:{"--normal-bg":"var(--popover)","--normal-text":"var(--popover-foreground)","--normal-border":"var(--border)","--border-radius":"var(--radius)"},...a})},xe="/__BASE_PATH__/assets/globals-4_8nRrGT.css",ge="/__BASE_PATH__/assets/styles-Dek7A51o.css",_e=()=>[{rel:"stylesheet",href:xe},{rel:"stylesheet",href:ge}],be=()=>[{title:"md-studio"},{name:"description",content:"File-backed markdown CMS"}];function Se({children:a}){const[i,o]=n.useState([]),[d,h]=n.useState(""),[c,m]=n.useState("/");return n.useEffect(()=>{typeof window<"u"&&window.ENV&&(h(window.ENV.BASE_PATH||""),m(window.ENV.DASHBOARD_PATH||"/"))},[]),n.useEffect(()=>{if(typeof window>"u")return;const t=l=>{const s=l.detail?.slugs??[];s.length&&o(f=>f.filter(x=>!s.includes(x.slug)))};return window.addEventListener("md-studio-docs-deleted",t),()=>window.removeEventListener("md-studio-docs-deleted",t)},[]),n.useEffect(()=>{if(typeof window>"u")return;const t=l=>{const s=l.detail?.doc;s?.slug&&o(f=>{const x=f.filter(g=>g.slug!==s.slug);return[s,...x]})};return window.addEventListener("md-studio-docs-created",t),()=>window.removeEventListener("md-studio-docs-created",t)},[]),n.useEffect(()=>{if(typeof window>"u")return;const t=l=>{const p=l,s=p.detail?.slug,f=p.detail?.patch??{};s&&o(x=>x.map(g=>g.slug===s?{...g,...f}:g))};return window.addEventListener("md-studio-docs-updated",t),()=>window.removeEventListener("md-studio-docs-updated",t)},[]),n.useEffect(()=>{if(typeof window>"u")return;const t=l=>{const s=l.detail?.docs??[];o(s)};return window.addEventListener("md-studio-docs-synced",t),()=>window.removeEventListener("md-studio-docs-synced",t)},[]),n.useEffect(()=>{d&&fetch(N("/api/list",d)).then(t=>t.json()).then(t=>o(t.docs||t.items||[])).catch(t=>console.error("Failed to load docs:",t))},[d]),e.jsxs("html",{lang:"en",suppressHydrationWarning:!0,children:[e.jsxs("head",{children:[e.jsx("meta",{charSet:"utf-8"}),e.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),e.jsx("base",{href:"/__BASE_PATH__/"}),e.jsx("script",{dangerouslySetInnerHTML:{__html:`
    window.ENV = window.ENV || {};
    window.ENV.BASE_PATH = "/__BASE_PATH__";
    window.ENV.DASHBOARD_PATH = "/";
    window.ENV.SHARE_BASE_URL = "/__BASE_PATH__";
    window.ENV.API_PATH = "/__API_PATH__";
  `}}),e.jsx("script",{dangerouslySetInnerHTML:{__html:`
    (function() {
      var theme = localStorage.getItem('md-studio-theme') || 'system';
      var resolved = theme;
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.classList.add(resolved);
    })();
  `}}),e.jsx(R,{}),e.jsx(D,{})]}),e.jsxs("body",{className:"h-screen overflow-hidden antialiased print-visible",children:[e.jsx(J,{children:e.jsxs(C,{basePath:d,dashboardPath:c,children:[e.jsxs("div",{className:"flex h-screen overflow-hidden bg-background print-visible",children:[e.jsx(fe,{docs:i,dashboardPath:c}),e.jsx("div",{className:"flex-1 overflow-y-auto print-visible",children:e.jsx("div",{className:"mx-auto flex w-full max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-8",children:a})})]}),e.jsx("div",{className:"fixed bottom-6 right-6 z-50 print:hidden",children:e.jsx(he,{})}),e.jsx(pe,{position:"top-right",richColors:!0,closeButton:!0})]})}),e.jsx(q,{}),e.jsx(F,{})]})]})}function Ee(){return e.jsx(O,{})}export{Se as Layout,Ee as default,_e as links,be as meta};
