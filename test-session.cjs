const express = require('express');
const cookieSession = require('cookie-session');
const app = express();
app.use(cookieSession({ keys: ['secret'] }));
app.use((req, res, next) => {
  req.session = req.session || {};
  req.session.userId = "test";
  next();
});
app.get('/', (req, res) => res.json({ id: req.session.userId }));
const server = app.listen(3001, () => {
  require('http').get('http://localhost:3001', (res) => {
    res.on('data', (d) => process.stdout.write(d));
    res.on('end', () => server.close());
  });
});
