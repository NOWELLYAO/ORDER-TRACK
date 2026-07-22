// api/rapport-intelligent.js
// Fonction serverless Vercel — appelée par le bouton "🧠 Rapport Intelligent"
// depuis l'application. Elle seule détient la clé API Anthropic (jamais
// exposée au navigateur) et fait le pont vers l'API Claude.
//
// ⚙️ Mise en place (une seule fois) :
// 1. Ce fichier doit rester à la racine du repo, dans un dossier `api/`
//    (Vercel le détecte automatiquement comme une fonction serverless —
//    aucune config supplémentaire nécessaire).
// 2. Dans Vercel → ton projet → Settings → Environments → Production →
//    Add Environment Variable, ajoute :
//      ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxxxxxxxx
//    (clé récupérable sur https://console.anthropic.com/settings/keys)
// 3. Redéployer après avoir ajouté la variable (elle n'est prise en compte
//    qu'au prochain déploiement).
//
// Le front-end (App.tsx, composant <RapportIntelligent/>) envoie un JSON
// {title, context, messages} et reçoit {text}. Aucune donnée n'est stockée
// côté serveur : chaque appel est indépendant, l'historique de la
// conversation est renvoyé en entier à chaque tour par le front-end.
//
// Toute la logique est enveloppée dans un try/catch global : quelle que
// soit l'erreur (body mal formé, clé absente, API Anthropic en panne...),
// la réponse reste toujours un JSON exploitable par le front-end plutôt
// qu'une page d'erreur HTML générique de la plateforme.

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1600;

const SYSTEM_PROMPT = (title, context) => `Tu es l'analyste intégré de l'application OrderTrack, un outil de suivi de commandes/factures/paiements B2B. Un utilisateur (responsable commercial/ADV) te demande un "Rapport Intelligent" sur : "${title}".

Voici les données réelles de l'application, déjà calculées, au format JSON — c'est ta SEULE source de vérité :
${JSON.stringify(context)}

Consignes de style et de fond :
- Réponds TOUJOURS en français, dans un style d'analyste qui présente son travail à l'oral : direct, concis, sans jargon inutile.
- Pour le tout premier message (génération du rapport), structure ta réponse ainsi, dans cet esprit :
  1. Un bandeau d'alerte en une phrase s'il y a des points critiques (retards, échéances, risques) — sinon dis clairement qu'il n'y a rien de critique.
  2. Les indicateurs clés expliqués simplement (pas juste des chiffres bruts — dis ce qu'ils veulent dire).
  3. Un classement ou une priorisation si plusieurs entités (clients, commandes...) sont comparables.
  4. Une phrase de résumé.
  5. Termine TOUJOURS par UNE question de suivi pertinente et concrète proposée à l'utilisateur (jamais plus d'une).
- Pour les messages suivants (questions de l'utilisateur), réponds directement à la question posée, en restant ancré dans les données du contexte.
- N'utilise QUE les données fournies ci-dessus. Si l'utilisateur pose une question dont la réponse n'est pas dans ce contexte, dis-le honnêtement ("je n'ai pas cette donnée dans ce qui m'a été transmis — peux-tu me la donner ou me dire où la trouver ?") plutôt que d'inventer un chiffre ou un fait.
- Utilise des chiffres exacts tirés du contexte, jamais d'estimations vagues.
- Reste sous les 220 mots pour le rapport initial, et sous 150 mots pour chaque réponse de suivi, sauf si l'utilisateur demande explicitement plus de détails.`;

// Lit le corps brut de la requête si le runtime ne l'a pas déjà parsé
// automatiquement (filet de sécurité selon la configuration exacte du
// projet Vercel).
async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Méthode non autorisée (POST attendu)." });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          "ANTHROPIC_API_KEY n'est pas configurée côté serveur. Ajoute-la dans Vercel → Settings → Environments → Production, puis redéploie.",
      });
      return;
    }

    let body = req.body;
    if (!body || (typeof body === "object" && Object.keys(body).length === 0)) {
      try {
        const raw = await readRawBody(req);
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    } else if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { title, context, messages } = body || {};

    if (!context) {
      res.status(400).json({ error: "Contexte manquant dans la requête." });
      return;
    }

    const conversation =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : [{ role: "user", content: "Génère le Rapport Intelligent maintenant, en suivant la structure demandée." }];

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT(title || "cette page", context),
        messages: conversation,
      }),
    });

    let data = {};
    try { data = await anthropicRes.json(); }
    catch {
      const raw = await anthropicRes.text().catch(() => "");
      res.status(502).json({ error: `Réponse non-JSON de l'API Anthropic (HTTP ${anthropicRes.status}): ${raw.slice(0,300)}` });
      return;
    }

    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({
        error: data?.error?.message || `Erreur de l'API Anthropic (HTTP ${anthropicRes.status}).`,
      });
      return;
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    res.status(200).json({ text: text || "(Réponse vide)" });
  } catch (e) {
    // Filet de sécurité ultime : quoi qu'il arrive, on répond en JSON.
    res.status(500).json({ error: "Erreur serveur inattendue : " + String((e && e.message) || e) });
  }
}
