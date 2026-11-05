let ready;
export async function database() {
  if (!ready) ready = import('@netlify/database').then(({ getDatabase }) => {
    const { pool } = getDatabase();
    return {
      query: (sql, params = []) => pool.query(sql, params),
      transaction: async fn => {
        const client = await pool.connect();
        try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
        catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      }
    };
  });
  return ready;
}
