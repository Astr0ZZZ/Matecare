import cron from 'node-cron'
// TODO: cron diario 8AM — genera notificación por usuario según fase
// Referencia: MateCare_arquitectura_tecnica.md sección 8
cron.schedule('0 8 * * *', async () => {
  console.log('Daily phase check running...')
  // TODO: implementar
})
