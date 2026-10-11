/* Hatching intro: explains where to go, what to avoid, how to get home. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class IntroScene {
    constructor(state) { this.state = state; this.opaque = false; this.ui = new HB.ui.UI(); this.page = 0; this.t = 0; }
    enter() {
      const st = this.state, W = st.world, S = W.subregions[W.home.subId], R = W.regions[0];
      const near = HB.world.locationsNear(W, W.home.x, W.home.y, 12, L => L.knowledge.seen && L.type !== 'lair');
      const camp = near.find(n => n.L.type === 'camp'), farm = near.find(n => n.L.type === 'farm' || n.L.type === 'village'), castle = HB.world.nearest(W, W.home.x, W.home.y, L => L.type === 'castle');
      const threat = W.locations.find(L => L.threat && L.knowledge.seen);
      const story = HB.situations ? HB.situations.hint(st) : '';
      this.pages = [
        { title: 'You hatch', text: `The egg cracks in a cave in ${S.name}, in ${R.name}. Nobody knows you exist. You are small, hungry and alone, and there are roads below with wagons on them.\n\nYour power will come from what you hoard: gold toughens your scales, gems feed your fire, books sharpen your eye, crowns bend knees. Treasure stored in this cave counts; treasure in your claws does not until you bring it home.` },
        { title: 'Where to go', text: `${farm ? `${farm.L.name}, ${Math.round(farm.d)} leagues off, is ${farm.L.type === 'farm' ? 'a farm: animals to eat and a purse on the fence.' : 'a village: savings in the houses, grain in the granary.'}` : 'Farms and villages are easy prey.'} ${camp ? `${camp.L.name} is a camp: at night most of them sleep, and sleepers can be bitten one at a time.` : 'Camps sleep at night.'} Caravans crawl along the dashed roads: the strongbox on the first wagon is yours for a swoop.\n\n${castle ? `${castle.L.name} is a castle. A hatchling does not fight a castle; a hatchling steals the goblet from the parapet and leaves before the archers organise.` : 'Castles are not for hatchlings.'}` },
        { title: 'How to explore', text: `The world beyond your hill is blank parchment under cloud. Tap or click anywhere on the map to fly there: the land inks itself in along your path. Places marked with a dotted ? are rumours — fly to them to see what they really are.\n\nEvery flight costs stamina. The outer dotted ring is how far your stamina carries you; the inner ring is how far you can go and still fly home. Out of stamina in the wild? Rest there for two days. As you grow, you see farther and the storm walls around this land will let you through.` },
        { title: 'Your first goal', text: `Become a young dragon. You need a hoard strength of ${HB.fmt.int(HB.TIERS[1].energy)} stored in your cave and an age of ${HB.TIERS[1].minAge} years; the panel under your name shows both, and the next step. Growing gives you longer flights, bigger hauls, a hotter breath and new lands beyond the storms.\n\n${story ? `Something is already happening in your valley: ${story} Each way of dealing with it opens a different road. ` : ''}Open Aims (G) to see what you could do and what each choice would bring. After every encounter you will see what changed.` },
        { title: 'How to live', text: `In a raid, time slows when an opportunity appears. Grab what is exposed, pass what is guarded, withdraw before the alarm brings archers. The alarm bar tells the story.\n\nAt home: spend gold on the cave, hire workers, ransom captives — and sleep. Sleep is how you grow, and how the world catches up with you. Make the door strong before you lie down: thieves love a sleeping dragon.` },
      ];
      this.build();
    }
    build() {
      this.ui.clear();
      const last = this.page === this.pages.length - 1;
      this.ui.add(new HB.ui.Button({ x: HB.W / 2 + 20, y: HB.H / 2 + 170, w: 200, h: 42, label: last ? 'Take wing' : 'Next', primary: true, onClick: () => { if (last) { HB.scenes.pop(this); if (HB.save) HB.save.autosave(this.state); } else { this.page++; this.build(); } } }));
      this.ui.add(new HB.ui.Button({ x: HB.W / 2 - 220, y: HB.H / 2 + 170, w: 200, h: 42, label: this.page ? 'Back' : 'Skip', onClick: () => { if (this.page) { this.page--; this.build(); } else { HB.scenes.pop(this); if (HB.save) HB.save.autosave(this.state); } } }));
      this.ui.onCancel = () => { HB.scenes.pop(this); if (HB.save) HB.save.autosave(this.state); };
      this.ui.focusFirst();
    }
    update(dt) { this.t += dt; this.ui.update(dt); }
    draw(ctx) {
      ctx.fillStyle = 'rgba(15,8,4,0.45)'; ctx.fillRect(0, 0, HB.W, HB.H);
      const p = this.pages[this.page];
      const w = 760, h = 480, x = (HB.W - w) / 2, y = (HB.H - h) / 2;
      HB.parchment.panel(ctx, x, y, w, h, { title: p.title, tone: 'light' });
      HB.dragonArt.draw(ctx, HB.dragonArt.specOf(this.state), this.page === 0 ? 'idle' : 'fly', Math.floor(this.t * 6) % 4, x + w - 90, y + 80, 2.5, -1);
      HB.text.paragraph(ctx, p.text, x + 40, y + 60, w - 200, { size: 17, lineHeight: 24 });
      HB.text.draw(ctx, `${this.page + 1} / ${this.pages.length}`, x + w / 2, y + h - 20, { size: 12, align: 'center', color: HB.palette.inkSoft });
      this.ui.draw(ctx);
    }
  }
  HB.IntroScene = IntroScene;
})();
