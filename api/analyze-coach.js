/**
 * Vercel Serverless Function para o Coach IA.
 * Mantém a GEMINI_API_KEY somente no servidor, sem exigir Firebase Blaze.
 */

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function parseDataUrl(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase(),
    data: match[2]
  };
}

function cleanJsonText(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function clamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

module.exports = async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY não configurada na Vercel.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const screenshots = Array.isArray(body.screenshots) ? body.screenshots : [];

    if (screenshots.length !== 4) {
      return res.status(400).json({ error: 'Envie exatamente 4 prints para a análise.' });
    }

    const parts = screenshots.map(parseDataUrl);
    if (parts.some(part => !part)) {
      return res.status(400).json({
        error: 'Todos os 4 arquivos precisam ser imagens JPG, PNG ou WEBP.'
      });
    }

    const totalBytes = parts.reduce(
      (sum, part) => sum + Buffer.byteLength(part.data, 'base64'),
      0
    );

    // Mantém a requisição abaixo do limite de tamanho da requisição da Function da Vercel.
    if (totalBytes > 3 * 1024 * 1024) {
      return res.status(413).json({
        error: 'Os 4 prints estão muito pesados. Reduza a resolução e tente novamente.'
      });
    }

    const mode = typeof body.mode === 'string' ? body.mode.slice(0, 80) : 'Não informado';
    const map = typeof body.map === 'string' ? body.map.slice(0, 80) : 'Não informado';

    const prompt = `
Você é o COACH COMPETITIVO do CODM HUB. Analise exclusivamente as informações visíveis nos 4 prints anexados.

CONTEXTO FORNECIDO PELO USUÁRIO (apenas para contextualizar, NÃO use para inventar métricas):
- Modo: ${mode}
- Mapa: ${map}

REGRA PRINCIPAL:
- Os 4 anexos são a única fonte de verdade para estatísticas da partida.
- NÃO invente K/D, kills, mortes, dano, score, tempo de objetivo, capturas, armas, perks, precisão ou qualquer número que não esteja claramente visível.
- Se um dado estiver ilegível ou não aparecer, escreva "não identificado".
- Não use o texto do formulário como substituto de uma métrica ausente.
- Cruze os quatro prints quando eles mostrarem informações relacionadas.
- Se os prints não forem telas de estatísticas de partida, sinalize isso em warnings e não finja que são.
- Dê um veredito competitivo útil, mas sempre deixe claro o que foi observado e o que não pôde ser observado.

Tente identificar, quando realmente estiverem visíveis:
- resultado da partida;
- kills, mortes e K/D;
- dano/pontuação;
- tempo e participação em objetivo;
- capturas/defesas/ações objetivas;
- armas e utilitários;
- consistência entre os prints;
- sinais de eficiência, agressividade, decisão e posicionamento que possam ser sustentados pelos dados visíveis.

Gere SOMENTE um JSON válido, sem markdown, neste formato:
{
  "title": "string",
  "grade": 0,
  "metrics": {
    "aim": 0,
    "decision": 0,
    "aggression": 0,
    "positioning": 0
  },
  "verdict": "string",
  "recommendation": "string",
  "evidence": "string",
  "warnings": ["string"]
}

Notas sobre as métricas de 0 a 100:
- Só dê uma nota quando houver evidência suficiente nos prints.
- Quando não houver evidência suficiente, use 0 e explique em warnings/evidence.
- A nota final deve refletir a qualidade da evidência disponível, não uma pontuação aleatória.
`;

    const contents = [{ text: prompt }];
    for (const part of parts) {
      contents.push({
        inlineData: {
          mimeType: part.mimeType,
          data: part.data
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: contents }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', payload);
      return res.status(502).json({
        error: 'A API do Gemini recusou a análise. Verifique a chave, o modelo e os limites da API.'
      });
    }

    const raw = payload?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('') || '';

    if (!raw) {
      console.error('Gemini returned no text:', payload);
      return res.status(502).json({ error: 'A IA não retornou um relatório válido.' });
    }

    const parsed = JSON.parse(cleanJsonText(raw));

    return res.status(200).json({
      title: String(parsed.title || 'Análise competitiva'),
      grade: clamp(parsed.grade),
      metrics: {
        aim: clamp(parsed.metrics?.aim),
        decision: clamp(parsed.metrics?.decision),
        aggression: clamp(parsed.metrics?.aggression),
        positioning: clamp(parsed.metrics?.positioning)
      },
      verdict: String(parsed.verdict || 'Sem veredito textual.'),
      recommendation: String(parsed.recommendation || 'Repita a análise com prints legíveis.'),
      evidence: String(parsed.evidence || 'Nenhum dado adicional identificado.'),
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.map(String).slice(0, 8)
        : []
    });
  } catch (error) {
    console.error('Falha no Coach:', error);
    return res.status(500).json({
      error: 'A IA não conseguiu interpretar os quatro prints. Tente novamente com imagens legíveis.'
    });
  }
};
