// api/rapport-intelligent.js
// Fonction serverless Vercel — appelée par le bouton "🧠 Rapport Intelligent"
// depuis l'application. Elle seule détient la clé API Anthropic (jamais
// exposée au navigateur) et fait le pont vers l'API Claude.
//
// ⚙️ Mise en place (une seule fois) :
// 1. Ce fichier doit rester à la racine du repo, dans un dossier `api/`
//    (Vercel le détecte automatiquement comme une fonction serverless —
//    aucune config supplémentaire nécessaire).
// 2. Dans Vercel → ton projet → Settings → Environment Variables, ajoute :
//      ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxxxxxxxx
//    (clé récupérable sur https://console.anthropic.com/settings/keys)
// 3. Redéployer après avoir ajouté la variable (elle n'est prise en compte
//    qu'au prochain déploiement).
//
// Le front-end (App.tsx, composant <RapportIntelligent/>) envoie un JSON
// {scope, title, context, messages} et reçoit {text}. Aucune donnée n'est
// stockée côté serveur : chaque appel est indépendant, l'historique de la
// conversation est renvoyé en entier à chaque tour par le front-end.

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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY n'est pas configurée côté serveur. Ajoute-la dans Vercel → Settings → Environment Variables, puis redéploie.",
    });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
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

  try {
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

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({
        error: data?.error?.message || "Erreur de l'API Anthropic.",
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
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
