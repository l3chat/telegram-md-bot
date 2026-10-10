# Telegram Rich Message — Test Page

This source file accompanies the bot command `/test en`. It can be used as a small Markdown tutorial.

Normal paragraph with **bold**, *italic*, ~~strikethrough~~ and `inline code`.

---

## 1. Headings

### Level 3 heading

#### Level 4 heading

## 2. Lists

- first item
- second item
- third item

1. one
2. two
3. three

- [x] Markdown
- [x] tables
- [x] code
- [ ] media support

### Live image test — 184273

Before sending this Markdown to the bot, send `184273.png`.

```md
![](184273.png "Test image 184273")
```

## 3. Quote

> Rich Messages can combine structured text, code, tables and media in one Telegram message.

## 4. Table

|Test|✓|
|---|---|
|Markdown|✓|
|Table|✓|
|Media|✓|

## 5. Code

```python
def rich_message(name):
    return f"Hello, {name}!"

print(rich_message("Telegram"))
```

### Live audio test — ding-dong

Send `ding-dong-01.mp3` first, then use:

```md
![](ding-dong-01.mp3 "Test chime")
```

## 6. Math

$$
f(n)=n^2+n+41
$$

$$
\int_{-\infty}^{\infty} \frac{1}{\sqrt{2\pi}} e^{-x^2/2}\,dx = 1
$$

## 7. Expandable section

<details>
<summary>Expandable section</summary>

This text is inside an expandable section.

- A
- B
- C

</details>

### Live video test — number transition

Send `numbers-01.mp4` first, then use:

```md
![](numbers-01.mp4 "Test number video")
```

## 8. Media syntax

For real media, send files first and then reference their names in Markdown.

The bot replaces file names with internal Telegram media references automatically.

---

# End of test

Built with **GPT-6.1**.

[View tutorial source](https://github.com/l3chat/telegram-md-bot/blob/main/docs/tutorial/test-page.en.md)

[Raw Markdown](https://raw.githubusercontent.com/l3chat/telegram-md-bot/main/docs/tutorial/test-page.en.md)

[GitHub repository](https://github.com/l3chat/telegram-md-bot)
