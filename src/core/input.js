/* Input: keyboard, pointer (mouse + touch), gamepad -> unified actions in virtual canvas coordinates. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const ACTIONS = {
    up:        { keys: ['ArrowUp', 'KeyW'],    pad: [12], axis: { i: 1, dir: -1 } },
    down:      { keys: ['ArrowDown', 'KeyS'],  pad: [13], axis: { i: 1, dir: 1 } },
    left:      { keys: ['ArrowLeft', 'KeyA'],  pad: [14], axis: { i: 0, dir: -1 } },
    right:     { keys: ['ArrowRight', 'KeyD'], pad: [15], axis: { i: 0, dir: 1 } },
    confirm:   { keys: ['Enter', 'Space', 'NumpadEnter'], pad: [0] },
    cancel:    { keys: ['Escape'], pad: [1] },
    alt:       { keys: ['KeyX', 'KeyE'], pad: [2] },
    lair:      { keys: ['KeyH', 'KeyY'], pad: [3] },
    speed:     { keys: ['ShiftLeft', 'ShiftRight'], pad: [5] },
    slow:      { keys: ['ControlLeft', 'ControlRight'], pad: [4] },
    pause:     { keys: ['KeyP'], pad: [] },
    menu:      { keys: ['Tab', 'KeyM'], pad: [9] },
    chronicle: { keys: ['KeyC'], pad: [] },
    factions:  { keys: ['KeyF'], pad: [] },
    zoomIn:    { keys: ['Equal', 'NumpadAdd', 'BracketRight'], pad: [7] },
    zoomOut:   { keys: ['Minus', 'NumpadSubtract', 'BracketLeft'], pad: [6] },
    nextTarget:{ keys: ['KeyQ'], pad: [] },
    action1:   { keys: ['Digit1', 'Numpad1'], pad: [] },
    action2:   { keys: ['Digit2', 'Numpad2'], pad: [] },
    action3:   { keys: ['Digit3', 'Numpad3'], pad: [] },
    action4:   { keys: ['Digit4', 'Numpad4'], pad: [] },
    action5:   { keys: ['Digit5', 'Numpad5'], pad: [] },
    action6:   { keys: ['Digit6', 'Numpad6'], pad: [] },
    action7:   { keys: ['Digit7', 'Numpad7'], pad: [] },
    action8:   { keys: ['Digit8', 'Numpad8'], pad: [] },
    action9:   { keys: ['Digit9', 'Numpad9'], pad: [] },
  };

  const input = HB.input = {
    ACTIONS,
    keysDown: new Set(),
    keysPressed: new Set(),
    keysReleased: new Set(),
    textQueue: [],          // printable characters typed this frame
    specialQueue: [],       // Backspace / Delete / Enter for text fields
    textCapture: false,     // when true, keyboard goes to a text field; actions from letters are suppressed
    pointer: {
      x: -1, y: -1, inside: false, down: false, pressed: false, released: false, button: 0,
      wheel: 0, dx: 0, dy: 0, dragging: false, dragStartX: 0, dragStartY: 0, dragDist: 0,
      isTouch: false, pinch: 0, moved: false, lastMoveTime: 0, clickX: 0, clickY: 0,
    },
    pointers: new Map(),
    gamepad: { connected: false, buttons: [], prevButtons: [], axes: [0, 0, 0, 0], index: -1, lastUsed: 0 },
    lastDevice: 'mouse',    // 'mouse' | 'keyboard' | 'gamepad' | 'touch'
    navRepeat: { dir: null, t: 0, fired: false },
    canvas: null,
    _frameActions: { pressed: new Set(), released: new Set() },
    toVirtual(cx, cy) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (cx - r.left) / r.width * HB.W, y: (cy - r.top) / r.height * HB.H };
    },
  };

  input.bind = function (canvas) {
    input.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) { if (input.textCapture && e.key === 'Backspace') input.specialQueue.push('Backspace'); return; }
      input.lastDevice = 'keyboard';
      input.keysDown.add(e.code);
      input.keysPressed.add(e.code);
      if (input.textCapture) {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { input.textQueue.push(e.key); e.preventDefault(); }
        else if (['Backspace', 'Delete', 'Enter', 'Tab', 'Escape'].includes(e.key)) { input.specialQueue.push(e.key); if (e.key !== 'Escape') e.preventDefault(); }
      } else if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { input.keysDown.delete(e.code); input.keysReleased.add(e.code); });
    window.addEventListener('blur', () => { input.keysDown.clear(); });

    const p = input.pointer;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      input.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      p.isTouch = e.pointerType === 'touch';
      input.lastDevice = p.isTouch ? 'touch' : 'mouse';
      if (input.pointers.size === 1) {
        const v = input.toVirtual(e.clientX, e.clientY);
        p.x = v.x; p.y = v.y; p.down = true; p.pressed = true; p.button = e.button;
        p.dragStartX = v.x; p.dragStartY = v.y; p.dragDist = 0; p.dragging = false; p.clickX = v.x; p.clickY = v.y;
      }
      if (input.pointers.size === 2) { p.pinchStart = pinchDist(); p.pinchLast = p.pinchStart; }
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      const v = input.toVirtual(e.clientX, e.clientY);
      if (input.pointers.has(e.pointerId)) input.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (input.pointers.size >= 2) {
        const d = pinchDist();
        if (p.pinchLast) p.pinch += (d - p.pinchLast) / 200;
        p.pinchLast = d;
        return;
      }
      if (e.pointerType !== 'touch') input.lastDevice = 'mouse';
      p.dx += v.x - p.x; p.dy += v.y - p.y;
      p.x = v.x; p.y = v.y; p.inside = true; p.moved = true; p.lastMoveTime = performance.now();
      if (p.down) { p.dragDist += Math.abs(v.x - p.dragStartX) + Math.abs(v.y - p.dragStartY); if (HB.dist(v.x, v.y, p.dragStartX, p.dragStartY) > 6) p.dragging = true; }
    });
    const up = (e) => {
      input.pointers.delete(e.pointerId);
      if (input.pointers.size < 2) { p.pinchLast = 0; }
      if (input.pointers.size === 0) {
        if (p.down) p.released = true;
        p.down = false;
      }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') p.inside = false; });
    canvas.addEventListener('wheel', (e) => { p.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    function pinchDist() {
      const pts = [...input.pointers.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }

    window.addEventListener('gamepadconnected', (e) => { input.gamepad.connected = true; input.gamepad.index = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { input.gamepad.connected = false; input.gamepad.index = -1; });
  };

  /** Called at the start of each frame to poll gamepad and compute action states. */
  input.beginFrame = function (dt) {
    const gp = input.gamepad;
    gp.prevButtons = gp.buttons;
    gp.buttons = [];
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (const g of pads) if (g && g.connected) { pad = g; break; }
    if (pad) {
      gp.connected = true;
      gp.buttons = pad.buttons.map(b => b.pressed);
      gp.axes = pad.axes.slice(0, 4).map(a => Math.abs(a) < 0.25 ? 0 : a);
      const any = gp.buttons.some(Boolean) || gp.axes.some(a => a !== 0);
      if (any) { input.lastDevice = 'gamepad'; gp.lastUsed = performance.now(); }
    } else { gp.connected = false; gp.axes = [0, 0, 0, 0]; }

    // navigation repeat (keyboard arrows + dpad + stick)
    const nav = input.navRepeat;
    let dir = null;
    for (const d of ['up', 'down', 'left', 'right']) if (input.held(d)) { dir = d; break; }
    if (dir !== nav.dir) { nav.dir = dir; nav.t = 0; nav.fired = false; }
    else if (dir) nav.t += dt;
  };

  input.endFrame = function () {
    input.keysPressed.clear(); input.keysReleased.clear();
    input.textQueue.length = 0; input.specialQueue.length = 0;
    const p = input.pointer;
    p.pressed = false; p.released = false; p.wheel = 0; p.dx = 0; p.dy = 0; p.pinch = 0; p.moved = false;
    if (!p.down) p.dragging = false;
  };

  function padPressed(i) { const gp = input.gamepad; return !!gp.buttons[i] && !gp.prevButtons[i]; }
  function padHeld(i) { return !!input.gamepad.buttons[i]; }
  function padReleased(i) { const gp = input.gamepad; return !gp.buttons[i] && !!gp.prevButtons[i]; }
  function axisHeld(ax) { if (!ax) return false; const v = input.gamepad.axes[ax.i]; return ax.dir < 0 ? v < -0.5 : v > 0.5; }

  input.pressed = function (action) {
    const a = ACTIONS[action]; if (!a) return false;
    if (!input.textCapture || action === 'cancel') for (const k of a.keys) if (input.keysPressed.has(k)) return true;
    for (const b of a.pad) if (padPressed(b)) return true;
    return false;
  };
  input.held = function (action) {
    const a = ACTIONS[action]; if (!a) return false;
    if (!input.textCapture || action === 'cancel') for (const k of a.keys) if (input.keysDown.has(k)) return true;
    for (const b of a.pad) if (padHeld(b)) return true;
    if (axisHeld(a.axis)) return true;
    return false;
  };
  input.released = function (action) {
    const a = ACTIONS[action]; if (!a) return false;
    for (const k of a.keys) if (input.keysReleased.has(k)) return true;
    for (const b of a.pad) if (padReleased(b)) return true;
    return false;
  };
  /** direction navigation with initial press + auto repeat */
  input.nav = function (dir) {
    const nav = input.navRepeat;
    if (nav.dir !== dir) return false;
    if (!nav.fired) { nav.fired = true; return true; }
    if (nav.t > 0.38) { nav.t -= 0.11; return true; }
    return false;
  };
  input.keyPressed = (code) => input.keysPressed.has(code);
  input.anyKeyPressed = () => input.keysPressed.size > 0;
  input.usingPointer = () => input.lastDevice === 'mouse' || input.lastDevice === 'touch';
  input.usingGamepad = () => input.lastDevice === 'gamepad';
  input.stick = (i) => input.gamepad.axes[i] || 0;
})();
