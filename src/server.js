require('dotenv').config();

const { loadEnv } = require('./config/env');
const { initSupabase } = require('./config/supabase');
const { createApp } = require('./app');

const env = loadEnv();
initSupabase(env);

const app = createApp(env);

app.listen(env.PORT, () => {
  console.log(`Asan Global backend running on port ${env.PORT} [${env.NODE_ENV}]`);
});

module.exports = app;
