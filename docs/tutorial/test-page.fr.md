# Telegram Rich Message — Page de test

Ce fichier source correspond à la commande `/test fr` et peut servir de petit tutoriel Markdown.

Paragraphe normal avec **gras**, *italique*, ~~barré~~ et `code inline`.

---

## 1. Titres

### Titre niveau 3

#### Titre niveau 4

## 2. Listes

- premier élément
- deuxième élément
- troisième élément

1. un
2. deux
3. trois

- [x] Markdown
- [x] tableaux
- [x] code
- [ ] prise en charge des médias

### Test réel d’image — 184273

Envoyez d’abord `184273.png` au bot.

```md
![](184273.png "Image de test 184273")
```

## 3. Citation

> Les Rich Messages peuvent réunir texte structuré, code, tableaux et médias dans un seul message Telegram.

## 4. Tableau

|Test|✓|
|---|---|
|Markdown|✓|
|Tableau|✓|
|Médias|✓|

## 5. Code

```python
def rich_message(name):
    return f"Hello, {name}!"

print(rich_message("Telegram"))
```

### Test audio réel — ding-dong

Envoyez d’abord `ding-dong-01.mp3` :

```md
![](ding-dong-01.mp3 "Carillon de test")
```

## 6. Mathématiques

$$
f(n)=n^2+n+41
$$

$$
\int_{-\infty}^{\infty} \frac{1}{\sqrt{2\pi}} e^{-x^2/2}\,dx = 1
$$

## 7. Section repliable

<details>
<summary>Section repliable</summary>

Ce texte se trouve dans une section repliable.

- A
- B
- C

</details>

### Test vidéo réel — transition de nombres

Envoyez d’abord `numbers-01.mp4` :

```md
![](numbers-01.mp4 "Vidéo de test avec nombres")
```

## 8. Syntaxe des médias

Envoyez les fichiers d’abord, puis référencez leurs noms dans Markdown.

Le bot crée automatiquement les références média internes de Telegram.

---

# Fin du test

Créé avec **GPT-6.1**.

[Voir la source du tutoriel](https://github.com/l3chat/telegram-md-bot/blob/main/docs/tutorial/test-page.fr.md)

[Markdown brut](https://raw.githubusercontent.com/l3chat/telegram-md-bot/main/docs/tutorial/test-page.fr.md)

[Dépôt GitHub](https://github.com/l3chat/telegram-md-bot)
