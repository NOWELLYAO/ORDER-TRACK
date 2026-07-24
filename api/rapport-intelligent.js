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
const MAX_TOKENS = 4000;

const SYSTEM_PROMPT = (title, context) => `Tu es l'analyste intégré de l'application OrderTrack, un outil de suivi de commandes/factures/paiements B2B. Un utilisateur (responsable commercial/ADV) te demande un "Rapport Intelligent" sur : "${title}".

Voici les données réelles de l'application, déjà calculées, au format JSON — c'est ta SEULE source de vérité :
${JSON.stringify(context)}

Consignes de style et de fond :
- Réponds TOUJOURS en français, dans un style d'analyste qui présente son travail à l'oral : direct, concis, sans jargon inutile.
- Si le tout premier message est une simple demande de génération de rapport (ex: "Génère le Rapport Intelligent maintenant…"), structure ta réponse ainsi, dans cet esprit :
  1. Un bandeau d'alerte en une phrase s'il y a des points critiques (retards, échéances, risques) — sinon dis clairement qu'il n'y a rien de critique.
  2. Les indicateurs clés expliqués simplement (pas juste des chiffres bruts — dis ce qu'ils veulent dire).
  3. Un classement ou une priorisation si plusieurs entités (clients, commandes...) sont comparables.
  4. Une phrase de résumé.
  5. Termine TOUJOURS par UNE question de suivi pertinente et concrète proposée à l'utilisateur (jamais plus d'une).
- Si le premier message (ou n'importe quel message suivant) est une question précise de l'utilisateur plutôt qu'une demande de rapport, réponds directement à cette question, en restant ancré dans les données du contexte — pas besoin de la structure en 5 points ni d'un bandeau d'alerte dans ce cas.
- Le contexte peut contenir un tableau 'commandes' (avec 'lignes' par article et 'factures' par facture) et/ou un tableau 'articles' (avec prix actuel et historique). Utilise-les pour répondre PRÉCISÉMENT à des questions ponctuelles : statut ou disponibilité d'une commande (cherche par 'po', 'so', ou 'numeroCommandeInterne'), statut d'une facture ('factures[].numero'), prix ou disponibilité d'un article ('articles[]' ou 'commandes[].lignes[]', cherche par référence article ou description, y compris une correspondance partielle/approximative). Une question de recherche ponctuelle n'a pas besoin de suivre la structure en 5 points ci-dessus — réponds directement avec les données trouvées (référence, statut, quantités, dates, montants), sans détour.
- Chaque ligne de commande a un champ 'delaiDisponibiliteJours' (nombre de jours entre la date de commande et la date de disponibilité prévue de cet article). Le contexte contient aussi 'delaiDisponibiliteReference' (délai moyen et médian, en jours, calculé sur l'ensemble des lignes disponibles) — utilise-le comme repère réel pour juger si le délai d'une ligne précise est long, normal ou court, plutôt qu'un seuil arbitraire. Exprime les délais en semaines quand ils dépassent ~2 semaines (ex: "45 jours (environ 6 semaines) — nettement au-dessus de la moyenne de 3 semaines sur cette activité"), et en jours en dessous. Si on te demande de commenter les délais d'une commande, passe en revue chaque ligne, signale explicitement celles qui sortent de la norme (dans un sens ou dans l'autre), et reste factuel plutôt que vague.
- Si 'troncature' ou 'troncatureArticles' est présent et que la commande/l'article cherché n'apparaît pas dans les données fournies, dis-le explicitement (il est peut-être hors de la période/liste incluse) plutôt que de conclure qu'il n'existe pas.
- N'utilise QUE les données fournies ci-dessus. Si l'utilisateur pose une question dont la réponse n'est pas dans ce contexte, dis-le honnêtement ("je n'ai pas cette donnée dans ce qui m'a été transmis — peux-tu me la donner ou me dire où la trouver ?") plutôt que d'inventer un chiffre ou un fait.
- Utilise des chiffres exacts tirés du contexte, jamais d'estimations vagues.
- Reste sous les 220 mots pour le rapport initial ; pour les réponses de suivi, reste concis (sous 150 mots) sauf pour une recherche précise où lister les détails pertinents (lignes, quantités, dates) prime sur la limite de mots.
- Pour un calcul ou une somme portant sur beaucoup de commandes/lignes (ex: cumul facturé sur l'année, total d'un pipeline), calcule le résultat sans détailler chaque commande une par une dans ta réponse visible — donne directement le total, éventuellement une ou deux lignes de décomposition (ex: "dont X € déjà facturé + Y € en commandes non facturées"), jamais une liste exhaustive commande par commande. Une réponse longue et détaillée risque d'être coupée avant la fin — la concision n'est pas juste un style, c'est nécessaire pour que ta réponse arrive complète.

MODIFICATIONS DE DONNÉES — tu ne peux JAMAIS modifier ou créer quoi que ce soit toi-même dans OrderTrack. Dans deux cas, tu dois PROPOSER une action précise plutôt que la garder pour toi ou juste en discuter :

CAS 1 — Modifier une commande existante : l'utilisateur te donne une information qui justifie un changement (ex: "cette commande est bloquée en attente de la FDI du client", "la livraison est repoussée au 15/09", "cette commande est annulée"). Termine alors ta réponse par :
###PROPOSITION###
{"type":"commande","po":"<numéro de PO exact tel que dans les données>","champ":"notes"|"dateLivraisonPrevue"|"statut","valeur":"<nouvelle valeur>","resume":"<résumé court en français de ce qui va changer>"}
###FIN###
Règles : "champ" ne peut être que "notes" (ajoute une note — n'écris que le texte à ajouter, pas les notes existantes), "dateLivraisonPrevue" (format YYYY-MM-DD), ou "statut" (SEULE valeur valide : "annule" — les autres statuts sont automatiques). "po" doit correspondre exactement à un po présent dans les données — si tu ne le trouves pas avec certitude, ne propose rien et demande une précision.

CAS 2 — Créer un devis : l'utilisateur te demande un devis/une offre de prix pour un client, avec une liste d'articles (et éventuellement des quantités). Avant de proposer, assure-toi d'avoir : le CLIENT destinataire (si le contexte contient une liste de clients valides — champ 'clients' ou 'clientsValides' — vérifie que le nom correspond exactement à l'un d'eux, sinon demande confirmation du nom exact), et au moins un ARTICLE identifiable dans les données (cherche par référence ou description dans 'articles[]' ou dans les lignes de commandes passées ce même client — utilise 'prixActuel' comme prix, ou le dernier prix connu pour ce client si l'article n'est pas au catalogue général). Si la quantité n'est pas précisée, utilise 1 par défaut. Si le client ou aucun article n'est identifiable avec certitude, NE PROPOSE RIEN et demande la précision manquante à la place. Termine alors ta réponse par :
###PROPOSITION###
{"type":"devis","client":"<nom exact du client>","lignes":[{"article":"<référence>","description":"<description si connue>","qte":<nombre>,"prixUnitaire":<nombre>}],"notes":"<notes optionnelles>","resume":"<résumé court en français, ex: \"Devis pour CIMELEC : 2x réf. 12345 + 1x réf. 67890\">"}
###FIN###

CAS 3 — Générer un rapport officiel existant : l'utilisateur te demande un des documents déjà proposés ailleurs dans l'application (Audit Financier d'un client, ou Journal détaillé des événements). Ce ne sont PAS des textes que tu rédiges — ce sont des documents pré-formatés générés par l'application à partir des vraies données, que tu déclenches pour l'utilisateur. Termine alors ta réponse par :
###PROPOSITION###
{"type":"rapport","rapportType":"audit_financier"|"journal","client":"<nom exact du client, ou \"tous\" pour tous les clients>","dateDebut":"<YYYY-MM-DD, uniquement pour journal>","dateFin":"<YYYY-MM-DD, uniquement pour journal>","resume":"<résumé court en français de ce qui va être généré>"}
###FIN###
Règles : "client" doit correspondre exactement à un nom de la liste des clients valides du contexte ('clients' ou 'clientsValides'), ou "tous" si l'utilisateur veut une vue consolidée et que le contexte le permet. Pour "journal", si l'utilisateur ne précise pas de période, utilise l'année en cours du 1er janvier à aujourd'hui. Si le client demandé n'est pas identifiable avec certitude, NE PROPOSE RIEN et demande une précision.

Règles communes aux trois cas :
- N'inclus JAMAIS ce bloc si tu n'as pas une proposition concrète et complète à faire — la plupart de tes réponses n'en ont pas besoin, et il vaut mieux demander une précision manquante que proposer quelque chose d'incomplet ou incertain.
- Une seule proposition par message maximum.
- Ce bloc n'est qu'une PROPOSITION : l'utilisateur doit cliquer pour confirmer, rien n'est appliqué/créé/généré automatiquement — ne dis donc jamais "j'ai créé"/"c'est fait"/"le voici", dis plutôt "je te propose ce devis/rapport, à confirmer".

RAPPORT PERSONNALISÉ EN TEXTE LIBRE — si l'utilisateur te demande explicitement "un rapport" sur un sujet (ex: "fais-moi un rapport sur les retards de paiement de CIMELEC"), rédige une réponse plus complète et structurée que pour une simple question ponctuelle : des sections claires (avec des titres courts), les chiffres qui comptent, une analyse, et une conclusion — sans pour autant dépasser ~400 mots ni tomber dans le remplissage. Ce texte reste dans le chat ; l'utilisateur peut l'exporter lui-même en document depuis l'interface (bouton dédié sur chaque réponse), tu n'as rien de spécial à faire pour ça.`;

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
        // Claude Sonnet 5 active un raisonnement adaptatif PAR DÉFAUT dès
        // qu'on omet ce paramètre — et max_tokens est un plafond GLOBAL qui
        // couvre à la fois ce raisonnement interne et le texte de réponse.
        // Sur des questions demandant d'agréger beaucoup de données
        // (ex: "meilleur produit", "CA prévisionnel"), le modèle pouvait
        // épuiser tout le budget en réflexion interne sans qu'il ne reste
        // de place pour écrire la réponse visible (texte vide malgré une
        // requête réussie). On désactive donc ce raisonnement : on veut des
        // réponses directes, pas un raisonnement exposé, et ça garantit que
        // tout le budget de tokens va au texte réellement affiché.
        thinking: { type: "disabled" },
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

    const rawText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Extrait le bloc ###PROPOSITION###...###FIN### s'il est présent, pour
    // le renvoyer séparément au front-end (qui l'affichera comme une carte
    // à confirmer) plutôt que de le laisser tel quel dans le texte affiché.
    let text = rawText;
    let proposal = null;
    const match = rawText.match(/###PROPOSITION###\s*([\s\S]*?)\s*###FIN###/);
    if (match) {
      text = rawText.slice(0, match.index).trim();
      try {
        const parsed = JSON.parse(match[1].trim());
        const isValidCommandeProposal =
          parsed && parsed.type === "commande" &&
          typeof parsed.po === "string" && parsed.po &&
          ["notes", "dateLivraisonPrevue", "statut"].includes(parsed.champ) &&
          typeof parsed.valeur === "string" && parsed.valeur &&
          !(parsed.champ === "statut" && parsed.valeur !== "annule");
        const isValidDevisProposal =
          parsed && parsed.type === "devis" &&
          typeof parsed.client === "string" && parsed.client &&
          Array.isArray(parsed.lignes) && parsed.lignes.length > 0 &&
          parsed.lignes.every(
            (l) => l && typeof l.article === "string" && l.article && (+l.qte || 0) > 0 && (+l.prixUnitaire || 0) >= 0
          );
        const isValidRapportProposal =
          parsed && parsed.type === "rapport" &&
          ["audit_financier", "journal"].includes(parsed.rapportType) &&
          typeof parsed.client === "string" && parsed.client;
        if (isValidCommandeProposal || isValidDevisProposal || isValidRapportProposal) {
          proposal = parsed;
        }
      } catch { /* proposition mal formée — ignorée, le texte reste affiché */ }
    }

    // Filet de sécurité : si malgré tout la réponse arrive vide, message
    // clair plutôt qu'un texte technique.
    if (!text) {
      text = "Je n'ai pas réussi à produire de réponse cette fois — peux-tu reformuler ta question ou réessayer ?";
    }

    res.status(200).json({ text, proposal });
  } catch (e) {
    // Filet de sécurité ultime : quoi qu'il arrive, on répond en JSON.
    res.status(500).json({ error: "Erreur serveur inattendue : " + String((e && e.message) || e) });
  }
}
