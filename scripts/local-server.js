// Local test server for the Netlify functions (no netlify-cli needed). Port from PORT (default 8291).
const http = require('http');
const fns = { generate: require('../netlify/functions/generate'), 'process-form': require('../netlify/functions/process-form') };
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    const name = (req.url.match(/\/\.netlify\/functions\/([\w-]+)/) || [])[1];
    if (!fns[name]) { res.writeHead(404); return res.end('not found'); }
    const r = await fns[name].handler({ httpMethod: req.method, headers: req.headers, body });
    res.writeHead(r.statusCode, r.headers); res.end(r.body);
  });
}).listen(Number(process.env.PORT || 8291), () => console.log('formgen local on', process.env.PORT || 8291));
