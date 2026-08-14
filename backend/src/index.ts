import { app } from './app';
import { pool } from './db';

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  try {
    const res = await pool.query('SELECT NOW() as time');
    console.log('✅ Successfully connected to Supabase Database!');
    console.log(`Database time: ${res.rows[0].time}`);
  } catch (err) {
    console.error('❌ Failed to connect to the database:', err);
  }
});
