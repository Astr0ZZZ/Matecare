import express from 'express';
const app = express();
app.get('/health', (req, res) => {
  console.log('[MINIMAL] Request received');
  res.json({ status: 'alive' });
});
app.listen(3005, () => console.log('[MINIMAL] Running on port 3005'));
