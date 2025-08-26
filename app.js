''use strict';

const express = require('express');
const app = express();

const port = 8083;           // changed from 8080 → 8083
const host = '0.0.0.0';

app.get('/', (req, res) => {
  res.send('Hello World my app.js from IBM Cloud Essentials! testing complete');
});

app.listen(port, host, () => {
  console.log(`Running on http://${host}:${port}`);
});

