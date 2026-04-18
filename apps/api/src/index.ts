import { createClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_ANON_KEY: string;
  ANTHROPIC_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function db(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // GET /api/health
    if (method === 'GET' && pathname === '/api/health') {
      let supabase = 'not_checked';
      try {
        const { error } = await db(env).from('portfolios').select('id').limit(1);
        supabase = error ? 'error' : 'connected';
      } catch {
        supabase = 'error';
      }
      return json({ status: 'ok', supabase, timestamp: new Date().toISOString() });
    }

    // Portfolios
    if (pathname === '/api/portfolios') {
      if (method === 'GET') {
        const { data, error } = await db(env).from('portfolios').select('*');
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'POST') {
        const body = await request.json();
        const { data, error } = await db(env).from('portfolios').insert(body).select();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }

    const portfolioMatch = pathname.match(/^\/api\/portfolios\/([^/]+)$/);
    if (portfolioMatch) {
      const id = portfolioMatch[1];
      if (method === 'GET') {
        const { data, error } = await db(env).from('portfolios').select('*').eq('id', id).single();
        if (error) return json({ error: error.message }, 404);
        return json(data);
      }
      if (method === 'PUT') {
        const body = await request.json();
        const { data, error } = await db(env).from('portfolios').update(body).eq('id', id).select();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'DELETE') {
        const { error } = await db(env).from('portfolios').delete().eq('id', id);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      }
    }

    // Holdings
    if (pathname === '/api/holdings') {
      if (method === 'GET') {
        const portfolioId = url.searchParams.get('portfolio_id');
        let query = db(env).from('holdings').select('*');
        if (portfolioId) query = query.eq('portfolio_id', portfolioId);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'POST') {
        const body = await request.json();
        const { data, error } = await db(env).from('holdings').insert(body).select();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }

    const holdingMatch = pathname.match(/^\/api\/holdings\/([^/]+)$/);
    if (holdingMatch) {
      const id = holdingMatch[1];
      if (method === 'PUT') {
        const body = await request.json();
        const { data, error } = await db(env).from('holdings').update(body).eq('id', id).select();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'DELETE') {
        const { error } = await db(env).from('holdings').delete().eq('id', id);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      }
    }

    return json({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
