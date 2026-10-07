/** Authenticate a Chromium debugger by the endpoint announced by our child. */
export function announcedChromeEndpoint(log, requestedPort=0) {
  const matches=[...String(log).matchAll(/DevTools listening on (ws:\/\/[^\s]+)/g)];
  if (!matches.length) return null;
  try {
    const url=new URL(matches.at(-1)[1]);
    const port=Number(url.port);
    if (url.protocol!=='ws:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname)
        || !Number.isInteger(port) || port<1 || port>65535
        || !/^\/devtools\/browser\/[a-z0-9-]+$/i.test(url.pathname)
        || (requestedPort && port!==requestedPort)) return null;
    return {port,path:url.pathname};
  } catch { return null; }
}
export function debuggerMatchesChild(observed, endpoint) {
  if (!endpoint || typeof observed?.webSocketDebuggerUrl!=='string') return false;
  try {
    const url=new URL(observed.webSocketDebuggerUrl);
    return url.protocol==='ws:' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname)
      && Number(url.port)===endpoint.port && url.pathname===endpoint.path;
  } catch { return false; }
}

/** Firefox announces its ephemeral BiDi listener on the child's output. */
export function announcedFirefoxEndpoint(log,requestedPort=0) {
  const matches=[...String(log).matchAll(/WebDriver BiDi listening on (ws:\/\/[^\s]+)/g)];
  if(!matches.length)return null;
  try {
    const url=new URL(matches.at(-1)[1]),port=Number(url.port);
    if(url.protocol!=='ws:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname)
      || !Number.isInteger(port) || port<1 || port>65535 || url.pathname!=='/'
      || url.search || url.hash || url.username || url.password
      || (requestedPort && port!==requestedPort))return null;
    return {port,url:url.origin+'/session'};
  }catch{return null;}
}
