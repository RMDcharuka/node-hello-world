'use strict';

const express = require('express');
const app = express();

const port = 8083;
const host = '0.0.0.0';

app.get('/', (req, res) => {
  res.send('successfully deploy demo application');  // <-- updated message
});

app.listen(port, host, () => {
  console.log(`Running on http://${host}:${port}`);
});


