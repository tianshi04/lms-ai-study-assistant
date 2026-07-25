const http = require('http');
const data = JSON.stringify({ subject: "cat-subj-cs" });
const options = { hostname: '127.0.0.1', port: 8080, path: '/catalog.v1.CatalogService/ListCourses', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } };
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log('Response:', body));
});
req.on('error', (e) => console.error(e));
req.write(data);
req.end();
