const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { GoogleGenerativeAI } = require('@google/generative-ai');

setGlobalOptions({ region: 'southamerica-east1', maxInstances: 5 });

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function parseDataUrl(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase(), data: match[2] };
}

function cleanJsonText(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

exports.analyzeCoachScreenshots = onCall({
  timeoutSeconds: 120,
  memory: '1GiB',
  enforceAppCheck: false
}, async request => {
  const data = request.data || {};
  const screenshots = Array.isArray(data.screenshots) ? data.screenshots : [];

  if (screenshots.length !== 4) {
    throw new HttpsError('invalid-argument', 'Envie exatamente 4 prints para a análise.');
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new HttpsError('failed-precondition', 'GEMINI_API_KEY não configurada nas Functions.');
  }

  const parts = screenshots.map(parseDataUrl);
  if (parts.some(part => !part)) {
    throw new HttpsError('invalid-argument', 'Todos os 4 arquivos precisam ser imagens JPG, PNG ou WEBP.');
  }

  const totalBytes = parts.reduce((sum, part) => sum + Buffer.byteLength(part.data, 'base64'), 0);
  if (totalBytes > 8 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'Os 4 prints estão muito pesados. Reduza a resolução e tente novamente.');
  }

  const mode = typeof data.mode === 'string' ? data.mode.slice(0, 80) : 'Não informado';
  const map = typeof data.map === 'string' ? data.map.slice(0, 80) : 'Não informado';

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

  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  });

  try {
    const result = await model.generateContent([
      prompt,
      ...parts.map(part => ({ inlineData: { mimeType: part.mimeType, data: part.data } }))
    ]);

    const raw = result.response.text();
    const parsed = JSON.parse(cleanJsonText(raw));

    return {
      title: String(parsed.title || 'Análise competitiva'),
      grade: Math.max(0, Math.min(100, Number(parsed.grade || 0))),
      metrics: {
        aim: Math.max(0, Math.min(100, Number(parsed.metrics?.aim || 0))),
        decision: Math.max(0, Math.min(100, Number(parsed.metrics?.decision || 0))),
        aggression: Math.max(0, Math.min(100, Number(parsed.metrics?.aggression || 0))),
        positioning: Math.max(0, Math.min(100, Number(parsed.metrics?.positioning || 0)))
      },
      verdict: String(parsed.verdict || 'Sem veredito textual.'),
      recommendation: String(parsed.recommendation || 'Repita a análise com prints legíveis.'),
      evidence: String(parsed.evidence || 'Nenhum dado adicional identificado.'),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 8) : []
    };
  } catch (error) {
    console.error('Falha no Gemini:', error);
    throw new HttpsError('internal', 'A IA não conseguiu interpretar os quatro prints. Tente novamente com imagens legíveis.');
  }
});
