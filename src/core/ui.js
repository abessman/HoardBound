/* In-canvas UI toolkit: widgets, pointer + keyboard + gamepad focus navigation, tooltips, modals. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const P = () => HB.palette;

  class Widget {
    constructor(o = {}) {
      Object.assign(this, { x: 0, y: 0, w: 100, h: 32, visible: true, focusable: true, disabled: false, disabledReason: '', tooltip: '', hotkey: null, hotkeyLabel: '', id: null, group: null, scroll: null }, o);
      this.hover = false; this.focused = false; this.pressAnim = 0;
    }
    contains(px, py) { return this.visible && HB.pointInRect(px, py, this.x, this.y, this.w, this.h); }
    activate(ui) { if (this.disabled) { ui.flash(this); return; } this.pressAnim = 1; if (this.onClick) this.onClick(this, ui); }
    update(dt) { this.pressAnim = Math.max(0, this.pressAnim - dt * 5); }
    draw() { }
    tooltipText() { return this.disabled && this.disabledReason ? this.disabledReason : this.tooltip; }
  }

  class Button extends Widget {
    constructor(o) { super(Object.assign({ h: 36, label: '', size: 17, family: 'sc', icon: null, primary: false, small: false, align: 'center' }, o)); }
    draw(ctx, ui) {
      const p = P();
      const lift = this.pressAnim > 0 ? 1 : 0;
      ctx.save();
      if (this.disabled) ctx.globalAlpha *= 0.55;
      const fill = this.primary ? 'rgba(220,170,70,0.35)' : this.hover || this.focused ? 'rgba(255,250,235,0.78)' : 'rgba(255,246,222,0.5)';
      HB.parchment.plaque(ctx, this.x, this.y + lift, this.w, this.h, { fill, width: this.focused ? 2.5 : 1.5, color: this.focused ? p.focus : p.ink, radius: this.small ? 2 : 4 });
      if (this.focused) {
        ctx.save(); ctx.strokeStyle = p.focus; ctx.globalAlpha *= 0.45; ctx.lineWidth = 5; HB.parchment.roundRect(ctx, this.x - 2, this.y + lift - 2, this.w + 4, this.h + 4, 5); ctx.stroke(); ctx.restore();
      }
      let tx = this.align === 'center' ? this.x + this.w / 2 : this.x + 12;
      if (this.icon) {
        const ic = typeof this.icon === 'function' ? this.icon() : this.icon;
        if (ic) { const s = Math.min(this.h - 8, 28) / Math.max(ic.width, ic.height); HB.px.blit(ctx, ic, this.x + 8, this.y + lift + (this.h - ic.height * s) / 2, s); if (this.align === 'center') tx += 8; else tx += 10 + ic.width * s; }
      }
      HB.text.draw(ctx, this.label, tx, this.y + lift + this.h / 2 + this.size * 0.36, { size: this.size, family: this.family, align: this.align, color: p.ink, maxWidth: this.w - 20 });
      if (this.hotkeyLabel) {
        HB.text.draw(ctx, this.hotkeyLabel, this.x + this.w - 6, this.y + lift + 12, { size: 11, align: 'right', color: p.inkSoft });
      }
      ctx.restore();
    }
  }

  class Label extends Widget {
    constructor(o) { super(Object.assign({ focusable: false, text: '', size: 16, align: 'left', family: 'body', italic: false, color: null, wrap: false, lineHeight: null }, o)); }
    draw(ctx) {
      const t = typeof this.text === 'function' ? this.text() : this.text;
      if (this.wrap) HB.text.paragraph(ctx, t, this.x, this.y, this.w, { size: this.size, align: this.align, family: this.family, italic: this.italic, color: this.color || P().ink, lineHeight: this.lineHeight });
      else HB.text.draw(ctx, t, this.align === 'center' ? this.x + this.w / 2 : this.align === 'right' ? this.x + this.w : this.x, this.y + this.size, { size: this.size, align: this.align, family: this.family, italic: this.italic, color: this.color || P().ink });
    }
  }

  class Toggle extends Widget {
    constructor(o) { super(Object.assign({ h: 30, label: '', value: false, onChange: null, options: null, size: 16 }, o)); }
    activate(ui) {
      if (this.disabled) { ui.flash(this); return; }
      this.pressAnim = 1;
      if (this.options) { this.index = (this.index + 1) % this.options.length; this.value = this.options[this.index].value; }
      else this.value = !this.value;
      if (this.onChange) this.onChange(this.value, this);
    }
    draw(ctx) {
      const p = P();
      ctx.save();
      if (this.disabled) ctx.globalAlpha *= 0.55;
      HB.text.draw(ctx, this.label, this.x, this.y + this.h / 2 + 6, { size: this.size, color: p.ink });
      const bw = this.options ? 150 : 46, bx = this.x + this.w - bw, by = this.y + 3, bh = this.h - 6;
      HB.parchment.plaque(ctx, bx, by, bw, bh, { fill: this.hover || this.focused ? 'rgba(255,250,235,0.8)' : 'rgba(255,246,222,0.5)', color: this.focused ? p.focus : p.ink, width: this.focused ? 2.5 : 1.5 });
      if (this.options) {
        const opt = this.options[this.index];
        HB.text.draw(ctx, '‹ ' + opt.label + ' ›', bx + bw / 2, by + bh / 2 + 5, { size: 14, align: 'center', family: 'sc', color: p.ink });
      } else {
        ctx.fillStyle = this.value ? p.good : p.parchmentDeep;
        HB.parchment.roundRect(ctx, bx + (this.value ? bw / 2 : 3), by + 3, bw / 2 - 3, bh - 6, 2); ctx.fill();
        HB.text.draw(ctx, this.value ? 'on' : 'off', bx + (this.value ? bw * 0.25 : bw * 0.75), by + bh / 2 + 4, { size: 12, align: 'center', family: 'sc', color: p.ink });
      }
      ctx.restore();
    }
  }
  Toggle.prototype.setOptions = function (options, value) { this.options = options; this.index = Math.max(0, options.findIndex(o => o.value === value)); this.value = options[this.index].value; };

  class TextField extends Widget {
    constructor(o) { super(Object.assign({ h: 34, value: '', placeholder: '', maxLength: 24, onChange: null, onEnter: null, size: 18, label: '' }, o)); this.caret = 0; }
    activate(ui) { ui.setFocus(this); ui.textFocus = this; }
    draw(ctx, ui) {
      const p = P();
      const editing = ui.textFocus === this;
      if (this.label) HB.text.draw(ctx, this.label, this.x, this.y - 6, { size: 14, family: 'sc', color: p.inkSoft });
      HB.parchment.plaque(ctx, this.x, this.y, this.w, this.h, { fill: editing ? 'rgba(255,252,240,0.9)' : 'rgba(255,246,222,0.55)', color: this.focused || editing ? p.focus : p.ink, width: this.focused || editing ? 2.5 : 1.5 });
      const showPh = !this.value && !editing;
      HB.text.draw(ctx, showPh ? this.placeholder : this.value, this.x + 10, this.y + this.h / 2 + this.size * 0.36, { size: this.size, color: showPh ? p.inkFaint : p.ink, italic: showPh, maxWidth: this.w - 20 });
      if (editing && Math.floor(performance.now() / 500) % 2 === 0) {
        const w = Math.min(HB.text.width(this.value, this.size), this.w - 20);
        ctx.fillStyle = p.ink; ctx.fillRect(this.x + 11 + w, this.y + 8, 1.5, this.h - 16);
      }
    }
    handleText(ui) {
      const inp = HB.input;
      let changed = false;
      for (const ch of inp.textQueue) { if (this.value.length < this.maxLength) { this.value += ch; changed = true; } }
      for (const sp of inp.specialQueue) {
        if (sp === 'Backspace') { this.value = this.value.slice(0, -1); changed = true; }
        else if (sp === 'Enter' || sp === 'Tab' || sp === 'Escape') { ui.textFocus = null; if (sp === 'Enter' && this.onEnter) this.onEnter(this.value, this); }
      }
      if (changed && this.onChange) this.onChange(this.value, this);
    }
  }

  /** Scrollable list. items: array; itemHeight; drawItem(ctx, item, x, y, w, h, state); onSelect(item) */
  class ListBox extends Widget {
    constructor(o) { super(Object.assign({ items: [], itemHeight: 44, drawItem: null, onSelect: null, onHover: null, selected: -1, gap: 4, emptyText: 'Nothing here.' }, o)); this.scrollY = 0; this.hoverIndex = -1; }
    get contentHeight() { return this.items.length * (this.itemHeight + this.gap); }
    clampScroll() { this.scrollY = HB.clamp(this.scrollY, 0, Math.max(0, this.contentHeight - this.h)); }
    indexAt(px, py) {
      if (!this.contains(px, py)) return -1;
      const i = Math.floor((py - this.y + this.scrollY) / (this.itemHeight + this.gap));
      return i >= 0 && i < this.items.length ? i : -1;
    }
    ensureVisible(i) {
      const top = i * (this.itemHeight + this.gap), bot = top + this.itemHeight;
      if (top < this.scrollY) this.scrollY = top;
      if (bot > this.scrollY + this.h) this.scrollY = bot - this.h;
      this.clampScroll();
    }
    activate(ui) {
      if (this.disabled) return;
      const i = ui.pointerActive ? this.indexAt(HB.input.pointer.x, HB.input.pointer.y) : this.selected;
      if (i >= 0) { this.selected = i; if (this.onSelect) this.onSelect(this.items[i], i, this); }
    }
    navigate(dir) {
      if (!this.items.length) return false;
      if (dir === 'down' && this.selected < this.items.length - 1) { this.selected++; this.ensureVisible(this.selected); return true; }
      if (dir === 'up' && this.selected > 0) { this.selected--; this.ensureVisible(this.selected); return true; }
      return false;
    }
    draw(ctx, ui) {
      const p = P();
      ctx.save();
      ctx.beginPath(); ctx.rect(this.x, this.y, this.w, this.h); ctx.clip();
      const ptr = HB.input.pointer;
      this.hoverIndex = this.hover ? this.indexAt(ptr.x, ptr.y) : -1;
      if (!this.items.length) HB.text.draw(ctx, this.emptyText, this.x + this.w / 2, this.y + 30, { size: 15, italic: true, align: 'center', color: p.inkSoft });
      for (let i = 0; i < this.items.length; i++) {
        const iy = this.y + i * (this.itemHeight + this.gap) - this.scrollY;
        if (iy + this.itemHeight < this.y || iy > this.y + this.h) continue;
        const state = { hover: i === this.hoverIndex, selected: i === this.selected, focused: this.focused && i === this.selected };
        const fill = state.selected ? 'rgba(220,170,70,0.3)' : state.hover ? 'rgba(255,250,235,0.7)' : 'rgba(255,246,222,0.35)';
        HB.parchment.plaque(ctx, this.x, iy, this.w - (this.contentHeight > this.h ? 10 : 0), this.itemHeight, { fill, color: state.focused ? p.focus : p.inkSoft, width: state.focused ? 2.5 : 1 });
        if (this.drawItem) this.drawItem(ctx, this.items[i], this.x, iy, this.w - (this.contentHeight > this.h ? 10 : 0), this.itemHeight, state, i);
      }
      // scrollbar
      if (this.contentHeight > this.h) {
        const sh = Math.max(20, this.h * this.h / this.contentHeight);
        const sy = this.y + (this.h - sh) * (this.scrollY / (this.contentHeight - this.h));
        ctx.fillStyle = 'rgba(43,26,14,0.15)'; ctx.fillRect(this.x + this.w - 6, this.y, 4, this.h);
        ctx.fillStyle = p.inkSoft; ctx.fillRect(this.x + this.w - 6, sy, 4, sh);
      }
      ctx.restore();
    }
    tooltipText() {
      if (this.hoverIndex >= 0 && this.itemTooltip) return this.itemTooltip(this.items[this.hoverIndex]);
      return this.tooltip;
    }
  }

  /** horizontal meter with label */
  class Meter extends Widget {
    constructor(o) { super(Object.assign({ focusable: false, h: 18, label: '', value: () => 0, max: () => 1, color: '#3f6d3a', showText: true, preview: null }, o)); }
    draw(ctx) {
      const p = P();
      const v = this.value(), m = Math.max(1e-6, this.max());
      ctx.save();
      HB.parchment.plaque(ctx, this.x, this.y, this.w, this.h, { fill: 'rgba(60,40,20,0.25)', color: p.ink, width: 1.2, radius: 2 });
      const fw = (this.w - 4) * HB.clamp(v / m, 0, 1);
      ctx.fillStyle = this.color; ctx.fillRect(this.x + 2, this.y + 2, fw, this.h - 4);
      if (this.preview) {
        const pv = this.preview();
        if (pv !== null && pv !== undefined) {
          const pw = (this.w - 4) * HB.clamp(pv / m, 0, 1);
          ctx.fillStyle = pv < v ? 'rgba(140,30,20,0.6)' : 'rgba(255,255,255,0.5)';
          ctx.fillRect(this.x + 2 + Math.min(fw, pw), this.y + 2, Math.abs(pw - fw), this.h - 4);
        }
      }
      if (this.showText) HB.text.draw(ctx, `${this.label}${this.label ? ' ' : ''}${Math.round(v)}/${Math.round(m)}`, this.x + this.w / 2, this.y + this.h - 4, { size: 12, align: 'center', family: 'sc', color: p.parchmentLight, shadow: 'rgba(0,0,0,0.6)' });
      ctx.restore();
    }
  }

  /** Custom-draw widget: draw(ctx, w, ui) provided in options, optional onClick with local coords */
  class Custom extends Widget {
    constructor(o) { super(Object.assign({ focusable: false, render: null }, o)); }
    draw(ctx, ui) { if (this.render) this.render(ctx, this, ui); }
  }

  class UI {
    constructor() {
      this.widgets = []; this.focus = null; this.textFocus = null; this.hoverWidget = null; this.hoverTime = 0;
      this.flashWidget = null; this.flashT = 0; this.pointerActive = false; this.enabled = true;
      this.onCancel = null; this.consumedPointer = false; this.tooltipDelay = 0.35;
    }
    add(w) { this.widgets.push(w); return w; }
    remove(w) { const i = this.widgets.indexOf(w); if (i >= 0) this.widgets.splice(i, 1); if (this.focus === w) this.focus = null; }
    clear() { this.widgets.length = 0; this.focus = null; this.textFocus = null; this.hoverWidget = null; }
    setFocus(w) { if (this.focus) this.focus.focused = false; this.focus = w; if (w) w.focused = true; }
    focusFirst() { const f = this.widgets.find(w => w.visible && w.focusable && !w.disabled); if (f) this.setFocus(f); }
    flash(w) { this.flashWidget = w; this.flashT = 0.6; }
    widgetAt(x, y) { for (let i = this.widgets.length - 1; i >= 0; i--) { const w = this.widgets[i]; if (w.visible && w.contains(x, y)) return w; } return null; }
    /** spatial navigation */
    moveFocus(dir) {
      const cands = this.widgets.filter(w => w.visible && w.focusable && !w.disabled);
      if (!cands.length) return;
      if (!this.focus || !cands.includes(this.focus)) { this.setFocus(cands[0]); return; }
      const f = this.focus;
      if (f.navigate && f.navigate(dir)) return;
      const fx = f.x + f.w / 2, fy = f.y + f.h / 2;
      let best = null, bestScore = Infinity;
      for (const w of cands) {
        if (w === f) continue;
        const wx = w.x + w.w / 2, wy = w.y + w.h / 2;
        const dx = wx - fx, dy = wy - fy;
        let primary, secondary;
        if (dir === 'up') { primary = -dy; secondary = Math.abs(dx); if (f.y <= w.y + w.h - 1) continue; }
        else if (dir === 'down') { primary = dy; secondary = Math.abs(dx); if (f.y + f.h - 1 >= w.y) continue; }
        else if (dir === 'left') { primary = -dx; secondary = Math.abs(dy); if (f.x <= w.x + w.w - 1) continue; }
        else { primary = dx; secondary = Math.abs(dy); if (f.x + f.w - 1 >= w.x) continue; }
        if (primary <= 0) continue;
        const score = primary + secondary * 2.2;
        if (score < bestScore) { bestScore = score; best = w; }
      }
      if (best) { this.setFocus(best); if (best.scroll) best.scroll(); }
    }
    update(dt) {
      this.consumedPointer = false;
      if (!this.enabled) return;
      const inp = HB.input, ptr = inp.pointer;
      for (const w of this.widgets) w.update(dt);
      if (this.flashT > 0) this.flashT -= dt;
      // text field capture
      inp.textCapture = !!this.textFocus;
      if (this.textFocus) {
        this.textFocus.handleText(this);
        if (ptr.pressed && !this.textFocus.contains(ptr.x, ptr.y)) this.textFocus = null;
      }
      // pointer
      const hw = ptr.inside || ptr.isTouch ? this.widgetAt(ptr.x, ptr.y) : null;
      if (hw !== this.hoverWidget) { if (this.hoverWidget) this.hoverWidget.hover = false; this.hoverWidget = hw; this.hoverTime = 0; if (hw) hw.hover = true; }
      else this.hoverTime += dt;
      if (hw && ptr.moved && inp.usingPointer() && hw.focusable && !hw.disabled) this.setFocus(hw);
      if (hw && ptr.wheel && hw.scrollY !== undefined) { hw.scrollY += ptr.wheel * 40; hw.clampScroll(); }
      if (ptr.released && hw && !ptr.dragging && HB.dist(ptr.x, ptr.y, ptr.clickX, ptr.clickY) < 10) {
        this.pointerActive = true; hw.activate(this); this.pointerActive = false; this.consumedPointer = true;
      }
      if (ptr.pressed && hw) this.consumedPointer = true;
      // keyboard / gamepad
      if (!this.textFocus) {
        for (const d of ['up', 'down', 'left', 'right']) if (inp.nav(d)) { this.moveFocus(d); }
        if (inp.pressed('confirm') && this.focus && this.focus.visible) { this.focus.activate(this); }
        for (const w of this.widgets) {
          if (!w.visible || w.disabled || !w.hotkey) continue;
          const hk = Array.isArray(w.hotkey) ? w.hotkey : [w.hotkey];
          for (const h of hk) if ((HB.input.ACTIONS[h] && inp.pressed(h)) || inp.keyPressed(h)) { w.activate(this); break; }
        }
        if (inp.pressed('cancel') && this.onCancel) this.onCancel();
      }
    }
    draw(ctx) {
      for (const w of this.widgets) if (w.visible) w.draw(ctx, this);
      // flash on disabled activation
      if (this.flashWidget && this.flashT > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, this.flashT * 2); ctx.strokeStyle = HB.palette.bad; ctx.lineWidth = 3;
        HB.parchment.roundRect(ctx, this.flashWidget.x - 2, this.flashWidget.y - 2, this.flashWidget.w + 4, this.flashWidget.h + 4, 4); ctx.stroke(); ctx.restore();
      }
      // tooltip
      let tipW = null;
      if (this.hoverWidget && this.hoverTime > this.tooltipDelay && HB.input.usingPointer()) tipW = this.hoverWidget;
      else if (this.focus && !HB.input.usingPointer()) tipW = this.focus;
      if (tipW) {
        const t = tipW.tooltipText && tipW.tooltipText();
        if (t) UI.drawTooltip(ctx, t, tipW);
      }
    }
    static drawTooltip(ctx, text, w, anchor) {
      const ptr = HB.input.pointer;
      const size = 14, maxW = 300;
      const lines = HB.text.wrap(ctx, text, maxW - 20, size);
      const tw = Math.min(maxW, Math.max(...lines.map(l => HB.text.width(l, size))) + 20);
      const th = lines.length * size * 1.3 + 14;
      let x = anchor ? anchor.x : HB.input.usingPointer() ? ptr.x + 14 : w.x + w.w / 2 - tw / 2;
      let y = anchor ? anchor.y : HB.input.usingPointer() ? ptr.y + 18 : w.y + w.h + 8;
      x = HB.clamp(x, 6, HB.W - tw - 6); y = HB.clamp(y, 6, HB.H - th - 6);
      ctx.save();
      ctx.fillStyle = 'rgba(20,10,5,0.4)'; HB.parchment.roundRect(ctx, x + 3, y + 4, tw, th, 3); ctx.fill();
      HB.parchment.roundRect(ctx, x, y, tw, th, 3); ctx.fillStyle = HB.palette.parchmentLight; ctx.fill();
      ctx.strokeStyle = HB.palette.ink; ctx.lineWidth = 1.2; ctx.stroke();
      let yy = y + 8 + size;
      for (const l of lines) { HB.text.draw(ctx, l, x + 10, yy, { size, color: HB.palette.ink }); yy += size * 1.3; }
      ctx.restore();
    }
  }

  /** Modal dialog scene: title, text, buttons [{label, onClick, primary}] */
  class Modal {
    constructor(o) {
      this.opts = Object.assign({ title: '', text: '', buttons: [{ label: 'Continue' }], width: 520, draw: null, closeOnCancel: true, dim: 0.45 }, o);
      this.opaque = false; this.ui = new UI(); this.t = 0;
      const w = this.opts.width;
      this.textH = 0;
      this.x = (HB.W - w) / 2; this.w = w;
    }
    enter() {
      const o = this.opts;
      const ctx = HB.app.ctx;
      this.textH = o.text ? HB.text.paragraphHeight(ctx, o.text, this.w - 60, { size: 17 }) : 0;
      const extra = o.extraHeight || 0;
      const btnRows = Math.ceil(o.buttons.length / Math.min(o.buttons.length, 3));
      this.h = 70 + this.textH + extra + btnRows * 46 + 30;
      this.y = (HB.H - this.h) / 2;
      const perRow = Math.min(o.buttons.length, 3);
      const bw = Math.min(200, (this.w - 60 - (perRow - 1) * 12) / perRow);
      o.buttons.forEach((b, i) => {
        const row = Math.floor(i / perRow), col = i % perRow;
        const rowCount = Math.min(perRow, o.buttons.length - row * perRow);
        const rowW = rowCount * bw + (rowCount - 1) * 12;
        const bx = this.x + (this.w - rowW) / 2 + col * (bw + 12);
        const by = this.y + this.h - 30 - (btnRows - row) * 46 + 8;
        this.ui.add(new Button({ x: bx, y: by, w: bw, h: 38, label: b.label, primary: !!b.primary, disabled: !!b.disabled, disabledReason: b.disabledReason || '', tooltip: b.tooltip || '', hotkeyLabel: b.hotkeyLabel || '', hotkey: b.hotkey || null,
          onClick: () => { HB.scenes.pop(this); if (b.onClick) b.onClick(); } }));
      });
      this.ui.focusFirst();
      if (o.closeOnCancel) this.ui.onCancel = () => { HB.scenes.pop(this); const cb = o.buttons.find(b => b.cancel) || null; if (cb && cb.onClick) cb.onClick(); else if (o.onCancel) o.onCancel(); };
    }
    update(dt) { this.t += dt; this.ui.update(dt); }
    draw(ctx) {
      ctx.save(); ctx.fillStyle = `rgba(15,8,4,${this.opts.dim})`; ctx.fillRect(0, 0, HB.W, HB.H); ctx.restore();
      const k = HB.ease.outBack(Math.min(1, this.t * 4));
      ctx.save(); ctx.translate(HB.W / 2, HB.H / 2); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-HB.W / 2, -HB.H / 2);
      HB.parchment.panel(ctx, this.x, this.y, this.w, this.h, { title: this.opts.title, tone: 'light' });
      let y = this.y + 48;
      if (this.opts.text) { HB.text.paragraph(ctx, this.opts.text, this.x + 30, y, this.w - 60, { size: 17 }); y += this.textH + 8; }
      if (this.opts.draw) this.opts.draw(ctx, this.x + 30, y, this.w - 60, this.opts.extraHeight || 0, this);
      this.ui.draw(ctx);
      ctx.restore();
    }
  }

  HB.ui = { Widget, Button, Label, Toggle, TextField, ListBox, Meter, Custom, UI, Modal };
  HB.modal = (opts) => { const m = new Modal(opts); HB.scenes.push(m); return m; };
  HB.confirm = (title, text, onYes, opts = {}) => HB.modal({ title, text, buttons: [{ label: opts.yes || 'Yes', primary: true, onClick: onYes }, { label: opts.no || 'No', cancel: true }] });
  HB.notice = (title, text, onClose) => HB.modal({ title, text, buttons: [{ label: 'Continue', primary: true, onClick: onClose }] });
})();
