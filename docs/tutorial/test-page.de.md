# Telegram Rich Message — Testseite

Diese Quelldatei gehört zum Befehl `/test de` und kann als kleines Markdown-Tutorial verwendet werden.

Normaler Absatz mit **Fettdruck**, *Kursivschrift*, ~~Durchstreichung~~ und `Inline-Code`.

---

## 1. Überschriften

### Überschrift Ebene 3

#### Überschrift Ebene 4

## 2. Listen

- erster Punkt
- zweiter Punkt
- dritter Punkt

1. eins
2. zwei
3. drei

- [x] Markdown
- [x] Tabellen
- [x] Code
- [ ] Medienunterstützung

### Live-Bildtest — 184273

Zuerst `184273.png` an den Bot senden.

```md
![](184273.png "Testbild 184273")
```

## 3. Zitat

> Rich Messages können strukturierten Text, Code, Tabellen und Medien in einer Telegram-Nachricht kombinieren.

## 4. Tabelle

|Test|✓|
|---|---|
|Markdown|✓|
|Tabelle|✓|
|Medien|✓|

## 5. Code

```python
def rich_message(name):
    return f"Hello, {name}!"

print(rich_message("Telegram"))
```

### Live-Audiotest — Ding-Dong

Zuerst `ding-dong-01.mp3` senden:

```md
![](ding-dong-01.mp3 "Test-Glockenton")
```

## 6. Mathematik

$$
f(n)=n^2+n+41
$$

$$
\int_{-\infty}^{\infty} \frac{1}{\sqrt{2\pi}} e^{-x^2/2}\,dx = 1
$$

## 7. Aufklappbarer Abschnitt

<details>
<summary>Aufklappbarer Abschnitt</summary>

Dieser Text befindet sich im aufklappbaren Abschnitt.

- A
- B
- C

</details>

### Live-Videotest — Zahlenwechsel

Zuerst `numbers-01.mp4` senden:

```md
![](numbers-01.mp4 "Testvideo mit Zahlen")
```

## 8. Mediensyntax

Medien zuerst senden und anschließend ihre Dateinamen im Markdown referenzieren.

Der Bot erzeugt die internen Telegram-Medienverweise automatisch.

---

# Ende des Tests

Erstellt mit **GPT-6.1**.

[Tutorial-Quelltext ansehen](https://github.com/l3chat/telegram-md-bot/blob/main/docs/tutorial/test-page.de.md)

[Raw Markdown](https://raw.githubusercontent.com/l3chat/telegram-md-bot/main/docs/tutorial/test-page.de.md)

[GitHub-Repository](https://github.com/l3chat/telegram-md-bot)
