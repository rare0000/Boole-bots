# Boole Bots

A little browser game where **Boolean logic decides which robot survives**.

I built this as a way to turn something that usually lives in truth tables into a game you can actually watch. You set up four bots, give each one a Boolean value and an operation, and let them loose in a grid arena. When two bots collide, both calculate a result. The bot with `1` wins against the bot with `0`.

If they get the same result, neither is eliminated. Sometimes logic is a draw.

## What's in the game?

- Four customizable bots, each with a name, bit (`0` or `1`), operation, speed, and starting direction.
- An animated arena with an **8 × 8** starting grid. You can also switch to 10 × 10, 12 × 12, or 16 × 16.
- Five operations: **AND, OR, XOR, NOT, NOR**.
- Movement in eight directions, wall bounces, and a short pause when bots collide.
- A leaderboard showing collision wins, losses, and ties, with the top-scoring bot highlighted.
- Battle / pause controls, a match timer and a reset button.
- Unique bot icons. Once one bot picks an icon, the others can't use it.
- Name checks so two bots can't enter a battle with the same name.

The page opens straight into the arena and leaderboard, with the bot builder right below. No splash screen or extra sections. It works on desktop and mobile, although it's easier to follow the action on a bigger screen.

## A quick example

Say these bots run into each other:

| Bot | Value | Operation | Result |
| --- | --- | --- | --- |
| Alpha | `1` | `AND` | `1 AND 0 = 0` |
| Pixel | `0` | `NOT` | `NOT 0 = 1` |

**Pixel wins.** Alpha is removed from the arena and Pixel gets one win added to the leaderboard.

Each bot runs *its own* operation using its bit and its opponent's bit. `NOT` is the exception: it only flips the bot's own bit. If both results are `0`, or both are `1`, that's a tie and both bots keep going.

## Run it yourself

**Easiest way:** download the repository and open `index.html` in your browser. No install, build step, or API key needed.

Or, if you prefer a local server, open a terminal in the project folder and run:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

### Run the tests

You'll need Node.js installed. No `npm install` is necessary.

```bash
npm test
```

The tests cover the Boolean truth tables, who wins a collision, tied results, and duplicate-name validation.

## Made with

- **HTML** for the page and controls
- **CSS** for the layout and responsive design
- **JavaScript** for movement, collisions, scoring, and drawing the arena with Canvas
- **Node.js built-in test runner** for logic tests

No game engine or JavaScript framework. I wanted to write the game logic myself instead of hiding it inside a library.

## Play it on GitHub Pages

You can make this playable straight from your GitHub profile:

1. Upload the files in this repository (not just a ZIP).
2. Open your repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and **/ (root)**, then save.
5. GitHub will show the published link once the site has deployed.

Since this is a static website, there's no backend or hosting configuration to worry about.

## A few things I'd like to improve

- Save bot presets between visits.
- Show a match-by-match history rather than only the current round.
- Add sounds and collision effects (with a mute button).
- Let you run a tournament with several rounds.

---

*Small note on the rules:* the original challenge description mentions NOR in one place and XOR in another, so I included both. Losses count **up** when a bot is eliminated (rather than showing negative loss counts). The arena resets when you change bot settings so each match starts cleanly.

*This project was vibe coded with AI assistance.*
