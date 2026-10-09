[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · **Français** · [Українська](README.uk.md)

# Markdown → Rich Message

**Telegram Markdown & Media Converter**

Bot Telegram public qui transforme Markdown en **Telegram Rich Messages**.

Bot : **@tgMdFormatter_bot**

Créé avec **GPT-6.1** · Code source : https://github.com/l3chat/telegram-md-bot

## Fonctions

- Markdown → Telegram Rich Message
- découpage automatique des documents trop longs
- titres, listes, listes de tâches, citations, tableaux, blocs de code, liens et formules
- photos, audio, messages vocaux, vidéo et fichiers dans les Rich Messages
- liaison automatique des médias sans écrire manuellement les liens `tg://...`
- Markdown envoyé comme texte ou fichiers `.md`, `.markdown`, `.txt`
- brouillons temporaires dans Cloudflare Durable Objects
- suppression automatique des brouillons après 24 heures
- interface en anglais, russe, allemand, français et ukrainien

## Utilisation rapide

### Texte seulement

Envoyez Markdown directement :

```md
# Titre

Ceci est **gras** et ceci est *italique*.

- un
- deux
```

Le bot renvoie un Rich Message. Les documents trop longs sont automatiquement découpés à des limites Markdown sûres.

### Texte avec médias

1. Envoyez d’abord photos, audio, vidéo, messages vocaux ou fichiers.
2. Envoyez ensuite le texte Markdown ou un fichier `.md/.txt`.
3. Le bot crée automatiquement les liens Telegram internes.

Exemple :

```md
![](photo.jpg "Légende")
```

Si `photo.jpg` a été envoyé auparavant, il sera placé exactement ici. Les médias non référencés sont ajoutés automatiquement à la fin.

## Commandes

- `/help` — aide
- `/test` — afficher la page de test localisée
- `/media` — afficher les médias du brouillon
- `/send` — construire et envoyer le brouillon
- `/clear` — supprimer le brouillon
- `/privacy` — confidentialité

La langue est choisie automatiquement via Telegram `language_code`.

## Profil Telegram public

Le Worker synchronise automatiquement via la Bot API :

- le menu de commandes localisé ;
- le nom du bot ;
- la description courte ;
- la description complète.

Langues : **EN / RU / DE / FR / UK**.

## Confidentialité

`/privacy` affiche l’avis localisé.

```text
https://tg-md-bot.lechat-reg.workers.dev/privacy?lang=fr
```

Fichier séparé : [PRIVACY.fr.md](PRIVACY.fr.md).

## Architecture

```text
Telegram
   ↓ webhook
Cloudflare Worker
   ↓
DraftSession Durable Object
   ↓
Telegram Bot API / sendRichMessage
```

Un Durable Object séparé est utilisé pour chaque paire discussion/utilisateur. Il ne conserve temporairement que le Markdown, les `file_id` Telegram, les noms/alias de fichiers, l’ordre des médias et l’état de l’album. Les médias restent hébergés par Telegram.

## Limites

Le bot utilise environ **30 000 caractères** comme taille cible sûre par Rich Message et découpe automatiquement les documents plus longs. Les médias restent associés à la partie qui les référence. Limite actuelle : **50 médias** par document préparé.

## Démonstration

Exemple manuel complet :

- [RICH_MESSAGE_DEMO.md](RICH_MESSAGE_DEMO.md)

Dans le bot :

```text
/test
```

## Développement et déploiement

```bash
npm ci
npm test
npx wrangler deploy
```

Secrets Cloudflare :

- `BOT_TOKEN`
- `WEBHOOK_SECRET`

Health check :

```text
tg-md-bot: OK test-page-v1
```

## Statut

Développement actif.

**Rich Messages + Durable Objects + liaison automatique des médias + 5 langues.**
