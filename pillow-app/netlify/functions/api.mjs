import { database } from '../../src/database.mjs';
import { createApp } from '../../src/app.mjs';
export default async function handler(request, context) {
  try {
    return await createApp(await database(), process.env)(request, { ip: context.ip });
  } catch {
    // Do not log Request bodies, cookies, passwords, contacts or database error details.
    return Response.json({ error: '服务暂时不可用，请稍后重试。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export const config = { path: ['/api/*'] };
