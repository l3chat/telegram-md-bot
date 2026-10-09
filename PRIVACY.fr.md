# Confidentialité — Telegram Markdown Formatter

**Bot :** @tgMdFormatter_bot

Créé avec **GPT-6.1** · GitHub : https://github.com/l3chat/telegram-md-bot

Le bot traite uniquement le contenu envoyé par l’utilisateur pour créer des Telegram Rich Messages.

## Données pouvant être conservées temporairement

- texte Markdown ;
- valeurs Telegram `file_id` ;
- noms ou alias temporaires de fichiers ;
- ordre des médias ;
- état de l’album / du brouillon.

Les brouillons sont isolés par discussion et utilisateur.

## Durée de conservation

Les brouillons sont supprimés :

- après l’assemblage réussi du Rich Message ; ou
- automatiquement au plus tard 24 heures après la dernière activité.

Les fichiers médias eux-mêmes ne sont **pas copiés dans Durable Objects**. Le bot utilise des références de fichiers hébergés par Telegram.

## Usage statistics

Pour les statistiques agrégées (`/stats`), le bot conserve uniquement un hachage SHA-256 salé de l’identifiant utilisateur et la dernière activité pendant 30 jours au maximum. Le contenu des messages n’est pas inclus. Les compteurs agrégés couvrent les mises à jour reçues, les Rich Messages, les médias et les erreurs.

## Utilisation des données

Le contenu envoyé n’est pas utilisé pour la publicité, le profilage ou l’entraînement de modèles.

Les données utilisateur ne sont pas vendues.

Telegram et Cloudflare peuvent traiter des métadonnées techniques de requête, de livraison et d’infrastructure selon leurs propres services et politiques.

## Page publique de confidentialité

https://tg-md-bot.lechat-reg.workers.dev/privacy?lang=fr
