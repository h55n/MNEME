const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`[Mock API] ${req.method} ${req.url}`);
  
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/v1/vaults/vlt_123/memories') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      console.log('Received memory:', body);
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        data: {
          id: 'mem_abc123',
          content: JSON.parse(body).content,
          type: JSON.parse(body).type || 'semantic',
          createdAt: new Date().toISOString()
        }
      }));
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/vaults/vlt_123/memories/recall') {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: {
        memories: [
          { id: 'mem_1', content: 'Antigravity is cool.', type: 'semantic' }
        ]
      }
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ success: false, error: { message: 'Not found' } }));
});

server.listen(4000, () => {
  console.log('Mock MNEME API listening on port 4000');
});
