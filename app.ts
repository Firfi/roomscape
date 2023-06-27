import express from 'express';
import { init } from './stream';
const app = express();

app.get('/rick.ogg', async (req, res) => {
  // http://192.168.1.100:3000/rick.ogg
  const start = Number(req.query['start'] || 0);
  const { stream , destroy } = await init(start);
  res.setHeader("Content-Type", "audio/ogg");
  stream.pipe(res);
  res.on('close', () => {
    stream.unpipe(res);
    destroy();
  });

});
app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});