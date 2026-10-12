/* Inspect every loaded map illustration and its states without creating or saving a campaign. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  class ArtCatalogScene {
    constructor() { this.opaque = true; this.ui = new HB.ui.UI(); this.page = 0; this.group = 'Places'; this.rev = -1; }
    refresh() {
      const names = [...HB.mapAssets.entries.keys(), ...((HB.mapInk.enabled() && HB.mapInk.nativeIds) || [])];
      this.ids = [...new Set(names)].filter(id => this.group === 'Places' ? id.startsWith('map.place.') : this.group === 'Homes' ? id.startsWith('map.home.') : this.group === 'Terrain' ? id.startsWith('map.terrain.') : !id.startsWith('map.place.') && !id.startsWith('map.home.') && !id.startsWith('map.terrain.'));
      this.pages = Math.max(1, Math.ceil(this.ids.length / 12)); this.page = HB.clamp(this.page, 0, this.pages - 1); this.ui.clear();
      ['Places', 'Homes', 'Terrain', 'Travelers & signs'].forEach((name, i) => this.ui.add(new HB.ui.Button({x: 24+i*195,y:66,w:185,h:40,label:name,onClick:()=>{this.group=name;this.page=0;this.refresh();}})));
      const button = (x, label, fn) => this.ui.add(new HB.ui.Button({x,y:659,w:150,h:40,label,onClick:fn}));
      button(24,'Previous',()=>{this.page=(this.page+this.pages-1)%this.pages;});
      button(184,'Next',()=>{this.page=(this.page+1)%this.pages;});
      button(1106,'Back',()=>HB.scenes.replace(new HB.TitleScene()));
    }
    update(dt) { if(this.rev!==HB.mapAssets.revision){this.rev=HB.mapAssets.revision;this.refresh();} this.ui.update(dt); }
    draw(g) {
      HB.parchment.fill(g,0,0,HB.W,HB.H);
      HB.text.draw(g,'Illuminated map — art catalog',24,42,{size:27,family:'sc'});
      HB.text.draw(g,'All symbols and damage states • enlarged for inspection • nothing is saved',1238,39,{size:14,align:'right'});
      for(let n=0;n<12;n++) {
        const id=this.ids && this.ids[this.page*12+n]; if(!id)continue;
        const x=24+(n%4)*312,y=123+Math.floor(n/4)*172;
        HB.parchment.panel(g,x,y,296,158,{shadow:false,stains:false,vignette:0.02});
        const fam=HB.MAP_SPEC.families[id]||Object.entries(HB.MAP_SPEC.families).filter(([k])=>id.startsWith(k+'.')).sort((a,b)=>b[0].length-a[0].length)[0]?.[1];
        const r=HB.mapAssets.resolve([id],id), sz=r?Math.min(2.3,220/r.v.logicalSize[0],92/r.v.logicalSize[1]):id==='map.decoration.compass'?1.05:1.9;
        const cx=x+148,cy=y+110,s=(fam?.ref||10)*sz;
        HB.mapart.setup(g);
        if(id.startsWith('map.place.')) {
          const parts=id.split('.'),type=parts[2],state=['burned','ruin'].includes(parts.at(-1))?parts.at(-1):'normal';
          HB.mapart.settlement(g,{id,type,state,camp:parts[3],lieutenant:parts[3],tier:parts.includes('great')?4:1,flags:{}},cx,cy,s,new HB.RNG(id),{flagColor:'#667e92'});
        } else HB.mapAssets.draw(g,[id],cx,id.startsWith('map.home.')?cy:fam?.anchor?.includes('centre')&&fam.layer!=='terrain'?y+82:cy,s,{key:id,tint:'#667e92'});
        const label=id.replace(/^map\.[^.]+\./,'').replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('.',' · ');
        HB.text.draw(g,label,x+148,y+144,{size:16,align:'center',family:'sc'});
      }
      HB.text.draw(g,`${this.group} — page ${this.page+1} / ${this.pages||1}`,640,685,{size:17,align:'center'});this.ui.draw(g);
    }
  }
  HB.ArtCatalogScene=ArtCatalogScene;
})();
