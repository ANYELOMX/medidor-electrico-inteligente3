import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function getClient() {
  return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() && !process.env.OPENAI_API_KEY.includes('pega_aqui')
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() }) : null;
}

app.get('/api/health', (_req, res) => {
  const configured = Boolean(getClient());
  res.json({ ok: true, aiConfigured: configured, model: MODEL,
    message: configured ? `IA lista (${MODEL})` : 'Falta configurar OPENAI_API_KEY en el archivo .env' });
});

app.post('/api/analyze', async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ error: 'La IA no está conectada todavía. Abre .env, pega tu clave en OPENAI_API_KEY, guarda y reinicia el servidor.' });
  const appliance = String(req.body?.appliance || '').trim();
  const measurements = req.body?.measurements || {};
  if (appliance.length < 2) return res.status(400).json({ error: 'Escribe el tipo, marca o modelo del electrodoméstico.' });
  if (appliance.length > 240) return res.status(400).json({ error: 'La búsqueda es demasiado larga. Usa hasta 240 caracteres.' });

  const prompt = `Eres un asistente técnico para comparar consumo eléctrico de electrodomésticos en México. Busca en la web información del electrodoméstico solicitado. Usa primero páginas oficiales del fabricante, manuales o fichas técnicas; incluye enlaces directos reales. No inventes modelos, cifras ni fuentes. Si no encuentras una especificación exacta, dilo claramente y entrega un rango orientativo solo si una fuente lo respalda. Ten en cuenta que refrigeradores, compresores, bombas y equipos con termostato pueden variar o tener picos de arranque; no declares avería solo por una lectura instantánea.

Electrodoméstico solicitado: ${appliance}
Medición actual del medidor: ${JSON.stringify(measurements)}

Devuelve exclusivamente un objeto JSON válido, sin markdown, con estas claves:
{
 "nombre":"nombre identificado",
 "fabricante":"fabricante o No identificado",
 "modelo":"modelo o No identificado",
 "tipo":"tipo de equipo",
 "potencia_referencia_w": número o null,
 "rango_potencia_w":{"min": número o null,"max": número o null},
 "voltaje_referencia":"rango o valor con unidad, o No encontrado",
 "corriente_referencia_a": número o null,
 "frecuencia_hz": número o null,
 "fuentes":[{"titulo":"título de la fuente","url":"URL completa"}],
 "comparacion":"comparación breve entre referencia y medición actual",
 "diferencia_porcentual": número o null,
 "estado":"NORMAL, VIGILAR, POSIBLE_ANOMALIA o DATOS_INSUFICIENTES",
 "diagnostico":"qué significan los datos y límites de la comparación",
 "recomendacion":"siguiente paso seguro"
}
La diferencia porcentual se calcula respecto a potencia de referencia cuando exista y sea comparable. Si falta un dato confiable o la medición es de demostración, marca DATOS_INSUFICIENTES y explica que no es un diagnóstico eléctrico profesional. No recomiendes abrir equipos ni tocar cableado energizado.`;
  try {
    const response = await client.responses.create({
      model: MODEL,
      tools: [{ type: 'web_search' }],
      input: prompt
    });
    const raw = response.output_text || '';
    let result;
    try { result = JSON.parse(raw); }
    catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) { try { result = JSON.parse(match[0]); } catch { /* handled below */ } }
    }
    if (!result) return res.status(502).json({ error: 'La IA respondió, pero no se pudo leer su formato. Intenta otra vez.', details: raw.slice(0, 700) });
    if (!Array.isArray(result.fuentes)) result.fuentes = [];
    res.json({ result, model: MODEL });
  } catch (err) {
    const status = err?.status;
    let message = err?.message || 'Error al consultar la IA.';
    if (status === 401) message = 'La clave de OpenAI no es válida. Revisa OPENAI_API_KEY en .env.';
    else if (status === 429) message = 'La cuenta de API no tiene cuota disponible o alcanzó su límite. Revisa facturación y límites de OpenAI API.';
    else if (status === 400 && /model/i.test(message)) message = `El modelo configurado (${MODEL}) no está disponible para esta clave. Cambia OPENAI_MODEL en .env por un modelo habilitado en tu cuenta.`;
    console.error('Error /api/analyze:', status || '', err?.message || err);
    res.status(500).json({ error: message });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Medidor listo en http://localhost:${PORT} | Modelo IA: ${MODEL}`));
