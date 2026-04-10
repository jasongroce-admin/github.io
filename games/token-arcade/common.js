const TOKEN_KEY='tokenArcadeTotal';
function getTokens(){return Number(localStorage.getItem(TOKEN_KEY)||500)}
function setTokens(v){localStorage.setItem(TOKEN_KEY,String(Math.max(0,v))); const el=document.getElementById('tokenTotal'); if(el)el.textContent=Math.max(0,v).toFixed(2)}
function spend(v){let t=getTokens(); if(t<v) return false; setTokens(t-v); return true;}
function add(v){setTokens(getTokens()+v)}
function initWallet(){setTokens(getTokens())}
