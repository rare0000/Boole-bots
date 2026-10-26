/* Boole Bots. Vanilla JavaScript; no build step or third-party runtime. */
(function () {
  'use strict';
  const { resolveCollision, hasUniqueNonemptyNames, OPERATIONS } = window.BooleLogic;
  const COLORS = ['#d3ff65', '#72dfeb', '#fba671', '#f68fbd'];
  const ICONS = ['◆', '✦', '▲', '⬢', '●', '★', '✳', '⬟'];
  const DIRECTIONS = {
    N: [0, -1], NE: [Math.SQRT1_2, -Math.SQRT1_2], E: [1, 0],
    SE: [Math.SQRT1_2, Math.SQRT1_2], S: [0, 1],
    SW: [-Math.SQRT1_2, Math.SQRT1_2], W: [-1, 0], NW: [-Math.SQRT1_2, -Math.SQRT1_2]
  };
  const DIRECTIONS_LABELS = { N: 'North', NE: 'Northeast', E: 'East', SE: 'Southeast', S: 'South', SW: 'Southwest', W: 'West', NW: 'Northwest' };
  const DEFAULTS = [
    { name: 'ALPHA', bit: 1, operation: 'AND', speed: 3, direction: 'SE', icon: '◆' },
    { name: 'PIXEL', bit: 0, operation: 'NOT', speed: 4, direction: 'SW', icon: '✦' },
    { name: 'NOVA', bit: 1, operation: 'XOR', speed: 3, direction: 'NE', icon: '▲' },
    { name: 'GLITCH', bit: 0, operation: 'OR', speed: 5, direction: 'NW', icon: '⬢' }
  ];
  const configs = DEFAULTS.map((bot, id) => ({ ...bot, id, color: COLORS[id] }));
  const $ = (id) => document.getElementById(id);
  const arena = $('arena');
  const ctx = arena.getContext('2d');
  let dimensions = 8;
  let bots = [];
  let phase = 'ready'; // ready, running, paused, finished
  let elapsed = 0;
  let lastFrame = 0;
  let collisionCount = 0;
  let pairCooldowns = new Map();
  let logMessages = [];
  let arenaPixels = 500;

  function namesError() {
    const names = configs.map(b => b.name.trim());
    if (names.some(n => !n)) return 'Every bot needs a name before the battle can begin.';
    if (!hasUniqueNonemptyNames(names)) return 'Bot names must be unique (capitalization does not count).';
    return '';
  }
  function renderConfigCards() {
    $('botConfigs').innerHTML = '';
    configs.forEach((bot, id) => {
      const card = document.createElement('article');
      card.className = 'bot-card';
      card.style.setProperty('--bot-color', bot.color);
      card.innerHTML = `
        <div class="bot-card-heading"><div><span class="bot-number">BOT / 0${id + 1}</span><br><strong>FIGHTER ${id + 1}</strong></div><div class="bot-preview"><span class="preview-token" aria-hidden="true"></span><span class="preview-dot" aria-hidden="true"></span></div></div>
        <div class="field"><label class="field-label" for="bot-name-${id}">BOT NAME</label><input id="bot-name-${id}" type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Name your bot" /></div>
        <div class="field-pair"><div class="field"><label class="field-label" for="bot-bit-${id}">BIT VALUE</label><select id="bot-bit-${id}"><option value="0">0</option><option value="1">1</option></select></div><div class="field"><label class="field-label" for="bot-op-${id}">OPERATION</label><select id="bot-op-${id}">${OPERATIONS.map(op => `<option value="${op}">${op}</option>`).join('')}</select></div></div>
        <div class="field"><div class="speed-head"><label class="field-label" for="bot-speed-${id}">MOVEMENT SPEED</label><span class="speed-value" id="speed-value-${id}">${bot.speed} / 5</span></div><input id="bot-speed-${id}" type="range" min="1" max="5" step="1" value="${bot.speed}" /></div>
        <div class="field"><label class="field-label" for="bot-direction-${id}">START DIRECTION</label><select id="bot-direction-${id}">${Object.entries(DIRECTIONS_LABELS).map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}</select></div>
        <div class="field"><span class="field-label">BOT ICON · CHOOSE ONE</span><div class="icon-palette" id="icons-${id}" role="group" aria-label="Choose an icon for bot ${id + 1}"></div></div>`;
      $('botConfigs').appendChild(card);
      card.querySelector('.preview-token').textContent = bot.icon;
      const inputs = {
        name: card.querySelector(`#bot-name-${id}`), bit: card.querySelector(`#bot-bit-${id}`),
        operation: card.querySelector(`#bot-op-${id}`), speed: card.querySelector(`#bot-speed-${id}`),
        direction: card.querySelector(`#bot-direction-${id}`)
      };
      Object.keys(inputs).forEach(key => {
        const input = inputs[key];
        input.value = String(bot[key]);
        input.addEventListener(key === 'speed' ? 'input' : 'change', () => {
          bot[key] = key === 'bit' || key === 'speed' ? Number(input.value) : input.value;
          if (key === 'speed') $(`speed-value-${id}`).textContent = `${bot.speed} / 5`;
          settingsChanged();
        });
      });
      // Validate as a name is typed, without requiring focus to leave the input.
      inputs.name.addEventListener('input', () => { bot.name = inputs.name.value; settingsChanged(); });
    });
    renderIconPalettes();
  }
  function renderIconPalettes() {
    configs.forEach((bot, id) => {
      const palette = $(`icons-${id}`);
      palette.innerHTML = '';
      ICONS.forEach(icon => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'icon-choice' + (bot.icon === icon ? ' is-selected' : '');
        b.textContent = icon;
        b.setAttribute('aria-label', 'Use ' + icon + ' icon');
        b.setAttribute('aria-pressed', String(bot.icon === icon));
        b.title = icon;
        b.disabled = configs.some(other => other.id !== id && other.icon === icon);
        b.addEventListener('click', () => {
          bot.icon = icon;
          $('botConfigs').children[id].querySelector('.preview-token').textContent = icon;
          renderIconPalettes();
          settingsChanged();
        });
        palette.appendChild(b);
      });
    });
  }
  function settingsChanged() {
    resetRound(false);
    validate();
  }
  function validate() {
    const err = namesError();
    $('configError').textContent = err;
    $('configError').hidden = !err;
    $('battleButton').disabled = !!err;
    configs.forEach((cfg, id) => {
      const input = $(`bot-name-${id}`);
      input.setAttribute('aria-invalid', String(!cfg.name.trim() || configs.some(c => c.id !== id && c.name.trim().toLowerCase() === cfg.name.trim().toLowerCase())));
    });
    if (err) $('statusLine').textContent = err;
    return !err;
  }
  function resetRound(announce = true) {
    phase = 'ready';
    elapsed = 0;
    collisionCount = 0;
    pairCooldowns.clear();
    const tiles = [];
    for (let y = 0; y < dimensions; y++) for (let x = 0; x < dimensions; x++) tiles.push([x + .5, y + .5]);
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    bots = configs.filter(b => b.name.trim()).map((cfg, index) => {
      const [x, y] = tiles[index];
      const [dx, dy] = DIRECTIONS[cfg.direction];
      return { ...cfg, name: cfg.name.trim(), x, y, dx, dy, alive: true,
        wins: 0, losses: 0, ties: 0, pauseUntil: 0 };
    });
    logMessages = [];
    addLog('Arena ready. Customize your bots and press BATTLE!');
    if (announce) addLog(`${dimensions} × ${dimensions} arena initialized.`);
    setOverlay('ready');
    syncUI();
  }
  function setOverlay(mode, winner) {
    const overlay = $('arenaOverlay');
    if (mode === 'running') { overlay.hidden = true; return; }
    overlay.hidden = false;
    const symbol = overlay.querySelector('.overlay-emblem');
    const title = overlay.querySelector('strong');
    const detail = overlay.querySelector('span');
    if (mode === 'ready') { symbol.textContent = '∧ OR ⊕'; title.textContent = 'READY FOR BATTLE?'; detail.textContent = 'Configure your bots and hit BATTLE!'; }
    if (mode === 'paused') { symbol.textContent = 'Ⅱ'; title.textContent = 'BATTLE PAUSED'; detail.textContent = 'Press BATTLE! to pick up where you left off.'; }
    if (mode === 'finished') { symbol.textContent = '★'; title.textContent = `${winner.name} WINS!`; detail.textContent = 'Press BATTLE! to begin a new round.'; }
  }
  function addLog(message) {
    logMessages.unshift({ at: elapsed, message });
    logMessages.length = Math.min(logMessages.length, 100);
    renderLog();
  }
  function formatTime(ms) { const total = Math.floor(ms / 1000); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; }
  function renderLog() {
    const feed = $('battleLog');
    if (!feed) return; // The compact layout intentionally has no event log.
    feed.textContent = '';
    if (!logMessages.length) {
      const p = document.createElement('p'); p.className = 'log-text'; p.textContent = 'No events yet.'; feed.appendChild(p); return;
    }
    logMessages.slice(0, 40).forEach(entry => {
      const line = document.createElement('div'); line.className = 'log-entry';
      const stamp = document.createElement('span'); stamp.className = 'log-time'; stamp.textContent = formatTime(entry.at);
      const msg = document.createElement('span'); msg.className = 'log-text'; msg.textContent = entry.message;
      line.append(stamp, msg); feed.appendChild(line);
    });
  }
  function renderScoreboard() {
    const board = $('leaderboard'); board.textContent = '';
    const ordered = [...bots].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.id - b.id);
    const best = Math.max(0, ...bots.map(bot => bot.wins));
    ordered.forEach((bot, index) => {
      const row = document.createElement('div');
      row.className = 'leader-row' + (best > 0 && bot.wins === best ? ' is-leader' : '');
      const identity = document.createElement('div'); identity.className = 'leader-identity';
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(index + 1).padStart(2, '0');
      const token = document.createElement('span'); token.className = 'leader-token'; token.textContent = bot.icon; token.style.color = bot.color;
      const name = document.createElement('div'); name.className = 'leader-name';
      const strong = document.createElement('strong'); strong.textContent = bot.name;
      const info = document.createElement('small'); info.textContent = bot.alive ? `${bot.operation} · BIT ${bot.bit}` : 'ELIMINATED';
      name.append(strong, info); identity.append(rank, token, name); row.append(identity);
      [bot.wins, bot.losses, bot.ties].forEach((value, idx) => {
        const col = document.createElement('span'); col.className = 'leader-value' + (idx === 1 ? ' leader-loss' : idx === 2 ? ' leader-tie' : ''); col.textContent = value; row.append(col);
      });
      board.appendChild(row);
    });
  }
  function syncUI() {
    $('clock').textContent = formatTime(elapsed);
    $('remaining').innerHTML = `${String(bots.filter(b => b.alive).length).padStart(2, '0')} <small>/ ${String(bots.length).padStart(2, '0')}</small>`;
    $('collisions').textContent = String(collisionCount).padStart(2, '0');
    $('arenaLabel').textContent = `${dimensions} × ${dimensions}`;
    $('battleLabel').textContent = phase === 'running' ? 'STOP!' : 'BATTLE!';
    $('battleSymbol').textContent = phase === 'running' ? 'Ⅱ' : '▶';
    $('battleButton').classList.toggle('is-stop', phase === 'running');
    $('liveChip').classList.toggle('is-live', phase === 'running');
    $('liveChip').lastChild.textContent = ({ ready: ' READY', running: ' LIVE', paused: ' PAUSED', finished: ' FINISHED' })[phase];
    const messages = { ready: 'Set up your bots below, then start the battle.', running: 'Bots are moving. Collisions decide who survives.', paused: 'Battle paused. Press BATTLE! to continue.', finished: 'Match complete! Press BATTLE! to play again, or reset.' };
    $('statusLine').textContent = namesError() || messages[phase];
    renderScoreboard();
    validate();
  }
  function toggleBattle() {
    if (!validate()) { $('configuration').scrollIntoView({ behavior: 'smooth' }); return; }
    if (phase === 'running') {
      phase = 'paused'; setOverlay('paused'); addLog('Battle paused.'); syncUI(); return;
    }
    if (phase === 'finished') resetRound(false);
    phase = 'running'; setOverlay('running'); addLog('Battle started!'); syncUI();
  }
  function finishIfNeeded() {
    const survivors = bots.filter(bot => bot.alive);
    if (survivors.length === 1) {
      phase = 'finished';
      addLog(`${survivors[0].name} is the last bot standing. Victory!`);
      setOverlay('finished', survivors[0]);
      syncUI();
    }
  }
  function hitWall(bot) {
    let bounced = false;
    const pad = .28;
    if (bot.x < pad || bot.x > dimensions - pad) { bot.x = Math.max(pad, Math.min(dimensions - pad, bot.x)); bot.dx *= -1; bounced = true; }
    if (bot.y < pad || bot.y > dimensions - pad) { bot.y = Math.max(pad, Math.min(dimensions - pad, bot.y)); bot.dy *= -1; bounced = true; }
    if (bounced) {
      // Tiny variation after a wall bounce prevents repetitive parallel tracks.
      const deviation = (Math.random() - .5) * .34;
      const angle = Math.atan2(bot.dy, bot.dx) + deviation;
      bot.dx = Math.cos(angle); bot.dy = Math.sin(angle);
    }
  }
  function update(dt) {
    const oldSeconds = Math.floor(elapsed / 1000);
    elapsed += dt * 1000;
    if (oldSeconds !== Math.floor(elapsed / 1000)) $('clock').textContent = formatTime(elapsed);
    for (const bot of bots) {
      if (!bot.alive || elapsed < bot.pauseUntil) continue;
      const speed = .55 + bot.speed * .41;
      bot.x += bot.dx * speed * dt;
      bot.y += bot.dy * speed * dt;
      hitWall(bot);
    }
    for (let i = 0; i < bots.length; i++) for (let j = i + 1; j < bots.length; j++) {
      const a = bots[i], b = bots[j];
      if (!a.alive || !b.alive || elapsed < a.pauseUntil || elapsed < b.pauseUntil) continue;
      const key = `${a.id}:${b.id}`;
      if ((pairCooldowns.get(key) || 0) > elapsed) continue;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > .58) continue;
      collisionCount++;
      pairCooldowns.set(key, elapsed + 1000);
      const { aResult, bResult, outcome } = resolveCollision(a, b);
      a.pauseUntil = b.pauseUntil = elapsed + 400;
      // Separate sprites without changing their trajectories (otherwise ties immediately re-collide).
      const nx = dist > .001 ? (a.x - b.x) / dist : 1, ny = dist > .001 ? (a.y - b.y) / dist : 0;
      const offset = Math.max(0, (.64 - dist) / 2);
      a.x = Math.max(.28, Math.min(dimensions - .28, a.x + nx * offset));
      a.y = Math.max(.28, Math.min(dimensions - .28, a.y + ny * offset));
      b.x = Math.max(.28, Math.min(dimensions - .28, b.x - nx * offset));
      b.y = Math.max(.28, Math.min(dimensions - .28, b.y - ny * offset));
      if (outcome === 'tie') {
        a.ties++; b.ties++;
        addLog(`${a.name} (${a.operation} → ${aResult}) vs ${b.name} (${b.operation} → ${bResult}): tie!`);
      } else {
        const winner = outcome === 'a' ? a : b;
        const loser = outcome === 'a' ? b : a;
        winner.wins++;
        loser.losses++;
        loser.alive = false;
        addLog(`${winner.name} wins (${winner.operation} → 1). ${loser.name} eliminated (${loser.operation} → 0).`);
      }
      $('collisions').textContent = String(collisionCount).padStart(2, '0');
      $('remaining').innerHTML = `${String(bots.filter(bot => bot.alive).length).padStart(2, '0')} <small>/ ${String(bots.length).padStart(2, '0')}</small>`;

      renderScoreboard();
      finishIfNeeded();
      if (phase !== 'running') return;
    }
  }
  function roundRect(x, y, w, h, r, fill) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) ctx.fill();
  }
  function draw() {
    const px = arenaPixels, cell = px / dimensions;
    ctx.clearRect(0, 0, px, px);
    ctx.fillStyle = '#101e2a'; ctx.fillRect(0, 0, px, px);
    for (let y = 0; y < dimensions; y++) for (let x = 0; x < dimensions; x++) {
      if ((x + y) % 2 === 0) { ctx.fillStyle = '#132434'; ctx.fillRect(x * cell, y * cell, cell, cell); }
      ctx.fillStyle = '#37556a'; ctx.globalAlpha = .25;
      ctx.fillRect((x + .5) * cell - 1, (y + .5) * cell - 1, 2, 2);
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    for (let i = 0; i <= dimensions; i++) {
      ctx.moveTo(i * cell + .5, 0); ctx.lineTo(i * cell + .5, px);
      ctx.moveTo(0, i * cell + .5); ctx.lineTo(px, i * cell + .5);
    }
    ctx.strokeStyle = '#325063'; ctx.globalAlpha = .49; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#68859b'; ctx.font = `700 ${Math.max(8, cell * .12)}px monospace`;
    for (let i = 0; i < dimensions; i++) {
      ctx.fillText(String(i + 1).padStart(2, '0'), i * cell + cell * .07, cell * .16);
      ctx.fillText(String.fromCharCode(65 + i), cell * .06, i * cell + cell * .89);
    }
    for (const bot of bots) {
      if (!bot.alive) continue;
      const x = bot.x * cell, y = bot.y * cell;
      const radius = Math.max(9, cell * .285);
      const scale = Math.max(.68, Math.min(1, cell / 49));
      ctx.save();
      ctx.shadowColor = bot.color; ctx.shadowBlur = Math.max(9, radius * .8);
      ctx.fillStyle = bot.color;
      roundRect(x - radius, y - radius, radius * 2, radius * 2, radius * .38, true);
      ctx.shadowBlur = 0; ctx.fillStyle = '#12202c';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(radius * 1.22)}px sans-serif`;
      ctx.fillText(bot.icon, x, y + 1);
      ctx.font = `700 ${Math.max(7, Math.round(9 * scale))}px monospace`;
      const label = `${bot.name.slice(0, 10)}`;
      const width = Math.max(ctx.measureText(label).width + 13, radius * 1.7);
      ctx.fillStyle = '#09121cee';
      roundRect(x - width / 2, y + radius + 4, width, 15 * scale, 3, true);
      ctx.fillStyle = '#e6f0f6';
      ctx.fillText(label, x, y + radius + 4 + 7.5 * scale);
      ctx.font = `700 ${Math.max(7, Math.round(9 * scale))}px monospace`;
      const label2 = `${bot.operation} · ${bot.bit}`;
      const textWidth = ctx.measureText(label2).width + 10;
      ctx.fillStyle = '#0a1320dd';
      roundRect(x - textWidth / 2, y - radius - 18 * scale, textWidth, 14 * scale, 3, true);
      ctx.fillStyle = bot.color; ctx.fillText(label2, x, y - radius - 11 * scale);
      ctx.restore();
    }
  }
  function resizeCanvas() {
    const bounds = arena.getBoundingClientRect();
    if (!bounds.width) return;
    const px = Math.round(Math.min(bounds.width, bounds.height));
    arenaPixels = px;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    arena.width = Math.round(px * ratio);
    arena.height = Math.round(px * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  function frame(timestamp) {
    if (!lastFrame) lastFrame = timestamp;
    const dt = Math.min((timestamp - lastFrame) / 1000, .05);
    lastFrame = timestamp;
    if (phase === 'running') update(dt);
    draw();
    window.requestAnimationFrame(frame);
  }
  $('battleButton').addEventListener('click', toggleBattle);
  $('resetButton').addEventListener('click', () => { resetRound(); validate(); });
  $('arenaSize').addEventListener('change', e => { dimensions = Number(e.target.value); resetRound(); validate(); });
  renderConfigCards();
  resetRound();
  validate();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resizeCanvas).observe(arena);
  else window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  window.requestAnimationFrame(frame);
})();
