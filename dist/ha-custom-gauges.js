/* Custom Gauges Pack - bundle HACS (4 jauges + option card_transparent) - tolere le double chargement */

/* ===== half-arc-gauge ===== */
(function(){
  // Garde anti-doublon : si une carte est deja declaree (anciennes ressources
  // encore actives), on ignore la 2e declaration au lieu de planter.
  const __ce = window.customElements;
  const customElements = {
    define: (n, c, o) => { if (!__ce.get(n)) __ce.define(n, c, o); },
    get: (n) => __ce.get(n),
    whenDefined: (n) => __ce.whenDefined(n)
  };
  const __cc = window.customCards = window.customCards || [];
  const __push = __cc.push.bind(__cc);

class TopArcGauge extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("Merci de définir une entité (entity)");
    this.config = config;
  }
  set hass(hass) {
    this._hass = hass;
    this._render();
  }
  getCardSize() { return 2; }
  static getConfigElement() {
    return document.createElement('top-arc-gauge-editor');
  }
  static getStubConfig() {
    return {
      entity: 'sensor.example_body_battery',
      radius_x: 95,
      radius_y: 60,
      second_arc: { entity: 'sensor.example_steps' },
      bottom_items: [],
    };
  }
  _fmt(stateObj, decimals) {
    if (!stateObj) return '—';
    const v = parseFloat(stateObj.state);
    if (isNaN(v)) return stateObj.state;
    return decimals ? v.toFixed(decimals) : Math.round(v);
  }
  _hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h;
    const num = parseInt(n, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  _lerpColor(c1, c2, t) {
    const a = this._hexToRgb(c1);
    const b = this._hexToRgb(c2);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  _smoothColorFor(value, segments) {
    if (value <= segments[0][0]) return segments[0][1];
    for (let i = 0; i < segments.length - 1; i++) {
      const a = segments[i], b = segments[i + 1];
      if (value >= a[0] && value <= b[0]) {
        const t = (value - a[0]) / (b[0] - a[0]);
        return this._lerpColor(a[1], b[1], t);
      }
    }
    return segments[segments.length - 1][1];
  }
  _gradientArcSvg(toXY, startA, endA, min, max, value, segments, opts) {
    const { strokeWidth, dotR, dotBorderColor, dotBorderWidth, bgPathD, bgWidth, bgOpacity, bgColor } = opts;
    let paths = '';
    if (bgWidth > 0) {
      paths += `<path d="${bgPathD}" fill="none" stroke="${bgColor}" stroke-width="${bgWidth}" stroke-opacity="${bgOpacity}" stroke-linecap="round"/>`;
    }
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const a0 = startA + ((endA - startA) * i) / steps;
      const a1 = startA + ((endA - startA) * (i + 1)) / steps;
      const mid = min + (((a0 + a1) / 2 - startA) / (endA - startA)) * (max - min);
      const col = this._smoothColorFor(mid, segments);
      const [x0, y0] = toXY(a0);
      const [x1, y1] = toXY(a1);
      paths += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${col}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
    }
    let frac = isNaN(value) ? 0 : (value - min) / (max - min);
    frac = Math.max(0, Math.min(1, frac));
    const dotA = startA + frac * (endA - startA);
    const [dx, dy] = toXY(dotA);
    const dotColor = this._smoothColorFor(isNaN(value) ? min : value, segments);
    paths += `<circle cx="${dx}" cy="${dy}" r="${dotR + dotBorderWidth}" fill="${dotBorderColor}"/>`;
    paths += `<circle cx="${dx}" cy="${dy}" r="${dotR}" fill="${dotColor}"/>`;
    return paths;
  }
  _render() {
    if (!this._hass || !this.config) return;
    const cfg = this.config;
    const stateObj = this._hass.states[cfg.entity];
    const value = stateObj ? parseFloat(stateObj.state) : NaN;
    const min = cfg.min ?? 0;
    const max = cfg.max ?? 100;
    const startA = cfg.start_angle ?? -80;
    const endA = cfg.end_angle ?? 80;
    const segments = cfg.segments || [[0, '#f44336'], [30, '#fb8c00'], [50, '#4caf50']];
    const cx = 100, cy = 70;
    const rx = cfg.radius_x ?? 95;
    const ry = cfg.radius_y ?? 60;
    const strokeHalf = 5;
    const toXY = (deg) => {
      const rad = deg * Math.PI / 180;
      return [cx + rx * Math.sin(rad), cy - ry * Math.cos(rad)];
    };
    const [sx, sy] = toXY(startA);
    const [ex, ey] = toXY(endA);
    const color = this._smoothColorFor(isNaN(value) ? min : value, segments);
    const name = cfg.name || (stateObj ? stateObj.attributes.friendly_name : cfg.entity);
    const icon = cfg.icon || 'mdi:gauge';
    const unit = cfg.unit ?? (stateObj ? (stateObj.attributes.unit_of_measurement || '') : '');
    const displayVal = isNaN(value) ? '—' : Math.round(value);
    const bottomItems = cfg.bottom_items || [];
    const arcVbH = Math.ceil(Math.max(sy, ey) + strokeHalf);
    const vbH = Math.ceil(arcVbH + 4);
    const valueFactor = cfg.value_factor ?? 0.62;
    const labelGap = cfg.label_gap ?? 15;
    const valueOffset = cfg.value_offset ?? (arcVbH * valueFactor);
    const labelOffset = cfg.label_offset ?? (valueOffset + labelGap);
    const valueTopPct = (valueOffset / vbH) * 100;
    const labelTopPct = (labelOffset / vbH) * 100;

    const boxMinW = cfg.box_min_width ?? 76;
    const boxPad = cfg.box_padding ?? '5px 14px';
    const boxGap = cfg.box_gap ?? 10;
    const boxIconSizeRaw = cfg.box_icon_size ?? 'clamp(11px,6.5cqw,20px)';
    const boxIconSize = typeof boxIconSizeRaw === 'number' ? `${boxIconSizeRaw}px` : boxIconSizeRaw;
    const boxFontSize = cfg.box_font_size ?? 'clamp(0.65em,6cqw,1.1em)';
    const boxUnitFontSize = cfg.box_unit_font_size ?? 'clamp(0.55em,4.5cqw,0.95em)';
    const boxBorder = cfg.box_border ?? 2;
    const refWidth = 300;
    const boxCqwPref = (boxMinW / refWidth) * 100;
    const boxMinWCss = `clamp(40px, ${boxCqwPref.toFixed(3)}cqw, ${boxMinW}px)`;
    const cardPad = cfg.card_padding ?? '8px 24px 8px';

    const gaugeOpts = {
      strokeWidth: cfg.stroke_width ?? 6,
      dotR: cfg.dot_radius ?? 9,
      dotBorderColor: cfg.dot_border_color ?? 'var(--card-background-color, #1c1c1c)',
      dotBorderWidth: cfg.dot_border_width ?? 3,
      bgPathD: `M ${sx} ${sy} A ${rx} ${ry} 0 0 1 ${ex} ${ey}`,
      bgWidth: cfg.background_width ?? 2,
      bgOpacity: cfg.background_opacity ?? 0.45,
      bgColor: cfg.background_color ?? 'var(--disabled-text-color, #888)',
    };

    const sa2cfg = cfg.second_arc;
    let sa2 = null;
    if (sa2cfg) {
      const r2x = sa2cfg.radius_x ?? 65;
      const r2y = sa2cfg.radius_y ?? 65;
      const st2 = this._hass.states[sa2cfg.entity];
      const v2 = st2 ? parseFloat(st2.state) : NaN;
      const min2 = sa2cfg.min ?? 0;
      const max2 = sa2cfg.max ?? 100;
      const seg2 = sa2cfg.segments || segments;
      const maxAbsAngle = Math.max(Math.abs(startA), Math.abs(endA));
      const cosMax = Math.cos(maxAbsAngle * Math.PI / 180);
      const cy2 = strokeHalf - r2y * cosMax;
      const toXY2 = (deg) => {
        const rad = deg * Math.PI / 180;
        return [cx + r2x * Math.sin(rad), cy2 + r2y * Math.cos(rad)];
      };
      const [sx2, sy2] = toXY2(startA);
      const [ex2, ey2] = toXY2(endA);
      const vbH2 = Math.ceil(cy2 + r2y + strokeHalf);
      const color2 = this._smoothColorFor(isNaN(v2) ? min2 : v2, seg2);
      const name2 = sa2cfg.name || (st2 ? st2.attributes.friendly_name : sa2cfg.entity);
      const icon2 = sa2cfg.icon || 'mdi:gauge';
      const unit2 = sa2cfg.unit ?? (st2 ? (st2.attributes.unit_of_measurement || '') : '');
      const displayVal2 = isNaN(v2) ? '—' : Math.round(v2);
      const labelOffset2 = sa2cfg.label_offset ?? 8;
      const valueOffset2 = sa2cfg.value_offset ?? 24;
      const labelTopPct2 = (labelOffset2 / vbH2) * 100;
      const valueTopPct2 = (valueOffset2 / vbH2) * 100;
      const gaugeOpts2 = {
        strokeWidth: sa2cfg.stroke_width ?? gaugeOpts.strokeWidth,
        dotR: sa2cfg.dot_radius ?? gaugeOpts.dotR,
        dotBorderColor: sa2cfg.dot_border_color ?? gaugeOpts.dotBorderColor,
        dotBorderWidth: sa2cfg.dot_border_width ?? gaugeOpts.dotBorderWidth,
        bgPathD: `M ${sx2} ${sy2} A ${r2x} ${r2y} 0 0 0 ${ex2} ${ey2}`,
        bgWidth: sa2cfg.background_width ?? gaugeOpts.bgWidth,
        bgOpacity: sa2cfg.background_opacity ?? gaugeOpts.bgOpacity,
        bgColor: sa2cfg.background_color ?? gaugeOpts.bgColor,
      };
      sa2 = { toXY2, min2, max2, v2, seg2, vbH2, color2, name2, icon2, unit2, displayVal2, labelTopPct2, valueTopPct2, gaugeOpts2 };
    }

    if (!this.content) {
      this.innerHTML = `<ha-card><div style="text-align:center;padding:${cardPad};overflow:hidden;container-type:inline-size;">
        <div class="arc-wrap" style="position:relative;">
          <svg class="arc-svg" viewBox="0 0 200 ${vbH}" width="100%" style="max-width:280px;display:block;margin:0 auto;overflow:visible;"></svg>
          <div class="val-overlay" style="position:absolute;left:0;right:0;text-align:center;transform:translateY(-50%);">
            <span class="val" style="font-size:clamp(14px,13cqw,40px);font-weight:bold;line-height:1;"></span><span class="unit" style="font-size:clamp(9px,7.5cqw,24px);"></span>
          </div>
          <div class="label-overlay" style="position:absolute;left:0;right:0;text-align:center;transform:translateY(-50%);white-space:nowrap;">
            <ha-icon class="icon" style="--mdc-icon-size:clamp(12px,7cqw,22px);vertical-align:middle;"></ha-icon>
            <span class="name" style="font-size:clamp(9px,6cqw,19px);vertical-align:middle;"></span>
          </div>
        </div>
        <div class="bottom-wrap"></div>
        <div class="arc2-wrap" style="position:relative;margin-top:6px;container-type:inline-size;"></div>
      </div></ha-card>`;
      this.content = {
        svg: this.querySelector('.arc-svg'),
        valOverlay: this.querySelector('.val-overlay'),
        labelOverlay: this.querySelector('.label-overlay'),
        icon: this.querySelector('.icon'),
        val: this.querySelector('.val'),
        unit: this.querySelector('.unit'),
        name: this.querySelector('.name'),
        bottomWrap: this.querySelector('.bottom-wrap'),
        arc2Wrap: this.querySelector('.arc2-wrap'),
      };
    }
    this.content.svg.setAttribute('viewBox', `0 0 200 ${vbH}`);
    this.content.svg.innerHTML = this._gradientArcSvg(toXY, startA, endA, min, max, value, segments, gaugeOpts);
    this.content.valOverlay.style.top = `${valueTopPct}%`;
    this.content.labelOverlay.style.top = `${labelTopPct}%`;
    this.content.icon.setAttribute('icon', icon);
    this.content.icon.style.color = color;
    this.content.val.textContent = displayVal;
    this.content.val.style.color = color;
    this.content.unit.textContent = unit;
    this.content.unit.style.color = color;
    this.content.name.textContent = name;
    this.content.name.style.color = color;

    const box = (item) => {
      if (!item) return '';
      const st = this._hass.states[item.entity];
      const v = this._fmt(st, item.decimals || 0);
      const u = item.unit !== undefined && item.unit !== '' ? item.unit : (st ? (st.attributes.unit_of_measurement || '') : '');
      return `<div style="display:flex;align-items:center;justify-content:center;white-space:nowrap;border:${boxBorder}px solid var(--divider-color, #555);border-radius:12px;padding:${boxPad};box-sizing:border-box;">
        <ha-icon icon="${item.icon || 'mdi:information'}" style="--mdc-icon-size:${boxIconSize};color:${item.color || 'var(--primary-text-color)'};flex-shrink:0;"></ha-icon>
        <span style="font-weight:bold;font-size:${boxFontSize};margin-left:4px;">${v}</span><span style="font-size:${boxUnitFontSize};">${u}</span>
      </div>`;
    };
    this.content.bottomWrap.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2, minmax(${boxMinWCss}, max-content));justify-content:center;gap:${boxGap}px;margin-top:5px;">${bottomItems.map(box).join('')}</div>`;

    if (sa2) {
      const arcSvg = this._gradientArcSvg(sa2.toXY2, startA, endA, sa2.min2, sa2.max2, sa2.v2, sa2.seg2, sa2.gaugeOpts2);
      this.content.arc2Wrap.innerHTML = `<svg viewBox="0 0 200 ${sa2.vbH2}" width="100%" style="max-width:280px;display:block;margin:0 auto;overflow:visible;">${arcSvg}</svg>
        <div style="position:absolute;left:0;right:0;top:${sa2.labelTopPct2}%;text-align:center;transform:translateY(-50%);white-space:nowrap;">
          <ha-icon icon="${sa2.icon2}" style="--mdc-icon-size:clamp(12px,7cqw,22px);color:${sa2.color2};vertical-align:middle;"></ha-icon>
          <span style="font-size:clamp(9px,6cqw,19px);color:${sa2.color2};vertical-align:middle;">${sa2.name2}</span>
        </div>
        <div style="position:absolute;left:0;right:0;top:${sa2.valueTopPct2}%;text-align:center;transform:translateY(-50%);">
          <span style="font-size:clamp(13px,12cqw,36px);font-weight:bold;line-height:1;color:${sa2.color2};">${sa2.displayVal2}</span><span style="font-size:clamp(9px,7cqw,22px);color:${sa2.color2};"> ${sa2.unit2}</span>
        </div>`;
    } else if (this.content.arc2Wrap) {
      this.content.arc2Wrap.innerHTML = '';
    }
  }
}
customElements.define('top-arc-gauge', TopArcGauge);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'top-arc-gauge', name: 'Top Arc Gauge', description: 'Jauge en arc avec dégradé, apparence commune partagée entre les deux arcs, éditeur visuel intégré' });

// ---- Visual editor ----
class TopArcGaugeEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._build();
  }
  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll('ha-entity-picker').forEach((el) => { el.hass = hass; });
  }
  _emit() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }
  _cloneAlongPath(path) {
    const cfg = { ...this._config };
    let obj = cfg;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      obj[k] = { ...(obj[k] || {}) };
      obj = obj[k];
    }
    return [cfg, obj];
  }
  _setPath(path, value) {
    const [cfg, obj] = this._cloneAlongPath(path);
    obj[path[path.length - 1]] = value;
    this._config = cfg;
    this._emit();
  }
  _setCommon(key, value) {
    const cfg = { ...this._config };
    cfg[key] = value;
    cfg.second_arc = { ...(cfg.second_arc || {}), [key]: value };
    this._config = cfg;
    this._emit();
  }
  _setBottomItemEntity(idx, entity) {
    const cfg = { ...this._config };
    const items = (cfg.bottom_items || []).map((it) => ({ ...it }));
    while (items.length <= idx) items.push({});
    items[idx] = { ...items[idx], entity };
    cfg.bottom_items = items;
    this._config = cfg;
    this._emit();
  }
  _setSegmentField(path, idx, fieldIdx, value) {
    const [cfg, obj] = this._cloneAlongPath(path);
    const key = path[path.length - 1];
    const arr = (obj[key] || []).map((s) => [...s]);
    if (!arr[idx]) arr[idx] = [0, '#ffffff'];
    arr[idx][fieldIdx] = value;
    obj[key] = arr;
    this._config = cfg;
    this._emit();
  }
  _addSegment(path) {
    const [cfg, obj] = this._cloneAlongPath(path);
    const key = path[path.length - 1];
    obj[key] = [...(obj[key] || []), [0, '#ffffff']];
    this._config = cfg;
    this._emit();
  }
  _removeSegment(path, idx) {
    const [cfg, obj] = this._cloneAlongPath(path);
    const key = path[path.length - 1];
    obj[key] = (obj[key] || []).filter((_, i) => i !== idx);
    this._config = cfg;
    this._emit();
  }
  _row(labelText, controlEl) {
    const row = document.createElement('div');
    row.style.cssText = 'margin:8px 0;';
    const label = document.createElement('div');
    label.textContent = labelText;
    label.style.cssText = 'font-size:0.85em;color:var(--secondary-text-color);margin-bottom:3px;';
    row.appendChild(label);
    row.appendChild(controlEl);
    return row;
  }
  _numberInput(path, value, step) {
    const input = document.createElement('input');
    input.type = 'number';
    if (step) input.step = step;
    input.value = value ?? '';
    input.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:6px 8px;';
    input.addEventListener('change', () => {
      const v = input.value === '' ? undefined : parseFloat(input.value);
      this._setPath(path, v);
    });
    return input;
  }
  _commonNumberInput(key, value, step) {
    const input = document.createElement('input');
    input.type = 'number';
    if (step) input.step = step;
    input.value = value ?? '';
    input.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:6px 8px;';
    input.addEventListener('change', () => {
      const v = input.value === '' ? undefined : parseFloat(input.value);
      this._setCommon(key, v);
    });
    return input;
  }
  _entityPicker(path, value, onChange) {
    const picker = document.createElement('ha-entity-picker');
    picker.hass = this._hass;
    picker.value = value || '';
    picker.style.width = '100%';
    picker.addEventListener('value-changed', (ev) => {
      ev.stopPropagation();
      if (onChange) onChange(ev.detail.value);
      else this._setPath(path, ev.detail.value);
    });
    return picker;
  }
  _section(title) {
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'font-weight:600;margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--divider-color);';
    return h;
  }
  _twoCols(a, b) {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
    grid.appendChild(a);
    grid.appendChild(b);
    return grid;
  }
  _segmentsEditor(path, segments) {
    const container = document.createElement('div');
    (segments || []).forEach((seg, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;';
      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.value = seg[0];
      numInput.style.cssText = 'width:90px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:5px 6px;';
      numInput.addEventListener('change', () => this._setSegmentField(path, idx, 0, parseFloat(numInput.value)));
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = /^#[0-9a-fA-F]{6}$/.test(seg[1]) ? seg[1] : '#ffffff';
      colorInput.style.cssText = 'width:48px;height:32px;border:1px solid var(--divider-color);border-radius:6px;background:none;padding:0;cursor:pointer;';
      colorInput.addEventListener('change', () => this._setSegmentField(path, idx, 1, colorInput.value));
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.title = 'Retirer ce palier';
      removeBtn.style.cssText = 'background:none;border:none;color:var(--secondary-text-color);font-size:1.3em;line-height:1;cursor:pointer;padding:0 6px;';
      removeBtn.addEventListener('click', () => this._removeSegment(path, idx));
      row.appendChild(numInput);
      row.appendChild(colorInput);
      row.appendChild(removeBtn);
      container.appendChild(row);
    });
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Ajouter un palier';
    addBtn.style.cssText = 'margin-top:6px;background:none;border:1px dashed var(--divider-color);color:var(--primary-text-color);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.85em;';
    addBtn.addEventListener('click', () => this._addSegment(path));
    container.appendChild(addBtn);
    return container;
  }
  _build() {
    const cfg = this._config || {};
    const sa = cfg.second_arc || {};
    const items = cfg.bottom_items || [];
    this.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:8px 4px 16px;';

    wrap.appendChild(this._section('Jauge du haut'));
    wrap.appendChild(this._row('Entité', this._entityPicker(['entity'], cfg.entity)));
    wrap.appendChild(this._twoCols(
      this._row('Minimum', this._numberInput(['min'], cfg.min ?? 0)),
      this._row('Maximum', this._numberInput(['max'], cfg.max ?? 100)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Rayon horizontal', this._numberInput(['radius_x'], cfg.radius_x ?? 95)),
      this._row('Rayon vertical', this._numberInput(['radius_y'], cfg.radius_y ?? 60)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Position valeur', this._numberInput(['value_offset'], cfg.value_offset)),
      this._row('Position libellé', this._numberInput(['label_offset'], cfg.label_offset)),
    ));
    wrap.appendChild(this._row('Paliers de couleur (valeur → couleur)', this._segmentsEditor(
      ['segments'], cfg.segments || [[0, '#f44336'], [30, '#fb8c00'], [50, '#4caf50']]
    )));

    wrap.appendChild(this._section('Jauge du bas (second_arc)'));
    wrap.appendChild(this._row('Entité', this._entityPicker(null, sa.entity, (v) => this._setPath(['second_arc', 'entity'], v))));
    wrap.appendChild(this._twoCols(
      this._row('Minimum', this._numberInput(['second_arc', 'min'], sa.min ?? 0)),
      this._row('Maximum', this._numberInput(['second_arc', 'max'], sa.max ?? 100)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Rayon horizontal', this._numberInput(['second_arc', 'radius_x'], sa.radius_x ?? 65)),
      this._row('Rayon vertical', this._numberInput(['second_arc', 'radius_y'], sa.radius_y ?? 65)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Position valeur', this._numberInput(['second_arc', 'value_offset'], sa.value_offset ?? 24)),
      this._row('Position libellé', this._numberInput(['second_arc', 'label_offset'], sa.label_offset ?? 8)),
    ));
    wrap.appendChild(this._row('Paliers de couleur (valeur → couleur)', this._segmentsEditor(
      ['second_arc', 'segments'], sa.segments || [[0, '#f44336'], [7500, '#fb8c00'], [10000, '#4caf50']]
    )));

    wrap.appendChild(this._section('Apparence commune (les deux jauges)'));
    wrap.appendChild(this._twoCols(
      this._row('Épaisseur du trait', this._commonNumberInput('stroke_width', cfg.stroke_width ?? 6)),
      this._row('Taille du point', this._commonNumberInput('dot_radius', cfg.dot_radius ?? 9)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Épaisseur du fond', this._commonNumberInput('background_width', cfg.background_width ?? 2)),
      this._row('Opacité du fond (0 à 1)', this._commonNumberInput('background_opacity', cfg.background_opacity ?? 0.45, 0.05)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Largeur mini des rectangles (desktop)', this._numberInput(['box_min_width'], cfg.box_min_width ?? 76)),
      this._row('Espace entre rectangles', this._numberInput(['box_gap'], cfg.box_gap ?? 10)),
    ));

    wrap.appendChild(this._section('Les 4 mini-valeurs'));
    for (let i = 0; i < 4; i++) {
      wrap.appendChild(this._row(`Case ${i + 1}`, this._entityPicker(null, items[i] && items[i].entity, (v) => this._setBottomItemEntity(i, v))));
    }

    this.appendChild(wrap);
  }
}
customElements.define('top-arc-gauge-editor', TopArcGaugeEditor);

// ==========================================================================
// New card: segmented "blocks" gauge, no moving dot — inspired by the
// Garmin watch face's stacked-block ring that fills/empties over the day.
// Blocks grow thicker (taller) as they approach the "good" (green) end and
// stay thin near the "bad" (red) end.
// ==========================================================================
class TopArcGaugeBlocks extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("Merci de définir une entité (entity)");
    this.config = config;
  }
  set hass(hass) {
    this._hass = hass;
    this._render();
  }
  getCardSize() { return 2; }
  _fmt(stateObj, decimals) {
    if (!stateObj) return '—';
    const v = parseFloat(stateObj.state);
    if (isNaN(v)) return stateObj.state;
    return decimals ? v.toFixed(decimals) : Math.round(v);
  }
  _hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const num = parseInt(n, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  _lerpColor(c1, c2, t) {
    const a = this._hexToRgb(c1);
    const b = this._hexToRgb(c2);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  _smoothColorFor(value, segments) {
    if (value <= segments[0][0]) return segments[0][1];
    for (let i = 0; i < segments.length - 1; i++) {
      const a = segments[i], b = segments[i + 1];
      if (value >= a[0] && value <= b[0]) {
        const t = (value - a[0]) / (b[0] - a[0]);
        return this._lerpColor(a[1], b[1], t);
      }
    }
    return segments[segments.length - 1][1];
  }
  _blocksArcSvg(toXY, startA, endA, min, max, value, segments, opts) {
    const { blockCount, blockGapDeg, emptyColor, emptyOpacity, minThickness, maxThickness } = opts;
    let frac = isNaN(value) ? 0 : (value - min) / (max - min);
    frac = Math.max(0, Math.min(1, frac));
    const filledCount = Math.round(frac * blockCount);
    const totalSpan = endA - startA;
    const blockSpan = totalSpan / blockCount;
    let paths = '';
    for (let i = 0; i < blockCount; i++) {
      const a0 = startA + i * blockSpan + blockGapDeg / 2;
      const a1 = startA + (i + 1) * blockSpan - blockGapDeg / 2;
      const [x0, y0] = toXY(a0);
      const [x1, y1] = toXY(a1);
      const t = i / Math.max(1, blockCount - 1);
      const thickness = minThickness + t * (maxThickness - minThickness);
      let color, opacity;
      if (i < filledCount) {
        const mid = min + (((a0 + a1) / 2 - startA) / totalSpan) * (max - min);
        color = this._smoothColorFor(mid, segments);
        opacity = 1;
      } else {
        color = emptyColor;
        opacity = emptyOpacity;
      }
      paths += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${thickness}" stroke-linecap="butt"/>`;
    }
    return paths;
  }
  _render() {
    if (!this._hass || !this.config) return;
    const cfg = this.config;
    const stateObj = this._hass.states[cfg.entity];
    const value = stateObj ? parseFloat(stateObj.state) : NaN;
    const min = cfg.min ?? 0;
    const max = cfg.max ?? 100;
    const startA = cfg.start_angle ?? -80;
    const endA = cfg.end_angle ?? 80;
    const segments = cfg.segments || [[0, '#f44336'], [30, '#fb8c00'], [50, '#4caf50']];
    const cx = 100, cy = 70;
    const rx = cfg.radius_x ?? 80;
    const ry = cfg.radius_y ?? 70;
    const strokeHalf = 5;
    const toXY = (deg) => {
      const rad = deg * Math.PI / 180;
      return [cx + rx * Math.sin(rad), cy - ry * Math.cos(rad)];
    };
    const [sx, sy] = toXY(startA);
    const [ex, ey] = toXY(endA);
    const color = this._smoothColorFor(isNaN(value) ? min : value, segments);
    const name = cfg.name || (stateObj ? stateObj.attributes.friendly_name : cfg.entity);
    const icon = cfg.icon || 'mdi:gauge';
    const unit = cfg.unit ?? (stateObj ? (stateObj.attributes.unit_of_measurement || '') : '');
    const displayVal = isNaN(value) ? '—' : Math.round(value);
    const bottomItems = cfg.bottom_items || [];
    const arcVbH = Math.ceil(Math.max(sy, ey) + strokeHalf);
    const vbH = Math.ceil(arcVbH + 4);
    const valueOffset = cfg.value_offset ?? (arcVbH * 0.62);
    const labelOffset = cfg.label_offset ?? (valueOffset + 15);
    const valueTopPct = (valueOffset / vbH) * 100;
    const labelTopPct = (labelOffset / vbH) * 100;

    const boxMinW = cfg.box_min_width ?? 100;
    const boxPad = cfg.box_padding ?? '5px 14px';
    const boxGap = cfg.box_gap ?? 10;
    const boxIconSizeRaw = cfg.box_icon_size ?? 'clamp(11px,6.5cqw,20px)';
    const boxIconSize = typeof boxIconSizeRaw === 'number' ? `${boxIconSizeRaw}px` : boxIconSizeRaw;
    const boxFontSize = cfg.box_font_size ?? 'clamp(0.65em,6cqw,1.1em)';
    const boxUnitFontSize = cfg.box_unit_font_size ?? 'clamp(0.55em,4.5cqw,0.95em)';
    const boxBorder = cfg.box_border ?? 2;
    const refWidth = 300;
    const boxCqwPref = (boxMinW / refWidth) * 100;
    const boxMinWCss = `clamp(40px, ${boxCqwPref.toFixed(3)}cqw, ${boxMinW}px)`;
    const cardPad = cfg.card_padding ?? '8px 24px 8px';

    const blockOpts = {
      blockCount: cfg.block_count ?? 24,
      blockGapDeg: cfg.block_gap_deg ?? 1.5,
      emptyColor: cfg.empty_color ?? 'var(--disabled-text-color, #555)',
      emptyOpacity: cfg.empty_opacity ?? 0.45,
      minThickness: cfg.block_min_thickness ?? 3,
      maxThickness: cfg.block_max_thickness ?? 10,
    };

    const sa2cfg = cfg.second_arc;
    let sa2 = null;
    if (sa2cfg) {
      const r2x = sa2cfg.radius_x ?? 65;
      const r2y = sa2cfg.radius_y ?? 65;
      const st2 = this._hass.states[sa2cfg.entity];
      const v2 = st2 ? parseFloat(st2.state) : NaN;
      const min2 = sa2cfg.min ?? 0;
      const max2 = sa2cfg.max ?? 100;
      const seg2 = sa2cfg.segments || segments;
      const maxAbsAngle = Math.max(Math.abs(startA), Math.abs(endA));
      const cosMax = Math.cos(maxAbsAngle * Math.PI / 180);
      const cy2 = strokeHalf - r2y * cosMax;
      const toXY2 = (deg) => {
        const rad = deg * Math.PI / 180;
        return [cx + r2x * Math.sin(rad), cy2 + r2y * Math.cos(rad)];
      };
      const vbH2 = Math.ceil(cy2 + r2y + strokeHalf);
      const color2 = this._smoothColorFor(isNaN(v2) ? min2 : v2, seg2);
      const name2 = sa2cfg.name || (st2 ? st2.attributes.friendly_name : sa2cfg.entity);
      const icon2 = sa2cfg.icon || 'mdi:gauge';
      const unit2 = sa2cfg.unit ?? (st2 ? (st2.attributes.unit_of_measurement || '') : '');
      const displayVal2 = isNaN(v2) ? '—' : Math.round(v2);
      const labelOffset2 = sa2cfg.label_offset ?? 8;
      const valueOffset2 = sa2cfg.value_offset ?? 24;
      const labelTopPct2 = (labelOffset2 / vbH2) * 100;
      const valueTopPct2 = (valueOffset2 / vbH2) * 100;
      const blockOpts2 = {
        blockCount: sa2cfg.block_count ?? blockOpts.blockCount,
        blockGapDeg: sa2cfg.block_gap_deg ?? blockOpts.blockGapDeg,
        emptyColor: sa2cfg.empty_color ?? blockOpts.emptyColor,
        emptyOpacity: sa2cfg.empty_opacity ?? blockOpts.emptyOpacity,
        minThickness: sa2cfg.block_min_thickness ?? blockOpts.minThickness,
        maxThickness: sa2cfg.block_max_thickness ?? blockOpts.maxThickness,
      };
      sa2 = { toXY2, r2x, r2y, cy2, min2, max2, v2, seg2, vbH2, color2, name2, icon2, unit2, displayVal2, labelTopPct2, valueTopPct2, blockOpts2 };
    }

    if (!this.content) {
      this.innerHTML = `<ha-card><div style="text-align:center;padding:${cardPad};overflow:hidden;container-type:inline-size;">
        <div class="arc-wrap" style="position:relative;">
          <svg class="arc-svg" viewBox="0 0 200 ${vbH}" width="100%" style="max-width:280px;display:block;margin:0 auto;overflow:visible;"></svg>
          <div class="val-overlay" style="position:absolute;left:0;right:0;text-align:center;transform:translateY(-50%);">
            <span class="val" style="font-size:clamp(14px,13cqw,40px);font-weight:bold;line-height:1;"></span><span class="unit" style="font-size:clamp(9px,7.5cqw,24px);"></span>
          </div>
          <div class="label-overlay" style="position:absolute;left:0;right:0;text-align:center;transform:translateY(-50%);white-space:nowrap;">
            <ha-icon class="icon" style="--mdc-icon-size:clamp(12px,7cqw,22px);vertical-align:middle;"></ha-icon>
            <span class="name" style="font-size:clamp(9px,6cqw,19px);vertical-align:middle;"></span>
          </div>
        </div>
        <div class="bottom-wrap"></div>
        <div class="arc2-wrap" style="position:relative;margin-top:6px;container-type:inline-size;"></div>
      </div></ha-card>`;
      this.content = {
        svg: this.querySelector('.arc-svg'),
        valOverlay: this.querySelector('.val-overlay'),
        labelOverlay: this.querySelector('.label-overlay'),
        icon: this.querySelector('.icon'),
        val: this.querySelector('.val'),
        unit: this.querySelector('.unit'),
        name: this.querySelector('.name'),
        bottomWrap: this.querySelector('.bottom-wrap'),
        arc2Wrap: this.querySelector('.arc2-wrap'),
      };
    }
    this.content.svg.setAttribute('viewBox', `0 0 200 ${vbH}`);
    this.content.svg.innerHTML = this._blocksArcSvg(toXY, startA, endA, min, max, value, segments, blockOpts);
    this.content.valOverlay.style.top = `${valueTopPct}%`;
    this.content.labelOverlay.style.top = `${labelTopPct}%`;
    this.content.icon.setAttribute('icon', icon);
    this.content.icon.style.color = color;
    this.content.val.textContent = displayVal;
    this.content.val.style.color = color;
    this.content.unit.textContent = unit;
    this.content.unit.style.color = color;
    this.content.name.textContent = name;
    this.content.name.style.color = color;

    const box = (item) => {
      if (!item) return '';
      const st = this._hass.states[item.entity];
      const v = this._fmt(st, item.decimals || 0);
      const u = item.unit !== undefined && item.unit !== '' ? item.unit : (st ? (st.attributes.unit_of_measurement || '') : '');
      return `<div style="display:flex;align-items:center;justify-content:center;white-space:nowrap;border:${boxBorder}px solid var(--divider-color, #555);border-radius:12px;padding:${boxPad};box-sizing:border-box;">
        <ha-icon icon="${item.icon || 'mdi:information'}" style="--mdc-icon-size:${boxIconSize};color:${item.color || 'var(--primary-text-color)'};flex-shrink:0;"></ha-icon>
        <span style="font-weight:bold;font-size:${boxFontSize};margin-left:4px;">${v}</span><span style="font-size:${boxUnitFontSize};">${u}</span>
      </div>`;
    };
    this.content.bottomWrap.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2, minmax(${boxMinWCss}, max-content));justify-content:center;gap:${boxGap}px;margin-top:5px;">${bottomItems.map(box).join('')}</div>`;

    if (sa2) {
      const toXY2m = (deg) => {
        const rad = deg * Math.PI / 180;
        return [cx + sa2.r2x * Math.sin(rad), sa2.cy2 + sa2.r2y * Math.cos(rad)];
      };
      const arcSvg = this._blocksArcSvg(toXY2m, startA, endA, sa2.min2, sa2.max2, sa2.v2, sa2.seg2, sa2.blockOpts2);
      this.content.arc2Wrap.innerHTML = `<svg viewBox="0 0 200 ${sa2.vbH2}" width="100%" style="max-width:280px;display:block;margin:0 auto;overflow:visible;">${arcSvg}</svg>
        <div style="position:absolute;left:0;right:0;top:${sa2.labelTopPct2}%;text-align:center;transform:translateY(-50%);white-space:nowrap;">
          <ha-icon icon="${sa2.icon2}" style="--mdc-icon-size:clamp(12px,7cqw,22px);color:${sa2.color2};vertical-align:middle;"></ha-icon>
          <span style="font-size:clamp(9px,6cqw,19px);color:${sa2.color2};vertical-align:middle;">${sa2.name2}</span>
        </div>
        <div style="position:absolute;left:0;right:0;top:${sa2.valueTopPct2}%;text-align:center;transform:translateY(-50%);">
          <span style="font-size:clamp(13px,12cqw,36px);font-weight:bold;line-height:1;color:${sa2.color2};">${sa2.displayVal2}</span><span style="font-size:clamp(9px,7cqw,22px);color:${sa2.color2};"> ${sa2.unit2}</span>
        </div>`;
    } else if (this.content.arc2Wrap) {
      this.content.arc2Wrap.innerHTML = '';
    }
  }
}
customElements.define('top-arc-gauge-blocks', TopArcGaugeBlocks);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'top-arc-gauge-blocks', name: 'Top Arc Gauge (Blocks)', description: 'Variante en blocs rectangulaires façon montre Garmin, épaisseur progressive rouge→vert, sans point mobile' });

// ==========================================================================
// NEW UNIFIED CARD: "Jauge demi-arc" — combines both styles (classique /
// blocs), selectable INDEPENDENTLY for the top arc and the bottom arc.
// ==========================================================================
class HalfArcGauge extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("Merci de définir une entité (entity)");
    this.config = config;
  }
  set hass(hass) {
    this._hass = hass;
    this._render();
  }
  getCardSize() { return 2; }
  static getConfigElement() {
    return document.createElement('half-arc-gauge-editor');
  }
  static getStubConfig() {
    return {
      entity: 'sensor.example_body_battery',
      style: 'classic',
      radius_x: 90,
      radius_y: 75,
      second_arc: { entity: 'sensor.example_steps', style: 'blocks' },
      bottom_items: [],
    };
  }
  _ensureFont() {
    if (document.getElementById('half-arc-gauge-font-shadows')) return;
    const link = document.createElement('link');
    link.id = 'half-arc-gauge-font-shadows';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Shadows+Into+Light&display=swap';
    document.head.appendChild(link);
  }
  _fmt(stateObj, decimals) {
    if (!stateObj) return '—';
    const v = parseFloat(stateObj.state);
    if (isNaN(v)) return stateObj.state;
    const d = Math.max(0, Math.round(decimals || 0));
    if (d === 0) return Math.round(v);
    return v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
  }
  _hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const num = parseInt(n, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  _lerpColor(c1, c2, t) {
    const a = this._hexToRgb(c1);
    const b = this._hexToRgb(c2);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  _smoothColorFor(value, segments) {
    if (value <= segments[0][0]) return segments[0][1];
    for (let i = 0; i < segments.length - 1; i++) {
      const a = segments[i], b = segments[i + 1];
      if (value >= a[0] && value <= b[0]) {
        const t = (value - a[0]) / (b[0] - a[0]);
        return this._lerpColor(a[1], b[1], t);
      }
    }
    return segments[segments.length - 1][1];
  }
  _scaledFont(px, floorPx) {
    const refWidth = 300;
    const pref = (px / refWidth) * 100;
    return `clamp(${floorPx}px, ${pref.toFixed(3)}cqw, ${px}px)`;
  }
  _gradientArcSvg(toXY, startA, endA, min, max, value, segments, opts) {
    const { strokeWidth, dotR, dotBorderColor, dotBorderWidth, bgPathD, bgWidth, bgOpacity, bgColor } = opts;
    let paths = '';
    if (bgWidth > 0) {
      paths += `<path d="${bgPathD}" fill="none" stroke="${bgColor}" stroke-width="${bgWidth}" stroke-opacity="${bgOpacity}" stroke-linecap="round"/>`;
    }
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const a0 = startA + ((endA - startA) * i) / steps;
      const a1 = startA + ((endA - startA) * (i + 1)) / steps;
      const mid = min + (((a0 + a1) / 2 - startA) / (endA - startA)) * (max - min);
      const col = this._smoothColorFor(mid, segments);
      const [x0, y0] = toXY(a0);
      const [x1, y1] = toXY(a1);
      paths += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${col}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
    }
    let frac = isNaN(value) ? 0 : (value - min) / (max - min);
    frac = Math.max(0, Math.min(1, frac));
    const dotA = startA + frac * (endA - startA);
    const [dx, dy] = toXY(dotA);
    const dotColor = this._smoothColorFor(isNaN(value) ? min : value, segments);
    paths += `<circle cx="${dx}" cy="${dy}" r="${dotR + dotBorderWidth}" fill="${dotBorderColor}"/>`;
    paths += `<circle cx="${dx}" cy="${dy}" r="${dotR}" fill="${dotColor}"/>`;
    return paths;
  }
  _blocksArcSvg(toXY, startA, endA, min, max, value, segments, opts) {
    const { blockCount, blockGapDeg, emptyColor, emptyOpacity, minThickness, maxThickness, emptyStyle } = opts;
    let frac = isNaN(value) ? 0 : (value - min) / (max - min);
    frac = Math.max(0, Math.min(1, frac));
    const filledCount = Math.round(frac * blockCount);
    const totalSpan = endA - startA;
    const blockSpan = totalSpan / blockCount;
    let paths = '';
    for (let i = 0; i < blockCount; i++) {
      const a0 = startA + i * blockSpan + blockGapDeg / 2;
      const a1 = startA + (i + 1) * blockSpan - blockGapDeg / 2;
      const [x0, y0] = toXY(a0);
      const [x1, y1] = toXY(a1);
      const t = i / Math.max(1, blockCount - 1);
      const thickness = minThickness + t * (maxThickness - minThickness);
      const mid = min + (((a0 + a1) / 2 - startA) / totalSpan) * (max - min);
      let color, opacity;
      if (i < filledCount) {
        color = this._smoothColorFor(mid, segments);
        opacity = 1;
      } else if (emptyStyle === 'dimmed') {
        color = this._smoothColorFor(mid, segments);
        opacity = emptyOpacity;
      } else {
        color = emptyColor;
        opacity = emptyOpacity;
      }
      paths += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${thickness}" stroke-linecap="butt"/>`;
    }
    return paths;
  }
  _prepArc(arcCfg, defaults, startA, endA, strokeHalf, toXYFactory) {
    const rx = arcCfg.radius_x ?? defaults.rx;
    const ry = arcCfg.radius_y ?? defaults.ry;
    const toXY = toXYFactory(rx, ry);
    const [sx, sy] = toXY(startA);
    const [ex, ey] = toXY(endA);
    const [, vertexY] = toXY(0);
    const st = this._hass.states[arcCfg.entity];
    const value = st ? parseFloat(st.state) : NaN;
    const min = arcCfg.min ?? 0;
    const max = arcCfg.max ?? 100;
    const segments = arcCfg.segments || defaults.segments;
    const style = arcCfg.style || defaults.style || 'classic';
    const color = this._smoothColorFor(isNaN(value) ? min : value, segments);
    const name = arcCfg.name || (st ? st.attributes.friendly_name : arcCfg.entity);
    const icon = arcCfg.icon || 'mdi:gauge';
    const unit = arcCfg.unit !== undefined && arcCfg.unit !== ''
      ? arcCfg.unit
      : (st ? (st.attributes.unit_of_measurement || '') : '');
    const decimals = Math.max(0, Math.round(arcCfg.decimals ?? 0));
    const displayVal = isNaN(value)
      ? '—'
      : (decimals > 0
        ? value.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : Math.round(value));
    const arcVbH = Math.ceil(Math.max(sy, ey, vertexY) + strokeHalf);
    const valueOffset = arcCfg.value_offset ?? (arcVbH * 0.62);
    const labelOffset = arcCfg.label_offset ?? (valueOffset + 15);
    const valueFontPx = arcCfg.value_font_size ?? defaults.valueFontPx;
    const labelFontPx = arcCfg.label_font_size ?? defaults.labelFontPx;
    const valueFontCss = this._scaledFont(valueFontPx, Math.max(9, Math.round(valueFontPx * 0.35)));
    const labelFontCss = this._scaledFont(labelFontPx, Math.max(7, Math.round(labelFontPx * 0.47)));
    let svg;
    if (style === 'blocks') {
      svg = this._blocksArcSvg(toXY, startA, endA, min, max, value, segments, {
        blockCount: arcCfg.block_count ?? 24,
        blockGapDeg: arcCfg.block_gap_deg ?? 1.5,
        emptyColor: arcCfg.empty_color ?? 'var(--disabled-text-color, #555)',
        emptyOpacity: arcCfg.empty_opacity ?? 0.45,
        minThickness: arcCfg.block_min_thickness ?? 3,
        maxThickness: arcCfg.block_max_thickness ?? 10,
        emptyStyle: arcCfg.empty_style ?? 'grey',
      });
    } else {
      svg = this._gradientArcSvg(toXY, startA, endA, min, max, value, segments, {
        strokeWidth: arcCfg.stroke_width ?? 6,
        dotR: arcCfg.dot_radius ?? 9,
        dotBorderColor: arcCfg.dot_border_color ?? 'var(--card-background-color, #1c1c1c)',
        dotBorderWidth: arcCfg.dot_border_width ?? 3,
        bgPathD: `M ${sx} ${sy} A ${rx} ${ry} 0 0 ${defaults.sweep} ${ex} ${ey}`,
        bgWidth: arcCfg.background_width ?? 2,
        bgOpacity: arcCfg.background_opacity ?? 0.45,
        bgColor: arcCfg.background_color ?? 'var(--disabled-text-color, #888)',
      });
    }
    return { arcVbH, valueOffset, labelOffset, svg, color, name, icon, unit, displayVal, valueFontCss, labelFontCss };
  }
  _render() {
    if (!this._hass || !this.config) return;
    this._ensureFont();
    const cfg = this.config;
    const startA = cfg.start_angle ?? -80;
    const endA = cfg.end_angle ?? 80;
    const cx = 100, cy = 70;
    const strokeHalf = 5;
    const defaultSegments = [[0, '#f44336'], [30, '#fb8c00'], [50, '#4caf50']];

    const topDefaults = { rx: 90, ry: 75, segments: defaultSegments, style: 'classic', sweep: 1, valueFontPx: 40, labelFontPx: 19 };
    const topToXYFactory = (rx, ry) => (deg) => {
      const rad = deg * Math.PI / 180;
      return [cx + rx * Math.sin(rad), cy - ry * Math.cos(rad)];
    };
    const top = this._prepArc(cfg, topDefaults, startA, endA, strokeHalf, topToXYFactory);
    const vbH = Math.ceil(top.arcVbH + 4);
    const valueTopPct = (top.valueOffset / vbH) * 100;
    const labelTopPct = (top.labelOffset / vbH) * 100;

    const boxMinW = cfg.box_min_width ?? 76;
    const boxSingleW = cfg.box_single_width ?? boxMinW;
    const boxPad = cfg.box_padding ?? '5px 14px';
    const boxGap = cfg.box_gap ?? 10;
    const boxIconSizeRaw = cfg.box_icon_size ?? 'clamp(11px,6.5cqw,20px)';
    const boxIconSize = typeof boxIconSizeRaw === 'number' ? `${boxIconSizeRaw}px` : boxIconSizeRaw;
    const boxValuePx = cfg.box_value_font_px ?? 18;
    const boxUnitPx = cfg.box_unit_font_px ?? 15;
    const boxFontSize = cfg.box_font_size ?? this._scaledFont(boxValuePx, 9);
    const boxUnitFontSize = cfg.box_unit_font_size ?? this._scaledFont(boxUnitPx, 8);
    const boxBorder = cfg.box_border ?? 2;
    const refWidth = 300;
    const boxCqwPref = (boxMinW / refWidth) * 100;
    const boxMinWCss = `clamp(40px, ${boxCqwPref.toFixed(3)}cqw, ${boxMinW}px)`;
    const boxSingleCqwPref = (boxSingleW / refWidth) * 100;
    const boxSingleWCss = `clamp(40px, ${boxSingleCqwPref.toFixed(3)}cqw, ${boxSingleW}px)`;
    const cardPad = cfg.card_padding ?? '8px 24px 8px';
    const bottomCount = Math.min(4, Math.max(0, Math.round(cfg.bottom_count ?? 4)));
    const bottomItems = (cfg.bottom_items || []).slice(0, bottomCount);
    const boxesMarginTop = cfg.boxes_margin_top ?? 5;
    const arc2MarginTop = cfg.arc2_margin_top ?? 6;

    const cardTitle = cfg.title || '';
    const titlePosition = cfg.title_position || 'above';
    const titleFontPx = cfg.title_font_size ?? 20;
    const titleMarginPx = cfg.title_margin ?? 4;

    const sa2cfg = cfg.second_arc;
    let sa2 = null;
    if (sa2cfg && sa2cfg.entity) {
      const maxAbsAngle = Math.max(Math.abs(startA), Math.abs(endA));
      const cosMax = Math.cos(maxAbsAngle * Math.PI / 180);
      const r2yForCy = sa2cfg.radius_y ?? 65;
      const cy2 = strokeHalf - r2yForCy * cosMax;
      const botToXYFactory = (rx, ry) => (deg) => {
        const rad = deg * Math.PI / 180;
        return [cx + rx * Math.sin(rad), cy2 + ry * Math.cos(rad)];
      };
      const botDefaults = { rx: 65, ry: 65, segments: defaultSegments, style: 'blocks', sweep: 0, valueFontPx: 36, labelFontPx: 19 };
      const bottom = this._prepArc(sa2cfg, botDefaults, startA, endA, strokeHalf, botToXYFactory);
      const vbH2 = Math.ceil(bottom.arcVbH + 4);
      const labelTopPct2 = (bottom.labelOffset / vbH2) * 100;
      const valueTopPct2 = (bottom.valueOffset / vbH2) * 100;
      sa2 = { ...bottom, vbH2, labelTopPct2, valueTopPct2 };
    }

    if (!this.content) {
      this.innerHTML = `<ha-card><div class="card-inner" style="text-align:center;overflow:hidden;container-type:inline-size;">
        <div class="title-wrap" style="display:none;font-family:'Shadows Into Light', cursive;text-align:center;line-height:1.2;"></div>
        <div class="arc-wrap" style="position:relative;">
          <svg class="arc-svg" viewBox="0 0 200 ${vbH}" width="100%" style="max-width:280px;display:block;margin:0 auto;overflow:visible;"></svg>
          <div class="val-overlay" style="position:absolute;left:0;right:0;text-align:center;transform:translateY(-50%);">
            <span class="val" style="font-weight:bold;line-height:1;"></span><span class="unit" style="font-size:clamp(9px,7.5cqw,24px);"></span>
          </div>
          <div class="label-overlay" style="position:absolute;left:0;right:0;text-align:center;transform:translateY(-50%);white-space:nowrap;">
            <ha-icon class="icon" style="--mdc-icon-size:clamp(12px,7cqw,22px);vertical-align:middle;"></ha-icon>
            <span class="name" style="vertical-align:middle;"></span>
          </div>
        </div>
        <div class="bottom-wrap"></div>
        <div class="arc2-wrap" style="position:relative;container-type:inline-size;"></div>
      </div></ha-card>`;
      this.content = {
        container: this.querySelector('.card-inner'),
        titleWrap: this.querySelector('.title-wrap'),
        svg: this.querySelector('.arc-svg'),
        valOverlay: this.querySelector('.val-overlay'),
        labelOverlay: this.querySelector('.label-overlay'),
        icon: this.querySelector('.icon'),
        val: this.querySelector('.val'),
        unit: this.querySelector('.unit'),
        name: this.querySelector('.name'),
        bottomWrap: this.querySelector('.bottom-wrap'),
        arc2Wrap: this.querySelector('.arc2-wrap'),
      };
    }

    this.content.container.style.padding = cardPad;
    const basePaddingTop = parseFloat(this.content.container.style.paddingTop) || 0;
    const basePaddingBottom = parseFloat(this.content.container.style.paddingBottom) || 0;

    if (cardTitle) {
      this.content.titleWrap.style.display = '';
      this.content.titleWrap.textContent = cardTitle;
      this.content.titleWrap.style.fontSize = `${titleFontPx}px`;
      this.content.titleWrap.style.margin = titlePosition === 'below' ? `${titleMarginPx}px 0 0` : `0 0 ${titleMarginPx}px`;
      const titleBlockPx = titleFontPx * 1.2 + Math.max(0, titleMarginPx);
      if (titlePosition === 'below') {
        this.content.container.style.paddingBottom = `${Math.max(0, basePaddingBottom - titleBlockPx)}px`;
      } else {
        this.content.container.style.paddingTop = `${Math.max(0, basePaddingTop - titleBlockPx)}px`;
      }
    } else {
      this.content.titleWrap.style.display = 'none';
      this.content.titleWrap.textContent = '';
    }
    const outerWrap = this.content.titleWrap.parentElement;
    if (titlePosition === 'below') {
      outerWrap.appendChild(this.content.titleWrap);
    } else if (outerWrap.firstChild !== this.content.titleWrap) {
      outerWrap.insertBefore(this.content.titleWrap, outerWrap.firstChild);
    }

    this.content.svg.setAttribute('viewBox', `0 0 200 ${vbH}`);
    this.content.svg.innerHTML = top.svg;
    this.content.valOverlay.style.top = `${valueTopPct}%`;
    this.content.labelOverlay.style.top = `${labelTopPct}%`;
    this.content.icon.setAttribute('icon', top.icon);
    this.content.icon.style.color = top.color;
    this.content.val.textContent = top.displayVal;
    this.content.val.style.color = top.color;
    this.content.val.style.fontSize = top.valueFontCss;
    this.content.unit.textContent = top.unit;
    this.content.unit.style.color = top.color;
    this.content.name.textContent = top.name;
    this.content.name.style.color = top.color;
    this.content.name.style.fontSize = top.labelFontCss;
    this.content.arc2Wrap.style.marginTop = sa2 ? `${arc2MarginTop}px` : '0px';

    const box = (item, extraStyle) => {
      if (!item) return '';
      const st = this._hass.states[item.entity];
      const v = this._fmt(st, item.decimals || 0);
      const u = item.unit !== undefined && item.unit !== '' ? item.unit : (st ? (st.attributes.unit_of_measurement || '') : '');
      const contentType = item.content_type || 'icon';
      const position = item.position || 'before';
      let marker = '';
      if (contentType === 'text' && item.content) {
        marker = `<span style="font-size:${boxFontSize};flex-shrink:0;">${item.content}</span>`;
      } else if (contentType !== 'text' && item.icon) {
        marker = `<ha-icon icon="${item.icon}" style="--mdc-icon-size:${boxIconSize};color:${item.color || 'var(--primary-text-color)'};flex-shrink:0;"></ha-icon>`;
      }
      const valueSpan = `<span style="font-weight:bold;font-size:${boxFontSize};${position === 'after' ? '' : 'margin-left:4px;'}">${v}</span><span style="font-size:${boxUnitFontSize};margin-left:0.2em;">${u}</span>`;
      const markerHtml = position === 'after' ? marker.replace('flex-shrink:0;', 'flex-shrink:0;margin-left:4px;') : marker;
      const inner = position === 'after' ? `${valueSpan}${markerHtml}` : `${markerHtml}${valueSpan}`;
      return `<div style="display:flex;align-items:center;justify-content:center;white-space:nowrap;border:${boxBorder}px solid var(--divider-color, #555);border-radius:12px;padding:${boxPad};box-sizing:border-box;${extraStyle || ''}">${inner}</div>`;
    };
    if (bottomItems.length === 0) {
      this.content.bottomWrap.innerHTML = '';
    } else {
      const isOddCount = bottomItems.length % 2 === 1;
      const boxesHtml = bottomItems.map((item, idx) => {
        const isLast = idx === bottomItems.length - 1;
        const extra = (isOddCount && isLast) ? `grid-column:1 / -1;justify-self:center;width:${boxSingleWCss};` : '';
        return box(item, extra);
      }).join('');
      this.content.bottomWrap.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2, minmax(${boxMinWCss}, max-content));justify-content:center;gap:${boxGap}px;margin-top:${boxesMarginTop}px;">${boxesHtml}</div>`;
    }

    if (sa2) {
      this.content.arc2Wrap.innerHTML = `<svg viewBox="0 0 200 ${sa2.vbH2}" width="100%" style="max-width:280px;display:block;margin:0 auto;overflow:visible;">${sa2.svg}</svg>
        <div style="position:absolute;left:0;right:0;top:${sa2.labelTopPct2}%;text-align:center;transform:translateY(-50%);white-space:nowrap;">
          <ha-icon icon="${sa2.icon}" style="--mdc-icon-size:clamp(12px,7cqw,22px);color:${sa2.color};vertical-align:middle;"></ha-icon>
          <span style="font-size:${sa2.labelFontCss};color:${sa2.color};vertical-align:middle;">${sa2.name}</span>
        </div>
        <div style="position:absolute;left:0;right:0;top:${sa2.valueTopPct2}%;text-align:center;transform:translateY(-50%);">
          <span style="font-size:${sa2.valueFontCss};font-weight:bold;line-height:1;color:${sa2.color};">${sa2.displayVal}</span><span style="font-size:clamp(9px,7cqw,22px);color:${sa2.color};"> ${sa2.unit}</span>
        </div>`;
    } else if (this.content.arc2Wrap) {
      this.content.arc2Wrap.innerHTML = '';
    }
  }
}
customElements.define('half-arc-gauge', HalfArcGauge);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'half-arc-gauge', name: 'Jauge demi-arc', description: 'Deux demi-jauges superposées (jauge du bas masquable si aucune entité), mini-valeurs masquables (0 à 4), titre optionnel (au-dessus/en dessous, police manuscrite, compensation auto du padding), décimales de la valeur réglables (jauges et mini-valeurs), nom/icône réglables, unité/marqueur des mini-valeurs personnalisables, éditeur visuel intégré' });

// ---- Visual editor for "Jauge demi-arc" ----
class HalfArcGaugeEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._build();
  }
  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll('ha-entity-picker').forEach((el) => { el.hass = hass; });
  }
  _emit() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }
  _cloneAlongPath(path) {
    const cfg = { ...this._config };
    let obj = cfg;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      obj[k] = { ...(obj[k] || {}) };
      obj = obj[k];
    }
    return [cfg, obj];
  }
  _setPath(path, value) {
    const [cfg, obj] = this._cloneAlongPath(path);
    obj[path[path.length - 1]] = value;
    this._config = cfg;
    this._emit();
  }
  _setBottomItemEntity(idx, entity) {
    const cfg = { ...this._config };
    const items = (cfg.bottom_items || []).map((it) => ({ ...it }));
    while (items.length <= idx) items.push({});
    items[idx] = { ...items[idx], entity };
    cfg.bottom_items = items;
    this._config = cfg;
    this._emit();
  }
  _setBottomItemField(idx, key, value) {
    const cfg = { ...this._config };
    const items = (cfg.bottom_items || []).map((it) => ({ ...it }));
    while (items.length <= idx) items.push({});
    items[idx] = { ...items[idx], [key]: value };
    cfg.bottom_items = items;
    this._config = cfg;
    this._emit();
  }
  _setSegmentField(path, idx, fieldIdx, value) {
    const [cfg, obj] = this._cloneAlongPath(path);
    const key = path[path.length - 1];
    const arr = (obj[key] || []).map((s) => [...s]);
    if (!arr[idx]) arr[idx] = [0, '#ffffff'];
    arr[idx][fieldIdx] = value;
    obj[key] = arr;
    this._config = cfg;
    this._emit();
  }
  _addSegment(path) {
    const [cfg, obj] = this._cloneAlongPath(path);
    const key = path[path.length - 1];
    obj[key] = [...(obj[key] || []), [0, '#ffffff']];
    this._config = cfg;
    this._emit();
  }
  _removeSegment(path, idx) {
    const [cfg, obj] = this._cloneAlongPath(path);
    const key = path[path.length - 1];
    obj[key] = (obj[key] || []).filter((_, i) => i !== idx);
    this._config = cfg;
    this._emit();
  }
  _row(labelText, controlEl) {
    const row = document.createElement('div');
    row.style.cssText = 'margin:8px 0;';
    const label = document.createElement('div');
    label.textContent = labelText;
    label.style.cssText = 'font-size:0.85em;color:var(--secondary-text-color);margin-bottom:3px;';
    row.appendChild(label);
    row.appendChild(controlEl);
    return row;
  }
  _numberInput(path, value, step) {
    const input = document.createElement('input');
    input.type = 'number';
    if (step) input.step = step;
    input.value = value ?? '';
    input.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:6px 8px;';
    input.addEventListener('change', () => {
      const v = input.value === '' ? undefined : parseFloat(input.value);
      this._setPath(path, v);
    });
    return input;
  }
  _textInput(path, value, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value ?? '';
    if (placeholder) input.placeholder = placeholder;
    input.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:6px 8px;';
    input.addEventListener('change', () => {
      this._setPath(path, input.value);
    });
    return input;
  }
  _entityPicker(path, value, onChange) {
    const picker = document.createElement('ha-entity-picker');
    picker.hass = this._hass;
    picker.value = value || '';
    picker.style.width = '100%';
    picker.addEventListener('value-changed', (ev) => {
      ev.stopPropagation();
      if (onChange) onChange(ev.detail.value);
      else this._setPath(path, ev.detail.value);
    });
    return picker;
  }
  _styleSelect(path, value) {
    const select = document.createElement('select');
    select.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:7px 8px;';
    [['classic', 'Classique (dégradé continu)'], ['blocks', 'Blocs']].forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if ((value || 'classic') === val) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => this._setPath(path, select.value));
    return select;
  }
  _emptyStyleSelect(path, value) {
    const select = document.createElement('select');
    select.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:7px 8px;';
    [['grey', 'Grisé (couleur neutre)'], ['dimmed', "Éteint (couleur d'origine, en pâle)"]].forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if ((value || 'grey') === val) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => this._setPath(path, select.value));
    return select;
  }
  _genericSelect(options, currentValue, onChange) {
    const select = document.createElement('select');
    select.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:7px 8px;';
    options.forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (currentValue === val) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }
  _section(title) {
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'font-weight:600;margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--divider-color);';
    return h;
  }
  _twoCols(a, b) {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
    grid.appendChild(a);
    grid.appendChild(b);
    return grid;
  }
  _segmentsEditor(path, segments) {
    const container = document.createElement('div');
    (segments || []).forEach((seg, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;';
      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.value = seg[0];
      numInput.style.cssText = 'width:90px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:5px 6px;';
      numInput.addEventListener('change', () => this._setSegmentField(path, idx, 0, parseFloat(numInput.value)));
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = /^#[0-9a-fA-F]{6}$/.test(seg[1]) ? seg[1] : '#ffffff';
      colorInput.style.cssText = 'width:48px;height:32px;border:1px solid var(--divider-color);border-radius:6px;background:none;padding:0;cursor:pointer;';
      colorInput.addEventListener('change', () => this._setSegmentField(path, idx, 1, colorInput.value));
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.title = 'Retirer ce palier';
      removeBtn.style.cssText = 'background:none;border:none;color:var(--secondary-text-color);font-size:1.3em;line-height:1;cursor:pointer;padding:0 6px;';
      removeBtn.addEventListener('click', () => this._removeSegment(path, idx));
      row.appendChild(numInput);
      row.appendChild(colorInput);
      row.appendChild(removeBtn);
      container.appendChild(row);
    });
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Ajouter un palier';
    addBtn.style.cssText = 'margin-top:6px;background:none;border:1px dashed var(--divider-color);color:var(--primary-text-color);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.85em;';
    addBtn.addEventListener('click', () => this._addSegment(path));
    container.appendChild(addBtn);
    return container;
  }
  _appearanceFields(basePath, arcCfg, style) {
    const frag = document.createElement('div');
    const p = (key) => [...basePath, key];
    if (style === 'blocks') {
      frag.appendChild(this._twoCols(
        this._row('Nombre de blocs', this._numberInput(p('block_count'), arcCfg.block_count ?? 24)),
        this._row('Espace entre blocs (°)', this._numberInput(p('block_gap_deg'), arcCfg.block_gap_deg ?? 1.5, 0.5)),
      ));
      frag.appendChild(this._twoCols(
        this._row('Épaisseur mini (côté bas)', this._numberInput(p('block_min_thickness'), arcCfg.block_min_thickness ?? 3)),
        this._row('Épaisseur maxi (côté haut)', this._numberInput(p('block_max_thickness'), arcCfg.block_max_thickness ?? 10)),
      ));
      frag.appendChild(this._row('Style des blocs vides', this._emptyStyleSelect(p('empty_style'), arcCfg.empty_style ?? 'grey')));
      frag.appendChild(this._row('Opacité des blocs vides (0 à 1)', this._numberInput(p('empty_opacity'), arcCfg.empty_opacity ?? 0.45, 0.05)));
    } else {
      frag.appendChild(this._twoCols(
        this._row('Épaisseur du trait', this._numberInput(p('stroke_width'), arcCfg.stroke_width ?? 6)),
        this._row('Taille du point', this._numberInput(p('dot_radius'), arcCfg.dot_radius ?? 9)),
      ));
      frag.appendChild(this._twoCols(
        this._row('Épaisseur du fond', this._numberInput(p('background_width'), arcCfg.background_width ?? 2)),
        this._row('Opacité du fond (0 à 1)', this._numberInput(p('background_opacity'), arcCfg.background_opacity ?? 0.45, 0.05)),
      ));
    }
    return frag;
  }
  _bottomItemFields(idx, item) {
    const frag = document.createElement('div');
    frag.style.cssText = 'border:1px solid var(--divider-color);border-radius:8px;padding:8px;margin-bottom:8px;';
    const contentType = item.content_type || 'icon';
    frag.appendChild(this._row(`Case ${idx + 1} — Entité`, this._entityPicker(null, item.entity, (v) => this._setBottomItemEntity(idx, v))));
    const unitInput = this._textInput(null, item.unit, "vide = unité de l'entité");
    unitInput.onchange = () => this._setBottomItemField(idx, 'unit', unitInput.value);
    const decInput = document.createElement('input');
    decInput.type = 'number';
    decInput.min = '0';
    decInput.max = '4';
    decInput.step = '1';
    decInput.value = item.decimals ?? 0;
    decInput.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:6px 8px;';
    decInput.addEventListener('change', () => {
      const raw = parseFloat(decInput.value);
      const v = isNaN(raw) ? 0 : Math.min(4, Math.max(0, Math.round(raw)));
      this._setBottomItemField(idx, 'decimals', v);
    });
    frag.appendChild(this._twoCols(
      this._row("Unité (vide = celle de l'entité)", unitInput),
      this._row('Décimales (0 à 4)', decInput),
    ));
    frag.appendChild(this._twoCols(
      this._row('Marqueur', this._genericSelect(
        [['icon', 'Icône'], ['text', 'Texte libre / emoji']],
        contentType,
        (v) => this._setBottomItemField(idx, 'content_type', v),
      )),
      this._row('Position', this._genericSelect(
        [['before', 'Avant la valeur'], ['after', 'Après la valeur']],
        item.position || 'before',
        (v) => this._setBottomItemField(idx, 'position', v),
      )),
    ));
    if (contentType === 'text') {
      const textInput = this._textInput(null, item.content, "vide = pas de texte");
      textInput.onchange = () => this._setBottomItemField(idx, 'content', textInput.value);
      frag.appendChild(this._row('Texte / emoji', textInput));
    } else {
      const iconInput = this._textInput(null, item.icon, "vide = pas d'icône");
      iconInput.onchange = () => this._setBottomItemField(idx, 'icon', iconInput.value);
      frag.appendChild(this._row('Icône (mdi:...)', iconInput));
    }
    return frag;
  }
  _build() {
    const cfg = this._config || {};
    const sa = cfg.second_arc || {};
    const items = cfg.bottom_items || [];
    const topStyle = cfg.style || 'classic';
    const botStyle = sa.style || 'blocks';
    this.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:8px 4px 16px;';

    wrap.appendChild(this._section('Titre de la carte'));
    wrap.appendChild(this._row('Titre (vide = pas de titre, police manuscrite)', this._textInput(['title'], cfg.title, 'ex : Chauffe-eau')));
    wrap.appendChild(this._twoCols(
      this._row('Position', this._genericSelect(
        [['above', 'Au-dessus'], ['below', 'En dessous']],
        cfg.title_position || 'above',
        (v) => this._setPath(['title_position'], v),
      )),
      this._row('Taille du texte (px)', this._numberInput(['title_font_size'], cfg.title_font_size ?? 20)),
    ));
    wrap.appendChild(this._row('Marge titre ↔ jauge (px, peut être négatif)', this._numberInput(['title_margin'], cfg.title_margin ?? 4)));

    wrap.appendChild(this._section('Jauge du haut'));
    wrap.appendChild(this._row('Entité', this._entityPicker(['entity'], cfg.entity)));
    wrap.appendChild(this._row('Style', this._styleSelect(['style'], topStyle)));
    wrap.appendChild(this._twoCols(
      this._row('Nom affiché (vide = nom de l\'entité)', this._textInput(['name'], cfg.name, 'ex : Chauffe-eau')),
      this._row('Icône (mdi:...)', this._textInput(['icon'], cfg.icon, 'mdi:water-boiler')),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Minimum', this._numberInput(['min'], cfg.min ?? 0)),
      this._row('Maximum', this._numberInput(['max'], cfg.max ?? 100)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Unité (vide = celle de l\'entité)', this._textInput(['unit'], cfg.unit, 'ex : patates')),
      this._row('Décimales', this._numberInput(['decimals'], cfg.decimals ?? 0)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Rayon horizontal', this._numberInput(['radius_x'], cfg.radius_x ?? 90)),
      this._row('Rayon vertical', this._numberInput(['radius_y'], cfg.radius_y ?? 75)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Position valeur', this._numberInput(['value_offset'], cfg.value_offset)),
      this._row('Position libellé', this._numberInput(['label_offset'], cfg.label_offset)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Taille du texte : valeur (px)', this._numberInput(['value_font_size'], cfg.value_font_size ?? 40)),
      this._row('Taille du texte : libellé (px)', this._numberInput(['label_font_size'], cfg.label_font_size ?? 19)),
    ));
    wrap.appendChild(this._row('Paliers de couleur (valeur → couleur)', this._segmentsEditor(
      ['segments'], cfg.segments || [[0, '#f44336'], [30, '#fb8c00'], [50, '#4caf50']]
    )));
    wrap.appendChild(this._appearanceFields([], cfg, topStyle));

    wrap.appendChild(this._section('Jauge du bas (second_arc)'));
    wrap.appendChild(this._row('Entité (vide = jauge du bas masquée)', this._entityPicker(null, sa.entity, (v) => this._setPath(['second_arc', 'entity'], v))));
    wrap.appendChild(this._row('Style', this._styleSelect(['second_arc', 'style'], botStyle)));
    wrap.appendChild(this._twoCols(
      this._row('Nom affiché (vide = nom de l\'entité)', this._textInput(['second_arc', 'name'], sa.name, 'ex : Pas quotidien')),
      this._row('Icône (mdi:...)', this._textInput(['second_arc', 'icon'], sa.icon, 'mdi:shoe-print')),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Minimum', this._numberInput(['second_arc', 'min'], sa.min ?? 0)),
      this._row('Maximum', this._numberInput(['second_arc', 'max'], sa.max ?? 100)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Unité (vide = celle de l\'entité)', this._textInput(['second_arc', 'unit'], sa.unit, 'ex : pas')),
      this._row('Décimales', this._numberInput(['second_arc', 'decimals'], sa.decimals ?? 0)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Rayon horizontal', this._numberInput(['second_arc', 'radius_x'], sa.radius_x ?? 65)),
      this._row('Rayon vertical', this._numberInput(['second_arc', 'radius_y'], sa.radius_y ?? 65)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Position valeur', this._numberInput(['second_arc', 'value_offset'], sa.value_offset ?? 24)),
      this._row('Position libellé', this._numberInput(['second_arc', 'label_offset'], sa.label_offset ?? 8)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Taille du texte : valeur (px)', this._numberInput(['second_arc', 'value_font_size'], sa.value_font_size ?? 36)),
      this._row('Taille du texte : libellé (px)', this._numberInput(['second_arc', 'label_font_size'], sa.label_font_size ?? 19)),
    ));
    wrap.appendChild(this._row('Paliers de couleur (valeur → couleur)', this._segmentsEditor(
      ['second_arc', 'segments'], sa.segments || [[0, '#f44336'], [7500, '#fb8c00'], [10000, '#4caf50']]
    )));
    wrap.appendChild(this._appearanceFields(['second_arc'], sa, botStyle));

    wrap.appendChild(this._section('Mini-rectangles (communs aux deux jauges)'));
    wrap.appendChild(this._twoCols(
      this._row('Marge au-dessus (px, peut être négatif)', this._numberInput(['boxes_margin_top'], cfg.boxes_margin_top ?? 5)),
      this._row('Marge en-dessous (px, avant la jauge du bas)', this._numberInput(['arc2_margin_top'], cfg.arc2_margin_top ?? 6)),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Largeur mini des rectangles (desktop)', this._numberInput(['box_min_width'], cfg.box_min_width ?? 76)),
      this._row('Espace entre rectangles', this._numberInput(['box_gap'], cfg.box_gap ?? 10)),
    ));
    wrap.appendChild(this._row('Largeur de la case seule (vide = même que ci-dessus)', this._numberInput(['box_single_width'], cfg.box_single_width)));
    wrap.appendChild(this._twoCols(
      this._row('Taille du texte : valeur (px)', this._numberInput(['box_value_font_px'], cfg.box_value_font_px ?? 18)),
      this._row('Taille du texte : unité (px)', this._numberInput(['box_unit_font_px'], cfg.box_unit_font_px ?? 15)),
    ));

    wrap.appendChild(this._section('Mini-valeurs'));
    wrap.appendChild(this._row('Nombre de cases (0 à 4, 0 = section masquée)', this._numberInput(['bottom_count'], cfg.bottom_count ?? 4)));
    const bottomCount = Math.min(4, Math.max(0, Math.round(cfg.bottom_count ?? 4)));
    for (let i = 0; i < bottomCount; i++) {
      wrap.appendChild(this._bottomItemFields(i, items[i] || {}));
    }

    this.appendChild(wrap);
  }
}
customElements.define('half-arc-gauge-editor', HalfArcGaugeEditor);

// ==========================================================================
// NEW CARD: "Jauge ronde batterie" — full ring (donut) gauge for battery
// entities. A complete circular ring shows the charge level, with a
// battery pictogram + percentage centered inside, and the device name
// (plus optional icon/emoji marker) next to it. Inspired by the Garmin
// watch face's battery complication.
//
// Two visual styles, selectable per-instance:
//  - "classic": a single continuous-color progress ring (persistent DOM
//    circles so CSS transitions animate color/progress smoothly).
//  - "blocks": a ring of same-size LED-style segments, each colored by its
//    own position on the value scale (red→green), lit up to the current
//    value and turned off (grey/dimmed) beyond it — same "unlit LED" look
//    as the Garmin watch face, but as a full circle with uniform block size.
//
// Optional client-side auto-sort (cfg.auto_sort): when enabled, the card
// looks at its sibling cards inside the nearest CSS-grid ancestor (the
// dashboard section), reads their battery values, and sets the CSS `order`
// property on each sibling so the grid visually re-sorts by battery level —
// while every card stays an individually-editable static card config (no
// auto-entities wrapper needed). Non-gauge siblings (e.g. a heading card)
// are pinned before the gauges, keeping their original relative order.
// ==========================================================================
class BatteryRingGauge extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("Merci de définir une entité (entity)");
    this.config = config;
  }
  set hass(hass) {
    this._hass = hass;
    this._render();
  }
  getCardSize() { return 1; }
  static getConfigElement() {
    return document.createElement('battery-ring-gauge-editor');
  }
  static getStubConfig() {
    return {
      entity: 'sensor.example_battery',
      style: 'classic',
      name: '',
      subtitle: '',
    };
  }
  _hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const num = parseInt(n, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  _lerpColor(c1, c2, t) {
    const a = this._hexToRgb(c1);
    const b = this._hexToRgb(c2);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  _smoothColorFor(value, segments) {
    if (value <= segments[0][0]) return segments[0][1];
    for (let i = 0; i < segments.length - 1; i++) {
      const a = segments[i], b = segments[i + 1];
      if (value >= a[0] && value <= b[0]) {
        const t = (value - a[0]) / (b[0] - a[0]);
        return this._lerpColor(a[1], b[1], t);
      }
    }
    return segments[segments.length - 1][1];
  }
  _batteryIcon(level) {
    if (isNaN(level)) return 'mdi:battery-unknown';
    if (level >= 95) return 'mdi:battery';
    if (level <= 5) return 'mdi:battery-outline';
    const step = Math.round(level / 10) * 10;
    return `mdi:battery-${step}`;
  }
  _ringBlocksSvg(cx, cy, r, opts) {
    const { blockCount, blockGapDeg, strokeWidth, min, max, value, segments, emptyColor, emptyOpacity, emptyStyle } = opts;
    let frac = isNaN(value) ? 0 : (value - min) / (max - min);
    frac = Math.max(0, Math.min(1, frac));
    const filledCount = Math.round(frac * blockCount);
    const toXY = (deg) => {
      const rad = (deg - 90) * Math.PI / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };
    let paths = '';
    for (let i = 0; i < blockCount; i++) {
      const a0 = (i * 360) / blockCount + blockGapDeg / 2;
      const a1 = ((i + 1) * 360) / blockCount - blockGapDeg / 2;
      const [x0, y0] = toXY(a0);
      const [x1, y1] = toXY(a1);
      const mid = min + (i / Math.max(1, blockCount - 1)) * (max - min);
      let color, opacity;
      if (i < filledCount) {
        color = this._smoothColorFor(mid, segments);
        opacity = 1;
      } else if (emptyStyle === 'dimmed') {
        color = this._smoothColorFor(mid, segments);
        opacity = emptyOpacity;
      } else {
        color = emptyColor;
        opacity = emptyOpacity;
      }
      paths += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${strokeWidth}" stroke-linecap="butt"/>`;
    }
    return paths;
  }
  _scheduleSort(order) {
    if (this._sortRaf) return;
    this._sortRaf = requestAnimationFrame(() => {
      this._sortRaf = null;
      this._applySort(order);
    });
  }
  _applySort(order) {
    try {
      let container = this.parentElement;
      let hops = 0;
      while (container && hops < 8) {
        const cs = window.getComputedStyle(container);
        if (cs.display === 'grid') break;
        container = container.parentElement;
        hops++;
      }
      if (!container) return;
      const items = Array.from(container.children).map((el) => {
        const card = el.tagName === 'BATTERY-RING-GAUGE' ? el : el.querySelector('battery-ring-gauge');
        const v = card && typeof card._value === 'number' ? card._value : null;
        return { el, v };
      });
      let nonGaugeIdx = 0;
      const gaugeItems = [];
      items.forEach((item) => {
        if (item.v === null) {
          item.el.style.order = -1000 + nonGaugeIdx;
          nonGaugeIdx++;
        } else {
          gaugeItems.push(item);
        }
      });
      gaugeItems.sort((a, b) => (order === 'desc' ? b.v - a.v : a.v - b.v));
      gaugeItems.forEach((item, i) => { item.el.style.order = i; });
    } catch (e) {
      // never let a layout quirk break card rendering
    }
  }
  _render() {
    if (!this._hass || !this.config) return;
    const cfg = this.config;
    const st = this._hass.states[cfg.entity];
    const value = st ? parseFloat(st.state) : NaN;
    const min = cfg.min ?? 0;
    const max = cfg.max ?? 100;
    const segments = cfg.segments || [[0, '#f44336'], [20, '#fb8c00'], [50, '#4caf50']];
    const style = cfg.style || 'classic';
    const color = this._smoothColorFor(isNaN(value) ? min : value, segments);
    const name = cfg.name || (st ? st.attributes.friendly_name : cfg.entity);
    const subtitle = cfg.subtitle ?? '';
    const icon = cfg.icon || this._batteryIcon(value);
    const displayVal = isNaN(value) ? '—' : Math.round(value);
    const size = cfg.size ?? 88;
    const strokeWidth = cfg.stroke_width ?? 8;
    const r = (size / 2) - (strokeWidth / 2) - 2;
    const circumference = 2 * Math.PI * r;
    let frac = isNaN(value) ? 0 : (value - min) / (max - min);
    frac = Math.max(0, Math.min(1, frac));
    const offset = circumference * (1 - frac);
    const iconSize = cfg.icon_size ?? Math.round(size * 0.24);
    const valueFontSize = cfg.value_font_size ?? Math.round(size * 0.16);

    const marker = cfg.marker || null;
    let markerHtml = '';
    if (marker) {
      const mSize = cfg.marker_size ?? 18;
      if ((marker.content_type || 'icon') === 'text' && marker.content) {
        markerHtml = `<span style="font-size:${mSize}px;flex-shrink:0;">${marker.content}</span>`;
      } else if (marker.icon) {
        markerHtml = `<ha-icon icon="${marker.icon}" style="--mdc-icon-size:${mSize}px;color:${marker.color || 'var(--secondary-text-color)'};flex-shrink:0;"></ha-icon>`;
      }
    }
    const markerPosition = (marker && marker.position) || 'after';

    if (!this.content) {
      this.innerHTML = `<ha-card><div class="wrap" style="display:flex;align-items:center;gap:16px;padding:${cfg.card_padding ?? '14px 18px'};box-sizing:border-box;">
        <div class="ring-wrap" style="position:relative;flex-shrink:0;">
          <svg class="ring-svg" style="display:block;">
            <g class="ring-classic" style="transform-origin:center;transform:rotate(-90deg);">
              <circle class="ring-bg" fill="none"></circle>
              <circle class="ring-fg" fill="none" stroke-linecap="round" style="transition:stroke 0.6s ease, stroke-dashoffset 0.6s ease;"></circle>
            </g>
            <g class="ring-blocks"></g>
          </svg>
          <div class="ring-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;">
            <ha-icon class="ring-icon" style="transition:color 0.6s ease;"></ha-icon>
            <span class="ring-val" style="font-weight:bold;line-height:1;"></span>
          </div>
        </div>
        <div class="text-wrap" style="min-width:0;">
          <div class="name-row" style="display:flex;align-items:center;gap:6px;"></div>
          <div class="subtitle" style="color:var(--secondary-text-color);"></div>
        </div>
      </div></ha-card>`;
      this.content = {
        svg: this.querySelector('.ring-svg'),
        classicGroup: this.querySelector('.ring-classic'),
        ringBg: this.querySelector('.ring-bg'),
        ringFg: this.querySelector('.ring-fg'),
        blocksGroup: this.querySelector('.ring-blocks'),
        icon: this.querySelector('.ring-icon'),
        val: this.querySelector('.ring-val'),
        nameRow: this.querySelector('.name-row'),
        subtitle: this.querySelector('.subtitle'),
        ringWrap: this.querySelector('.ring-wrap'),
      };
    }

    this.content.ringWrap.style.width = `${size}px`;
    this.content.ringWrap.style.height = `${size}px`;
    this.content.svg.setAttribute('width', size);
    this.content.svg.setAttribute('height', size);
    this.content.svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

    if (style === 'blocks') {
      this.content.classicGroup.style.display = 'none';
      this.content.blocksGroup.style.display = '';
      const blockOpts = {
        blockCount: cfg.block_count ?? 24,
        blockGapDeg: cfg.block_gap_deg ?? 4,
        strokeWidth,
        min, max, value, segments,
        emptyColor: cfg.empty_color ?? 'var(--disabled-text-color, #555)',
        emptyOpacity: cfg.empty_opacity ?? 0.35,
        emptyStyle: cfg.empty_style ?? 'grey',
      };
      this.content.blocksGroup.innerHTML = this._ringBlocksSvg(size / 2, size / 2, r, blockOpts);
    } else {
      this.content.classicGroup.style.display = '';
      this.content.blocksGroup.style.display = 'none';
      this.content.blocksGroup.innerHTML = '';
      this.content.ringBg.setAttribute('cx', size / 2);
      this.content.ringBg.setAttribute('cy', size / 2);
      this.content.ringBg.setAttribute('r', r);
      this.content.ringBg.setAttribute('stroke', 'var(--divider-color, #444)');
      this.content.ringBg.setAttribute('stroke-width', strokeWidth);
      this.content.ringFg.setAttribute('cx', size / 2);
      this.content.ringFg.setAttribute('cy', size / 2);
      this.content.ringFg.setAttribute('r', r);
      this.content.ringFg.setAttribute('stroke-width', strokeWidth);
      this.content.ringFg.setAttribute('stroke-dasharray', circumference);
      this.content.ringFg.style.strokeDashoffset = `${offset}`;
      this.content.ringFg.style.stroke = color;
    }

    this.content.icon.setAttribute('icon', icon);
    this.content.icon.style.color = color;
    this.content.icon.style.setProperty('--mdc-icon-size', `${iconSize}px`);
    this.content.val.textContent = isNaN(value) ? '—' : `${displayVal}%`;
    this.content.val.style.fontSize = `${valueFontSize}px`;

    this.content.nameRow.innerHTML = '';
    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = `font-weight:500;font-size:${cfg.name_font_size ?? 15}px;`;
    nameSpan.textContent = name;
    if (markerHtml && markerPosition === 'before') {
      this.content.nameRow.insertAdjacentHTML('beforeend', markerHtml);
      this.content.nameRow.appendChild(nameSpan);
    } else {
      this.content.nameRow.appendChild(nameSpan);
      if (markerHtml) this.content.nameRow.insertAdjacentHTML('beforeend', markerHtml);
    }

    this.content.subtitle.textContent = subtitle;
    this.content.subtitle.style.fontSize = `${cfg.subtitle_font_size ?? 13}px`;
    this.content.subtitle.style.display = subtitle ? '' : 'none';

    this._value = isNaN(value) ? null : value;
    if (cfg.auto_sort) {
      this._scheduleSort(cfg.sort_order || 'asc');
    }
  }
}
customElements.define('battery-ring-gauge', BatteryRingGauge);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'battery-ring-gauge', name: 'Jauge ronde batterie', description: 'Anneau complet façon montre Garmin, style dégradé continu ou blocs LED, pictogramme batterie + pourcentage au centre, nom à côté, tri automatique optionnel dans la grille' });

// ---- Visual editor for "Jauge ronde batterie" ----
class BatteryRingGaugeEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._build();
  }
  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll('ha-entity-picker').forEach((el) => { el.hass = hass; });
  }
  _emit() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }
  _defaultSegments() {
    return [[0, '#f44336'], [20, '#fb8c00'], [50, '#4caf50']];
  }
  _cloneAlongPath(path) {
    const cfg = { ...this._config };
    let obj = cfg;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      obj[k] = { ...(obj[k] || {}) };
      obj = obj[k];
    }
    return [cfg, obj];
  }
  _setPath(path, value) {
    const [cfg, obj] = this._cloneAlongPath(path);
    obj[path[path.length - 1]] = value;
    this._config = cfg;
    this._emit();
  }
  _setSegmentField(idx, fieldIdx, value) {
    const cfg = { ...this._config };
    const arr = (cfg.segments || this._defaultSegments()).map((s) => [...s]);
    if (!arr[idx]) arr[idx] = [0, '#ffffff'];
    arr[idx][fieldIdx] = value;
    cfg.segments = arr;
    this._config = cfg;
    this._emit();
  }
  _addSegment() {
    const cfg = { ...this._config };
    cfg.segments = [...(cfg.segments || this._defaultSegments()), [0, '#ffffff']];
    this._config = cfg;
    this._emit();
  }
  _removeSegment(idx) {
    const cfg = { ...this._config };
    cfg.segments = (cfg.segments || this._defaultSegments()).filter((_, i) => i !== idx);
    this._config = cfg;
    this._emit();
  }
  _row(labelText, controlEl) {
    const row = document.createElement('div');
    row.style.cssText = 'margin:8px 0;';
    const label = document.createElement('div');
    label.textContent = labelText;
    label.style.cssText = 'font-size:0.85em;color:var(--secondary-text-color);margin-bottom:3px;';
    row.appendChild(label);
    row.appendChild(controlEl);
    return row;
  }
  _numberInput(path, value, step) {
    const input = document.createElement('input');
    input.type = 'number';
    if (step) input.step = step;
    input.value = value ?? '';
    input.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:6px 8px;';
    input.addEventListener('change', () => {
      const v = input.value === '' ? undefined : parseFloat(input.value);
      this._setPath(path, v);
    });
    return input;
  }
  _textInput(path, value, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value ?? '';
    if (placeholder) input.placeholder = placeholder;
    input.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:6px 8px;';
    input.addEventListener('change', () => {
      this._setPath(path, input.value);
    });
    return input;
  }
  _checkbox(path, value) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!value;
    input.style.cssText = 'width:18px;height:18px;cursor:pointer;';
    input.addEventListener('change', () => this._setPath(path, input.checked));
    return input;
  }
  _entityPicker(path, value) {
    const picker = document.createElement('ha-entity-picker');
    picker.hass = this._hass;
    picker.value = value || '';
    picker.style.width = '100%';
    picker.addEventListener('value-changed', (ev) => {
      ev.stopPropagation();
      this._setPath(path, ev.detail.value);
    });
    return picker;
  }
  _genericSelect(options, currentValue, onChange) {
    const select = document.createElement('select');
    select.style.cssText = 'width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:7px 8px;';
    options.forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (currentValue === val) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }
  _section(title) {
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'font-weight:600;margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--divider-color);';
    return h;
  }
  _twoCols(a, b) {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
    grid.appendChild(a);
    grid.appendChild(b);
    return grid;
  }
  _segmentsEditor() {
    const cfg = this._config || {};
    const segments = cfg.segments || this._defaultSegments();
    const container = document.createElement('div');
    segments.forEach((seg, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;';
      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.value = seg[0];
      numInput.style.cssText = 'width:90px;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:6px;padding:5px 6px;';
      numInput.addEventListener('change', () => this._setSegmentField(idx, 0, parseFloat(numInput.value)));
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = /^#[0-9a-fA-F]{6}$/.test(seg[1]) ? seg[1] : '#ffffff';
      colorInput.style.cssText = 'width:48px;height:32px;border:1px solid var(--divider-color);border-radius:6px;background:none;padding:0;cursor:pointer;';
      colorInput.addEventListener('change', () => this._setSegmentField(idx, 1, colorInput.value));
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.title = 'Retirer ce palier';
      removeBtn.style.cssText = 'background:none;border:none;color:var(--secondary-text-color);font-size:1.3em;line-height:1;cursor:pointer;padding:0 6px;';
      removeBtn.addEventListener('click', () => this._removeSegment(idx));
      row.appendChild(numInput);
      row.appendChild(colorInput);
      row.appendChild(removeBtn);
      container.appendChild(row);
    });
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Ajouter un palier';
    addBtn.style.cssText = 'margin-top:6px;background:none;border:1px dashed var(--divider-color);color:var(--primary-text-color);border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.85em;';
    addBtn.addEventListener('click', () => this._addSegment());
    container.appendChild(addBtn);
    return container;
  }
  _build() {
    const cfg = this._config || {};
    const marker = cfg.marker || {};
    const markerType = marker.content_type || 'icon';
    const size = cfg.size ?? 88;
    const ringStyle = cfg.style || 'classic';
    this.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:8px 4px 16px;';

    wrap.appendChild(this._section('Jauge'));
    wrap.appendChild(this._row('Entité', this._entityPicker(['entity'], cfg.entity)));
    wrap.appendChild(this._row("Style de l'anneau", this._genericSelect(
      [['classic', 'Dégradé continu (progress ring)'], ['blocks', 'Blocs (LED façon montre)']],
      ringStyle,
      (v) => this._setPath(['style'], v),
    )));
    wrap.appendChild(this._twoCols(
      this._row('Minimum', this._numberInput(['min'], cfg.min ?? 0)),
      this._row('Maximum', this._numberInput(['max'], cfg.max ?? 100)),
    ));
    wrap.appendChild(this._row("Nom (vide = celui de l'entité)", this._textInput(['name'], cfg.name, 'ex : Tracker Toscane')));
    wrap.appendChild(this._row('Sous-titre', this._textInput(['subtitle'], cfg.subtitle, 'ex : Batterie GPS')));
    wrap.appendChild(this._row('Icône (vide = pictogramme batterie auto selon %)', this._textInput(['icon'], cfg.icon, 'mdi:battery')));
    wrap.appendChild(this._row('Paliers de couleur (valeur → couleur)', this._segmentsEditor()));

    wrap.appendChild(this._section('Apparence'));
    wrap.appendChild(this._twoCols(
      this._row("Taille de l'anneau (px)", this._numberInput(['size'], size)),
      this._row("Épaisseur de l'anneau (px)", this._numberInput(['stroke_width'], cfg.stroke_width ?? 8)),
    ));
    if (ringStyle === 'blocks') {
      wrap.appendChild(this._twoCols(
        this._row('Nombre de blocs', this._numberInput(['block_count'], cfg.block_count ?? 24)),
        this._row('Espace entre blocs (°)', this._numberInput(['block_gap_deg'], cfg.block_gap_deg ?? 4, 0.5)),
      ));
      wrap.appendChild(this._row('Style des blocs vides', this._genericSelect(
        [['grey', 'Grisé (couleur neutre)'], ['dimmed', "Éteint (couleur d'origine, en pâle)"]],
        cfg.empty_style ?? 'grey',
        (v) => this._setPath(['empty_style'], v),
      )));
      wrap.appendChild(this._row('Opacité des blocs vides (0 à 1)', this._numberInput(['empty_opacity'], cfg.empty_opacity ?? 0.35, 0.05)));
    }
    wrap.appendChild(this._twoCols(
      this._row('Taille du pourcentage (px)', this._numberInput(['value_font_size'], cfg.value_font_size ?? Math.round(size * 0.16))),
      this._row('Taille du pictogramme batterie (px)', this._numberInput(['icon_size'], cfg.icon_size ?? Math.round(size * 0.24))),
    ));
    wrap.appendChild(this._twoCols(
      this._row('Taille du texte : nom (px)', this._numberInput(['name_font_size'], cfg.name_font_size ?? 15)),
      this._row('Taille du texte : sous-titre (px)', this._numberInput(['subtitle_font_size'], cfg.subtitle_font_size ?? 13)),
    ));

    wrap.appendChild(this._section('Tri automatique dans la grille'));
    wrap.appendChild(this._twoCols(
      this._row('Activer le tri auto', this._checkbox(['auto_sort'], cfg.auto_sort ?? false)),
      this._row('Ordre', this._genericSelect(
        [['asc', 'Croissant (moins chargé en premier)'], ['desc', 'Décroissant (plus chargé en premier)']],
        cfg.sort_order || 'asc',
        (v) => this._setPath(['sort_order'], v),
      )),
    ));

    wrap.appendChild(this._section('Marqueur (icône MDI ou emoji, à côté du nom)'));
    wrap.appendChild(this._twoCols(
      this._row('Type', this._genericSelect(
        [['icon', 'Icône MDI'], ['text', 'Texte libre / emoji']],
        markerType,
        (v) => this._setPath(['marker', 'content_type'], v),
      )),
      this._row('Position', this._genericSelect(
        [['before', 'Avant le nom'], ['after', 'Après le nom']],
        marker.position || 'after',
        (v) => this._setPath(['marker', 'position'], v),
      )),
    ));
    if (markerType === 'text') {
      wrap.appendChild(this._row('Texte / emoji', this._textInput(['marker', 'content'], marker.content, 'ex : 🛰️')));
    } else {
      wrap.appendChild(this._row('Icône (mdi:...)', this._textInput(['marker', 'icon'], marker.icon, 'mdi:map-marker-radius')));
    }

    this.appendChild(wrap);
  }
}
customElements.define('battery-ring-gauge-editor', BatteryRingGaugeEditor);

})();

/* ===== battery-ring-gauge-responsive ===== */
(function(){
  // Garde anti-doublon : si une carte est deja declaree (anciennes ressources
  // encore actives), on ignore la 2e declaration au lieu de planter.
  const __ce = window.customElements;
  const customElements = {
    define: (n, c, o) => { if (!__ce.get(n)) __ce.define(n, c, o); },
    get: (n) => __ce.get(n),
    whenDefined: (n) => __ce.whenDefined(n)
  };
  const __cc = window.customCards = window.customCards || [];
  const __push = __cc.push.bind(__cc);

// ============================================================
// Jauge ronde batterie — mise en page adaptative + réglages
//
// Pourquoi ce module et pas une simple ressource CSS : les cartes HA
// sont rendues à l'intérieur d'un shadow DOM, que les feuilles de style
// globales du dashboard ne peuvent pas atteindre. Le style doit donc
// être injecté À L'INTÉRIEUR de la carte elle-même.
//
// Ce module ne modifie pas le fichier JS partagé des jauges : il se
// greffe dessus après coup (patch du rendu et de l'éditeur).
//
// Ce qu'il apporte :
//  - le bloc du nom ne peut plus être écrasé : s'il n'y a pas la place
//    à côté de l'anneau, il descend sur sa propre ligne ;
//  - en mode automatique, la carte DÉTECTE si le nom est réellement
//    passé à la ligne (au lieu de comparer la largeur à un seuil
//    arbitraire) et centre l'ensemble dans ce cas ;
//  - un réglage d'alignement ajouté à l'éditeur visuel pour forcer
//    l'un ou l'autre comportement.
// ============================================================

const RESPONSIVE_CSS = `
  .wrap {
    flex-wrap: wrap !important;
    overflow: hidden;
    row-gap: 6px;
  }
  .ring-wrap {
    flex: 0 0 auto;
  }
  .text-wrap {
    flex: 1 0 140px !important;
    min-width: 140px !important;
  }
  .name-row span,
  .subtitle {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  /* Tout centré : anneau sur une ligne, texte centré en dessous */
  battery-ring-gauge.brg-center .wrap {
    justify-content: center !important;
    text-align: center;
  }
  battery-ring-gauge.brg-center .text-wrap {
    flex: 1 0 100% !important;
    min-width: 0 !important;
  }
  battery-ring-gauge.brg-center .name-row {
    justify-content: center;
  }
`;

customElements.whenDefined('battery-ring-gauge').then(() => {
  const ctor = customElements.get('battery-ring-gauge');
  if (!ctor || ctor.__responsivePatched) return;
  ctor.__responsivePatched = true;

  const originalRender = ctor.prototype._render;
  ctor.prototype._render = function (...args) {
    originalRender.apply(this, args);

    // Le rendu d'origine ne réécrit tout le contenu qu'une seule fois
    // (il met ensuite à jour les éléments en place), donc le <style>
    // ajouté ici persiste.
    if (!this._responsiveStyleEl || !this._responsiveStyleEl.isConnected) {
      const styleEl = document.createElement('style');
      styleEl.textContent = RESPONSIVE_CSS;
      this.appendChild(styleEl);
      this._responsiveStyleEl = styleEl;
    }

    // Décide de l'alignement. En mode auto, on retire d'abord la classe
    // pour mesurer la disposition "naturelle" : si le bloc texte se
    // retrouve plus bas que l'anneau, c'est qu'il est passé à la ligne.
    const evaluateAlign = () => {
      this._alignRaf = null;
      const align = (this.config && this.config.layout_align) || 'auto';

      if (align === 'center') {
        this.classList.add('brg-center');
        return;
      }
      if (align === 'left') {
        this.classList.remove('brg-center');
        return;
      }

      const ring = this.querySelector('.ring-wrap');
      const text = this.querySelector('.text-wrap');
      if (!ring || !text) return;

      this.classList.remove('brg-center');
      const wrapped = text.offsetTop > ring.offsetTop + 2;
      if (wrapped) this.classList.add('brg-center');
    };

    const scheduleEvaluate = () => {
      if (this._alignRaf) return;
      this._alignRaf = requestAnimationFrame(evaluateAlign);
    };

    // Surveillance de la largeur réelle de la carte (une seule fois).
    if (!this._responsiveObserver && typeof ResizeObserver !== 'undefined') {
      this._responsiveObserver = new ResizeObserver(scheduleEvaluate);
      this._responsiveObserver.observe(this);
    }
    scheduleEvaluate();
  };
});

// ---- Ajout du réglage dans l'éditeur visuel de la carte ----
customElements.whenDefined('battery-ring-gauge-editor').then(() => {
  const editorCtor = customElements.get('battery-ring-gauge-editor');
  if (!editorCtor || editorCtor.__responsivePatched) return;
  editorCtor.__responsivePatched = true;

  const originalBuild = editorCtor.prototype._build;
  editorCtor.prototype._build = function (...args) {
    originalBuild.apply(this, args);

    const cfg = this._config || {};
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:0 4px 16px;';

    wrap.appendChild(this._section('Mise en page'));
    wrap.appendChild(this._row(
      'Alignement du nom',
      this._genericSelect(
        [
          ['auto', "Automatique (centré si le nom passe sous l'anneau)"],
          ['left', "Toujours à gauche"],
          ['center', "Toujours centré (nom sous l'anneau)"],
        ],
        cfg.layout_align || 'auto',
        (v) => this._setPath(['layout_align'], v),
      ),
    ));

    this.appendChild(wrap);
  };
});

})();

/* ===== jauge-aiguille-puissance ===== */
(function(){
  // Garde anti-doublon : si une carte est deja declaree (anciennes ressources
  // encore actives), on ignore la 2e declaration au lieu de planter.
  const __ce = window.customElements;
  const customElements = {
    define: (n, c, o) => { if (!__ce.get(n)) __ce.define(n, c, o); },
    get: (n) => __ce.get(n),
    whenDefined: (n) => __ce.whenDefined(n)
  };
  const __cc = window.customCards = window.customCards || [];
  const __push = __cc.push.bind(__cc);

// ============================================================
// Carte Lovelace personnalisée : jauge-aiguille-puissance
// Jauge à aiguille rétro (façon vieux compteur), cadran uni,
// balayage 270°, valeur affichée en watts (entiers) sur un
// petit compteur digital sous le centre du cadran.
// ============================================================

// Calcule un "pas" rond et lisible (1, 2, 5, 10, 20, 50, 100...) proche
// de la valeur demandée. Algorithme classique dit "nice numbers".
function niceNum(range, round) {
  if (!isFinite(range) || range <= 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

// Génère une liste de valeurs de graduation "rondes" comprises entre
// min et max, en visant approximativement targetCount valeurs.
function computeNiceTicks(min, max, targetCount) {
  const span = max - min;
  if (span <= 0) return [min, max];
  const roughRange = niceNum(span, false);
  const step = niceNum(roughRange / Math.max(1, targetCount - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    if (v >= min - 1e-9 && v <= max + 1e-9) {
      ticks.push(Math.round(v * 100) / 100);
    }
  }
  if (ticks.length < 2) return [min, max];
  return ticks;
}

// Polices "industrielles" proposées pour le titre, avec leur paramètre
// Google Fonts (nom de famille + graisses utiles).
const NAME_FONTS = {
  "": { label: "Police par défaut", google: null },
  Oswald: { label: "Oswald", google: "Oswald:wght@500;700" },
  "Bebas Neue": { label: "Bebas Neue", google: "Bebas+Neue" },
  Rajdhani: { label: "Rajdhani", google: "Rajdhani:wght@500;700" },
  Teko: { label: "Teko", google: "Teko:wght@500;700" },
  Aldrich: { label: "Aldrich", google: "Aldrich" },
  Michroma: { label: "Michroma", google: "Michroma" },
  Audiowide: { label: "Audiowide", google: "Audiowide" },
};

// Charge la feuille de style Google Fonts correspondante dans le document
// (une seule fois par police, partagée entre toutes les cartes de la page).
function ensureGoogleFont(family) {
  const entry = NAME_FONTS[family];
  if (!entry || !entry.google) return;
  const id = "gf-jauge-" + family.replace(/\s+/g, "-");
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${entry.google}&display=swap`;
  document.head.appendChild(link);
}

// Recherche récursive (en traversant les Shadow DOM) du marqueur de tri
// posé par une carte jauge-aiguille-puissance, où qu'elle soit imbriquée
// (les cartes HA sont encapsulées dans des wrappers avec leur propre
// Shadow DOM, ex. <hui-card>).
function findSortMarker(node, depth) {
  if (!node || depth > 6) return null;
  if (node.dataset && node.dataset.sortActive !== undefined) return node;
  if (node.shadowRoot) {
    const found = findSortMarker(node.shadowRoot, depth + 1);
    if (found) return found;
  }
  const kids = node.children;
  if (kids) {
    for (const k of kids) {
      const found = findSortMarker(k, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Assombrit une couleur hex d'un certain facteur (0-1), pour dériver la
// teinte des cannelures du cerclage à partir de la couleur choisie.
function darkenColor(hex, amount) {
  const clean = (hex || "#000000").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16) || 0;
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Valeurs par défaut, partagées entre la carte (rendu) et l'éditeur
// (pour que les champs affichent leur valeur d'origine, pas un blanc,
// tant que l'utilisateur ne les a pas explicitement modifiés).
const DEFAULT_CONFIG = {
  name: "",
  name_font: "",
  min: 0,
  max: 100,
  unit: "W",
  major_ticks: 6,
  face_color: "#f1e6c8",
  rim_color: "#c9720f",
  needle_color: "#c0362c",
  tick_label_radius: 56,
  minor_ticks_per_major: 1,
  digital_offset_x: 0,
  digital_offset_y: 60,
  digital_width: 60,
  digital_height: 24,
  digital_font_size: 18,
  digital_text_color: "#4caf50",
  digital_bg_color: "#1a1a1a",
  digital_show_bg: true,
  redline_enabled: true,
  redline_start_fraction: 0.8,
  redline_tick_count: 8,
  redline_color: "#e53935",
  needle_center_offset_y: 0,
  rest_peg_radius: 60,
  rest_peg_angle_offset: 0,
  digital_unit_offset_x: 36,
  digital_unit_offset_y: 60,
  digital_unit_font_size: 16,
  digital_unit_color: "#4caf50",
  center_icon: "",
  center_icon_offset_x: 0,
  center_icon_offset_y: -25,
  center_icon_size: 20,
  center_icon_color: "#3a2f1e",
  case_screws_enabled: true,
  case_screws_radius: 83,
  case_screws_size: 5,
  tick_outer_radius: 80,
  tick_inner_radius: 68,
  tick_label_font_size: 11,
  auto_sort: false,
};

class JaugeAiguillePuissance extends HTMLElement {
  // Angle de départ (aiguille au minimum) et amplitude totale du
  // balayage, en degrés. 0° = aiguille pointant vers le haut.
  static START_ANGLE = -135;
  static SWEEP = 270;

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Il faut définir une entité (entity) pour cette carte.");
    }
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._built = false;
  }

  getCardSize() {
    return 3;
  }

  set hass(hass) {
    this._hass = hass;
    const stateObj = hass.states[this.config.entity];
    if (!stateObj) {
      if (!this._built) this._buildCard(true);
      return;
    }
    if (!this._built) {
      this._buildCard(false);
      this._built = true;
    }
    this._updateValue(stateObj);
  }

  _buildCard(missingEntity) {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    const cfg = this.config;
    const cx = 100;
    const cy = 100;
    const faceR = 88;
    const tickOuterR = cfg.tick_outer_radius;
    const tickInnerR = cfg.tick_inner_radius;
    const labelR = cfg.tick_label_radius;
    // Centre de pivot de l'aiguille uniquement : décalé vers le bas par
    // rapport au centre visuel du cadran (cx, cy). Les graduations et les
    // chiffres, eux, restent toujours centrés sur (cx, cy).
    const gcy = cy + cfg.needle_center_offset_y;

    // --- Génération des graduations principales (valeurs rondes) ---
    let ticksSvg = "";
    const tickValues = computeNiceTicks(cfg.min, cfg.max, Math.max(2, cfg.major_ticks));

    const drawLine = (value, inner, outer, width, color) => {
      const frac = (value - cfg.min) / (cfg.max - cfg.min);
      if (frac < -1e-6 || frac > 1 + 1e-6) return "";
      const angleDeg = JaugeAiguillePuissance.START_ANGLE + frac * JaugeAiguillePuissance.SWEEP;
      const rad = (angleDeg * Math.PI) / 180;
      const x1 = cx + inner * Math.sin(rad);
      const y1 = cy - inner * Math.cos(rad);
      const x2 = cx + outer * Math.sin(rad);
      const y2 = cy - outer * Math.cos(rad);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color || "#3a2f1e"}" stroke-width="${width}" stroke-linecap="round"/>`;
    };

    // Début de la zone rouge (redline), en valeur, si activée
    const redlineStart = cfg.redline_enabled
      ? cfg.min + cfg.redline_start_fraction * (cfg.max - cfg.min)
      : null;

    // Graduations intermédiaires (sans chiffre) entre chaque paire de graduations principales
    // — on n'en dessine pas dans la zone rouge, qui a ses propres traits resserrés.
    const minorCount = Math.max(0, cfg.minor_ticks_per_major);
    for (let i = 0; i < tickValues.length - 1; i++) {
      const a = tickValues[i];
      const b = tickValues[i + 1];
      for (let k = 1; k <= minorCount; k++) {
        const v = a + (k * (b - a)) / (minorCount + 1);
        if (redlineStart !== null && v >= redlineStart - 1e-6) continue;
        ticksSvg += drawLine(v, tickOuterR - 6, tickOuterR, 1);
      }
    }

    // Zone rouge : traits resserrés d'une couleur distincte, en fin de course
    // (on saute les valeurs qui coïncident avec une graduation principale déjà
    // tracée plus bas, sinon les deux traits se superposent — notamment au max).
    // Longueur intermédiaire entre les petits traits noirs et les grandes graduations.
    const isNearMajorTick = (v) => tickValues.some((t) => Math.abs(t - v) < 1e-6);
    const redlineMinorInnerR = tickOuterR - (tickOuterR - tickInnerR) * 0.5;
    if (redlineStart !== null) {
      const rCount = Math.max(2, cfg.redline_tick_count);
      for (let k = 0; k <= rCount; k++) {
        const v = redlineStart + (k * (cfg.max - redlineStart)) / rCount;
        if (isNearMajorTick(v)) continue;
        ticksSvg += drawLine(v, redlineMinorInnerR, tickOuterR, 2, cfg.redline_color);
      }
    }

    for (const value of tickValues) {
      const frac = (value - cfg.min) / (cfg.max - cfg.min);
      const angleDeg = JaugeAiguillePuissance.START_ANGLE + frac * JaugeAiguillePuissance.SWEEP;
      const rad = (angleDeg * Math.PI) / 180;
      const lx = cx + labelR * Math.sin(rad);
      const ly = cy - labelR * Math.cos(rad);
      const isRedline = redlineStart !== null && value >= redlineStart - 1e-6;
      ticksSvg += drawLine(value, tickInnerR, tickOuterR, 2.5, isRedline ? cfg.redline_color : null);
      ticksSvg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" class="tick-label"${isRedline ? ` style="fill:${cfg.redline_color}"` : ""}>${Math.round(value)}</text>`;
    }

    // --- Cerclage strié (cannelures façon instrument aéronautique) ---
    let rimTicksSvg = "";
    const rimTickCount = 90;
    const ridgeColor = darkenColor(cfg.rim_color, 0.4);
    const rimInnerR = faceR + 5;
    const rimOuterR = faceR + 9.5;
    for (let i = 0; i < rimTickCount; i++) {
      const angleDeg = (360 / rimTickCount) * i;
      const rad = (angleDeg * Math.PI) / 180;
      const rx1 = cx + rimInnerR * Math.sin(rad);
      const ry1 = cy - rimInnerR * Math.cos(rad);
      const rx2 = cx + rimOuterR * Math.sin(rad);
      const ry2 = cy - rimOuterR * Math.cos(rad);
      rimTicksSvg += `<line x1="${rx1.toFixed(1)}" y1="${ry1.toFixed(1)}" x2="${rx2.toFixed(1)}" y2="${ry2.toFixed(1)}" stroke="${ridgeColor}" stroke-width="1.4"/>`;
    }

    // --- Vis de boîtier à tête plate, réparties à 120° sur le cerclage ---
    let caseScrewsSvg = "";
    if (cfg.case_screws_enabled) {
      const screwR = cfg.case_screws_radius;
      const screwSize = cfg.case_screws_size;
      const slotAngles = [12, -18, 35];
      [0, 120, 240].forEach((angleDeg, i) => {
        const rad = (angleDeg * Math.PI) / 180;
        const sx = cx + screwR * Math.sin(rad);
        const sy = cy - screwR * Math.cos(rad);
        caseScrewsSvg += `<g transform="translate(${sx.toFixed(1)},${sy.toFixed(1)}) rotate(${slotAngles[i]})">
          <circle r="${screwSize}" fill="url(#screwGrad)" stroke="#2a2a2a" stroke-width="0.5"/>
          <rect x="${(-screwSize * 0.64).toFixed(2)}" y="${(-screwSize * 0.12).toFixed(2)}" width="${(screwSize * 1.28).toFixed(2)}" height="${(screwSize * 0.24).toFixed(2)}" fill="#2a2a2a" rx="0.3"/>
        </g>`;
      });
    }

    // --- Petit plot de butée (façon laiton), à l'endroit où l'aiguille
    // repose au minimum. Purement décoratif, ne bouge pas avec l'aiguille.
    const restRad = ((JaugeAiguillePuissance.START_ANGLE + cfg.rest_peg_angle_offset) * Math.PI) / 180;
    const pegRadius = cfg.rest_peg_radius;
    const pegX = cx + pegRadius * Math.sin(restRad);
    const pegY = gcy - pegRadius * Math.cos(restRad);

    ensureGoogleFont(cfg.name_font);
    const nameStyle = cfg.name_font ? ` style="font-family:'${cfg.name_font}', sans-serif; letter-spacing: 0.5px;"` : "";

    // Points de l'aiguille (triangle) et de son ombre, décalée légèrement.
    // Pivote autour du centre fonctionnel (gcy), un peu plus longue qu'avant.
    const needleHalfWidth = 3.5;
    const needleTipInset = 13;
    const needlePoints = `${cx - needleHalfWidth},${gcy + 15} ${cx + needleHalfWidth},${gcy + 15} ${cx},${gcy - faceR + needleTipInset}`;
    const shadowOffset = 1.6;
    const needleShadowPoints = `${cx - needleHalfWidth + shadowOffset},${gcy + 15 + shadowOffset} ${cx + needleHalfWidth + shadowOffset},${gcy + 15 + shadowOffset} ${cx + shadowOffset},${gcy - faceR + needleTipInset + shadowOffset}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
        }
        .name {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color, #e1e1e1);
          margin-bottom: 4px;
          text-align: center;
        }
        svg {
          display: block;
          width: 100%;
          height: auto;
          max-width: 260px;
          margin: 0 auto;
        }
        .tick-label {
          font-size: ${cfg.tick_label_font_size}px;
          font-family: sans-serif;
          fill: #3a2f1e;
        }
        .needle-group {
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .digital-value {
          font-family: "Courier New", monospace;
          font-weight: bold;
          text-anchor: middle;
          dominant-baseline: central;
        }
        .warn {
          font-size: 12px;
          color: var(--error-color, #db4437);
          text-align: center;
        }
      </style>
      <div class="wrap">
        ${cfg.name ? `<div class="name"${nameStyle}>${cfg.name}</div>` : ""}
        <svg viewBox="0 0 200 200" width="200" height="200">
          <defs>
            <clipPath id="faceClip">
              <circle cx="${cx}" cy="${cy}" r="${faceR}"/>
            </clipPath>
            <clipPath id="bezelClip">
              <circle cx="${cx}" cy="${cy}" r="${faceR + 5}"/>
            </clipPath>
            <linearGradient id="bezelGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="18%" stop-color="#8a8a8a"/>
              <stop offset="35%" stop-color="#e8e8e8"/>
              <stop offset="55%" stop-color="#6e6e6e"/>
              <stop offset="75%" stop-color="#cfcfcf"/>
              <stop offset="100%" stop-color="#3a3a3a"/>
            </linearGradient>
            <radialGradient id="screwGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#e9e9e9"/>
              <stop offset="55%" stop-color="#9a9a9a"/>
              <stop offset="100%" stop-color="#454545"/>
            </radialGradient>
            <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32"/>
              <stop offset="50%" stop-color="#ffffff" stop-opacity="0.09"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </linearGradient>
            <radialGradient id="glintGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </radialGradient>
            <filter id="agedPaper" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise"/>
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.18  0 0 0 0.55 0"/>
            </filter>
            <radialGradient id="agedVignette" cx="50%" cy="50%" r="72%">
              <stop offset="50%" stop-color="#6b4a23" stop-opacity="0"/>
              <stop offset="100%" stop-color="#4a2f12" stop-opacity="0.5"/>
            </radialGradient>
            <radialGradient id="lampGlow" cx="50%" cy="100%" r="65%">
              <stop offset="0%" stop-color="#ffd98a" stop-opacity="0.85"/>
              <stop offset="45%" stop-color="#ffb347" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#ffb347" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="capGrad" cx="35%" cy="25%" r="75%">
              <stop offset="0%" stop-color="#4a4a4a"/>
              <stop offset="55%" stop-color="#1f1f1f"/>
              <stop offset="100%" stop-color="#000000"/>
            </radialGradient>
            <radialGradient id="bulbGlow" cx="50%" cy="65%" r="55%">
              <stop offset="0%" stop-color="#ffe6ad" stop-opacity="0.85"/>
              <stop offset="35%" stop-color="#ffcf78" stop-opacity="0.55"/>
              <stop offset="70%" stop-color="#ffb347" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#ffb347" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="pegGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#f3dd9a"/>
              <stop offset="55%" stop-color="#c9a227"/>
              <stop offset="100%" stop-color="#7a611a"/>
            </radialGradient>
          </defs>
          <circle cx="${cx}" cy="${cy}" r="${faceR + 10}" fill="${cfg.rim_color}"/>
          ${rimTicksSvg}
          <circle cx="${cx}" cy="${cy}" r="${faceR + 5}" fill="url(#bezelGrad)" stroke="#2a2a2a" stroke-width="0.5"/>
          <circle cx="${cx}" cy="${cy}" r="${faceR}" fill="${cfg.face_color}" stroke="#3a2f1e" stroke-width="1"/>
          <circle cx="${cx}" cy="${cy}" r="${faceR}" filter="url(#agedPaper)" style="mix-blend-mode: multiply;"/>
          <circle cx="${cx}" cy="${cy}" r="${faceR}" fill="url(#agedVignette)"/>
          ${caseScrewsSvg}
          <g clip-path="url(#faceClip)">
            <ellipse cx="${cx}" cy="${cy + faceR - 8}" rx="70" ry="52" fill="url(#lampGlow)" style="mix-blend-mode: screen;"/>
          </g>
          ${ticksSvg}
          <circle cx="${pegX.toFixed(1)}" cy="${pegY.toFixed(1)}" r="4" fill="url(#pegGrad)" stroke="#5c4a12" stroke-width="0.5"/>
          ${cfg.digital_show_bg ? `<rect x="${(cx + cfg.digital_offset_x - cfg.digital_width / 2).toFixed(1)}" y="${(cy + cfg.digital_offset_y - cfg.digital_height / 2).toFixed(1)}" width="${cfg.digital_width}" height="${cfg.digital_height}" rx="4" fill="${cfg.digital_bg_color}"/>` : ""}
          <text x="${cx + cfg.digital_offset_x}" y="${cy + cfg.digital_offset_y}" id="digital" class="digital-value" style="font-size:${cfg.digital_font_size}px; fill:${cfg.digital_text_color};">--</text>
          <text x="${cx + cfg.digital_unit_offset_x}" y="${cy + cfg.digital_unit_offset_y}" id="digital-unit" class="digital-value" style="font-size:${cfg.digital_unit_font_size}px; fill:${cfg.digital_unit_color};">${cfg.unit}</text>
          ${cfg.center_icon ? (cfg.center_icon.startsWith("mdi:")
            ? `<foreignObject x="${(cx + cfg.center_icon_offset_x - cfg.center_icon_size / 2).toFixed(1)}" y="${(cy + cfg.center_icon_offset_y - cfg.center_icon_size / 2).toFixed(1)}" width="${cfg.center_icon_size}" height="${cfg.center_icon_size}"><ha-icon icon="${cfg.center_icon}" style="--mdc-icon-size:${cfg.center_icon_size}px; color:${cfg.center_icon_color};"></ha-icon></foreignObject>`
            : `<text x="${cx + cfg.center_icon_offset_x}" y="${cy + cfg.center_icon_offset_y}" text-anchor="middle" dominant-baseline="central" style="font-size:${cfg.center_icon_size}px;">${cfg.center_icon}</text>`
          ) : ""}
          <g class="needle-group" id="needle" style="transform-origin: ${cx}px ${gcy}px;">
            <polygon points="${needleShadowPoints}" fill="#000000" opacity="0.28"/>
            <polygon points="${needlePoints}" fill="${cfg.needle_color}"/>
          </g>
          <circle cx="${cx}" cy="${gcy}" r="9" fill="url(#screwGrad)" stroke="#333333" stroke-width="0.5"/>
          <rect x="${cx - 1}" y="${gcy - 6}" width="2" height="12" fill="#333333" rx="0.5"/>
          <rect x="${cx - 6}" y="${gcy - 1}" width="12" height="2" fill="#333333" rx="0.5"/>
          <g clip-path="url(#faceClip)">
            <ellipse cx="${cx - 32}" cy="${cy - 38}" rx="78" ry="55" fill="url(#glassGrad)" transform="rotate(-18 ${cx - 32} ${cy - 38})"/>
            <ellipse cx="${cx - 48}" cy="${cy - 55}" rx="18" ry="10" fill="url(#glintGrad)" transform="rotate(-18 ${cx - 48} ${cy - 55})"/>
          </g>
          <g clip-path="url(#faceClip)">
            <ellipse cx="${cx}" cy="${cy + faceR - 10}" rx="34" ry="32" fill="url(#bulbGlow)" style="mix-blend-mode: screen;"/>
          </g>
          <ellipse cx="${cx}" cy="${cy + faceR - 6}" rx="9" ry="6" fill="url(#capGrad)" stroke="#000000" stroke-width="0.5"/>
        </svg>
        ${missingEntity ? `<div class="warn">Entité introuvable : ${cfg.entity}</div>` : ""}
      </div>
    `;

    this._needleEl = this.shadowRoot.getElementById("needle");
    this._digitalEl = this.shadowRoot.getElementById("digital");
  }

  _updateValue(stateObj) {
    const cfg = this.config;
    let value = parseFloat(stateObj.state);
    if (isNaN(value)) value = cfg.min;

    const clamped = Math.max(cfg.min, Math.min(cfg.max, value));
    const frac = (clamped - cfg.min) / (cfg.max - cfg.min);
    const angle = JaugeAiguillePuissance.START_ANGLE + frac * JaugeAiguillePuissance.SWEEP;

    if (this._needleEl) {
      this._needleEl.style.transform = `rotate(${angle}deg)`;
    }
    if (this._digitalEl) {
      this._digitalEl.textContent = `${Math.round(value)}`;
    }

    // Marqueur utilisé par le tri automatique : "actif" si la valeur
    // affichée n'est pas nulle.
    this.dataset.sortActive = Math.round(value) !== 0 ? "1" : "0";
    if (cfg.auto_sort) {
      this._applyAutoSort();
    }
  }

  // Remonte les parents (en traversant les Shadow DOM le cas échéant)
  // jusqu'à trouver le conteneur en grille (display: grid).
  _findGridContainer() {
    let el = this;
    let depth = 0;
    while (depth < 15) {
      if (el.parentElement) {
        el = el.parentElement;
      } else if (el.getRootNode && el.getRootNode() instanceof ShadowRoot) {
        el = el.getRootNode().host;
      } else {
        break;
      }
      depth++;
      if (el instanceof Element && getComputedStyle(el).display === "grid") {
        return el;
      }
    }
    return null;
  }

  // Trie les cartes voisines de la même grille : celles avec une valeur
  // active (≠ 0) en premier, celles à zéro en dernier. Les cartes qui ne
  // portent pas notre marqueur (pas des jauges de ce type) restent épinglées
  // avant les autres, dans leur ordre d'origine.
  _applyAutoSort() {
    const grid = this._findGridContainer();
    if (!grid) return;
    const children = Array.from(grid.children);
    children.forEach((child, i) => {
      const marker = findSortMarker(child, 0);
      if (marker) {
        const active = marker.dataset.sortActive === "1";
        child.style.order = active ? i : 1000 + i;
      } else {
        child.style.order = i - 2000;
      }
    });
  }

  static getStubConfig() {
    return {
      entity: "",
      name: "",
      min: 0,
      max: 100,
      unit: "W",
    };
  }

  static getConfigElement() {
    return document.createElement("jauge-aiguille-puissance-editor");
  }
}

const NUMBER_GROUPS = [
  {
    title: "Cadran",
    fields: [
      { key: "min", label: "Valeur minimale", step: 1 },
      { key: "max", label: "Valeur maximale", step: 1 },
      { key: "major_ticks", label: "Nombre de graduations", step: 1, min: 2, max: 20 },
      { key: "minor_ticks_per_major", label: "Graduations intermédiaires (par intervalle)", step: 1, min: 0, max: 4 },
      { key: "tick_label_radius", label: "Rayon des chiffres de graduation", step: 1, min: 10, max: 80 },
      { key: "tick_label_font_size", label: "Chiffres de graduation : taille", step: 1, min: 6, max: 24 },
      { key: "tick_outer_radius", label: "Graduations : rayon extérieur", step: 1, min: 40, max: 90 },
      { key: "tick_inner_radius", label: "Graduations : rayon intérieur", step: 1, min: 30, max: 85 },
      { key: "redline_start_fraction", label: "Zone rouge : début (fraction de la plage)", step: 0.05, min: 0.1, max: 0.95 },
      { key: "redline_tick_count", label: "Zone rouge : nombre de traits", step: 1, min: 2, max: 20 },
      { key: "case_screws_radius", label: "Vis de boîtier : distance au centre", step: 1, min: 20, max: 97 },
      { key: "case_screws_size", label: "Vis de boîtier : taille", step: 0.5, min: 2, max: 10 },
    ],
  },
  {
    title: "Aiguille",
    fields: [
      { key: "needle_center_offset_y", label: "Pivot : décalage vers le bas", step: 1, min: -30, max: 30 },
      { key: "rest_peg_radius", label: "Plot de butée : distance au pivot", step: 1, min: 20, max: 88 },
      { key: "rest_peg_angle_offset", label: "Plot de butée : ajustement d'angle", step: 1, min: -20, max: 20 },
    ],
  },
  {
    title: "Compteur digital",
    fields: [
      { key: "digital_offset_x", label: "Chiffre : décalage horizontal", step: 1 },
      { key: "digital_offset_y", label: "Chiffre : décalage vertical", step: 1 },
      { key: "digital_font_size", label: "Chiffre : taille du texte", step: 1, min: 8, max: 40 },
      { key: "digital_width", label: "Fond : largeur", step: 1, min: 20, max: 160 },
      { key: "digital_height", label: "Fond : hauteur", step: 1, min: 12, max: 60 },
      { key: "digital_unit_offset_x", label: "Unité : décalage horizontal", step: 1 },
      { key: "digital_unit_offset_y", label: "Unité : décalage vertical", step: 1 },
      { key: "digital_unit_font_size", label: "Unité : taille du texte", step: 1, min: 6, max: 40 },
    ],
  },
  {
    title: "Icône centrale",
    fields: [
      { key: "center_icon_offset_x", label: "Décalage horizontal", step: 1 },
      { key: "center_icon_offset_y", label: "Décalage vertical", step: 1 },
      { key: "center_icon_size", label: "Taille", step: 1, min: 8, max: 60 },
    ],
  },
];

const COLOR_FIELDS = [
  { key: "face_color", label: "Couleur du cadran", default: "#f1e6c8" },
  { key: "rim_color", label: "Couleur du cerclage", default: "#c9720f" },
  { key: "needle_color", label: "Couleur de l'aiguille", default: "#c0362c" },
  { key: "digital_text_color", label: "Compteur digital : couleur du texte", default: "#4caf50" },
  { key: "digital_bg_color", label: "Compteur digital : couleur de fond", default: "#1a1a1a" },
  { key: "redline_color", label: "Couleur de la zone rouge", default: "#e53935" },
  { key: "center_icon_color", label: "Couleur de l'icône centrale", default: "#3a2f1e" },
  { key: "digital_unit_color", label: "Couleur de l'unité (W)", default: "#4caf50" },
];

class JaugeAiguillePuissanceEditor extends HTMLElement {
  setConfig(config) {
    // Si ce changement de config provient de notre propre éditeur (on vient
    // de dispatcher config-changed), on met juste à jour l'état interne sans
    // reconstruire tout le DOM — sinon ça ferme les sélecteurs de couleur
    // natifs (et tout élément avec un menu ouvert) à chaque interaction.
    if (this._skipNextRender) {
      this._skipNextRender = false;
      this._config = { ...config };
      return;
    }
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._render();
  }

  _emitChange() {
    this._skipNextRender = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _schema() {
    return [
      { name: "entity", required: true, selector: { entity: { domain: "sensor" } } },
      { name: "name", selector: { text: {} } },
      {
        name: "name_font",
        selector: {
          select: {
            mode: "dropdown",
            options: Object.entries(NAME_FONTS).map(([value, { label }]) => ({ value, label })),
          },
        },
      },
      { name: "unit", selector: { text: {} } },
      { name: "center_icon", selector: { text: {} } },
      { name: "digital_show_bg", selector: { boolean: {} } },
      { name: "redline_enabled", selector: { boolean: {} } },
      { name: "case_screws_enabled", selector: { boolean: {} } },
      { name: "auto_sort", selector: { boolean: {} } },
    ];
  }

  _render() {
    this.innerHTML = "";

    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = this._schema();
    form.computeLabel = (s) => {
      const labels = {
        entity: "Entité",
        name: "Nom (optionnel)",
        name_font: "Police du titre",
        unit: "Unité affichée",
        center_icon: "Icône centrale (emoji ou mdi:nom-icone, vide = rien)",
        digital_show_bg: "Compteur digital : afficher le fond",
        redline_enabled: "Zone rouge en fin de course",
        case_screws_enabled: "Vis de boîtier (3, à 120°)",
        auto_sort: "Tri auto : actifs en premier",
      };
      return labels[s.name] || s.name;
    };
    form.addEventListener("value-changed", (ev) => {
      this._config = { ...ev.detail.value };
      this._emitChange();
    });
    this.appendChild(form);
    this._form = form;

    // --- Sections de réglages numériques, groupées par thème ---
    for (const group of NUMBER_GROUPS) {
      const numberSection = document.createElement("div");
      numberSection.style.cssText = "margin-top: 16px; display: flex; flex-direction: column; gap: 12px;";

      const numberTitle = document.createElement("div");
      numberTitle.textContent = group.title;
      numberTitle.style.cssText = "font-size: 13px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--primary-text-color, #e1e1e1); border-bottom: 2px solid var(--divider-color, #444); padding-bottom: 6px; margin-bottom: 2px;";
      numberSection.appendChild(numberTitle);

      for (const { key, label, step, min, max } of group.fields) {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 12px;";

        const rowLabel = document.createElement("span");
        rowLabel.textContent = label;
        rowLabel.style.cssText = "font-size: 14px; color: var(--primary-text-color, #e1e1e1);";

        const input = document.createElement("input");
        input.type = "number";
        input.step = step;
        if (min !== undefined) input.min = min;
        if (max !== undefined) input.max = max;
        input.value = this._config[key];
        input.style.cssText = "width: 90px; padding: 8px; font-size: 14px; border: 1px solid var(--divider-color, #444); border-radius: 6px; background: var(--card-background-color, #2a2a2a); color: var(--primary-text-color, #e1e1e1);";
        input.addEventListener("change", (ev) => {
          const num = parseFloat(ev.target.value);
          if (!isNaN(num)) {
            this._config = { ...this._config, [key]: num };
            this._emitChange();
          }
        });

        row.appendChild(rowLabel);
        row.appendChild(input);
        numberSection.appendChild(row);
      }

      this.appendChild(numberSection);
    }

    // --- Section couleurs : pastilles compactes (input color natif) ---
    const colorSection = document.createElement("div");
    colorSection.style.cssText = "margin-top: 16px; display: flex; flex-direction: column; gap: 12px;";

    const title = document.createElement("div");
    title.textContent = "Couleurs";
    title.style.cssText = "font-size: 13px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--primary-text-color, #e1e1e1); border-bottom: 2px solid var(--divider-color, #444); padding-bottom: 6px; margin-bottom: 2px;";
    colorSection.appendChild(title);

    for (const { key, label, default: defaultValue } of COLOR_FIELDS) {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 12px;";

      const rowLabel = document.createElement("span");
      rowLabel.textContent = label;
      rowLabel.style.cssText = "font-size: 14px; color: var(--primary-text-color, #e1e1e1);";

      const swatch = document.createElement("input");
      swatch.type = "color";
      swatch.value = this._config[key] || defaultValue;
      swatch.style.cssText = "width: 40px; height: 32px; padding: 0; border: 1px solid var(--divider-color, #444); border-radius: 6px; cursor: pointer; background: none;";
      swatch.addEventListener("input", (ev) => {
        this._config = { ...this._config, [key]: ev.target.value };
        this._emitChange();
      });

      row.appendChild(rowLabel);
      row.appendChild(swatch);
      colorSection.appendChild(row);
    }

    this.appendChild(colorSection);
  }
}

customElements.define("jauge-aiguille-puissance", JaugeAiguillePuissance);
customElements.define("jauge-aiguille-puissance-editor", JaugeAiguillePuissanceEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "jauge-aiguille-puissance",
  name: "Jauge aiguille puissance",
  description: "Jauge à aiguille rétro pour afficher une puissance en watts (cadran uni, balayage 270°, compteur digital).",
});

})();

/* ===== jauge-thermo-hygro ===== */
(function(){
  // Garde anti-doublon : si une carte est deja declaree (anciennes ressources
  // encore actives), on ignore la 2e declaration au lieu de planter.
  const __ce = window.customElements;
  const customElements = {
    define: (n, c, o) => { if (!__ce.get(n)) __ce.define(n, c, o); },
    get: (n) => __ce.get(n),
    whenDefined: (n) => __ce.whenDefined(n)
  };
  const __cc = window.customCards = window.customCards || [];
  const __push = __cc.push.bind(__cc);

const FONTS = ["Jost","Barlow Condensed","Cormorant Garamond","Oswald","Rajdhani","Aldrich","Josefin Sans"];
let _fontsLoaded = false;
function loadFonts(){
  if(_fontsLoaded) return; _fontsLoaded = true;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&family=Barlow+Condensed:wght@300;400;500&family=Cormorant+Garamond:wght@300;400;500&family=Oswald:wght@200;300;400&family=Rajdhani:wght@300;400;500&family=Aldrich&family=Josefin+Sans:wght@200;300;400&display=swap";
  document.head.appendChild(l);
}

const DEFAULT_CONFIG = {
  entity: "",
  humidity_entity: "",
  name: "",
  font: "Jost",
  unit: "°C",
  decimals: 1,

  t_min: -30,
  t_max: 50,
  sweep: 240,
  major_ticks: 8,
  minor_ticks_per_major: 4,
  tick_outer_radius: 86,
  tick_major_inner_radius: 76,
  tick_minor_inner_radius: 81,
  tick_label_radius: 62,
  tick_label_font_size: 10.5,

  zones_enabled: true,
  zone_radius: 71,
  zone_width: 2.6,
  cold_end_fraction: 0.42,
  hot_start_fraction: 0.68,
  cold_color: "#5ec8e8",
  hot_color: "#e88aa8",

  sub_enabled: true,
  sub_style: "round",
  sub_arc_width: 2.4,
  sub_arc_show: true,
  sub_center_y: 150,
  sub_offset_x: 0,
  sub_radius: 33,
  sub_radius_y: 0,
  sub_sweep: 240,
  sub_min: 0,
  sub_max: 100,
  sub_major_step: 20,
  sub_label_font_size: 6.6,
  sub_title: "HUMIDITY",
  sub_title_font_size: 6.4,
  sub_title_offset_x: 0,
  sub_title_offset_y: 0,
  sub_value_font_size: 9,
  sub_value_offset_x: 0,
  sub_value_offset_y: 22,

  name_offset_x: 0,
  name_offset_y: 52,
  name_font_size: 9,
  digital_offset_x: 0,
  digital_offset_y: 76,
  digital_font_size: 17,
  digital_show: true,

  needle_length: 80,
  needle_tail: 16,
  needle_moon: true,
  needle_moon_size: 5.5,
  needle_moon_offset: 0,
  needle_moon_thickness: 0.55,
  needle_moon_angle: 0,
  sub_needle_moon: false,

  case_screws_enabled: true,
  case_screws_radius: 84,
  case_screws_size: 3.2,
  case_screws_start_angle: 0,

  lamp_intensity: 0.55,
  knurling_enabled: true,
  card_padding: "4px",
  card_transparent: false,

  card_title: "",
  card_title_position: "above",
  card_title_font_size: 16,
  card_title_margin: 4,
  card_title_color: "#d8d8d4",

  face_color: "#fbfbf8",
  rim_color: "#c9c9c9",
  tick_color: "#2a2a2a",
  label_color: "#1c1c1c",
  needle_color: "#1f1f1f",
  sub_needle_color: "#242424",
  text_color: "#1c1c1c",
  digital_color: "#1c1c1c",
  sub_value_color: "#1c1c1c",
  name_color: "#6a6a66",
  muted_color: "#6a6a66",
  lamp_color: "#ffd9a0",

  grid_options: { columns: 6, rows: "auto" },
};

const NUM_FIELDS = [
  ["Cadran", [
    ["t_min","Température min"],["t_max","Température max"],["sweep","Balayage (°)"],
    ["major_ticks","Graduations principales"],["minor_ticks_per_major","Intermédiaires / intervalle"],
    ["tick_outer_radius","Rayon extérieur graduations"],["tick_major_inner_radius","Rayon intérieur (principales)"],
    ["tick_minor_inner_radius","Rayon intérieur (intermédiaires)"],
    ["tick_label_radius","Rayon des chiffres"],["tick_label_font_size","Taille des chiffres"],
  ]],
  ["Arcs froid / chaud", [
    ["zone_radius","Rayon des arcs"],["zone_width","Épaisseur des arcs"],
    ["cold_end_fraction","Fin arc froid (0-1)"],["hot_start_fraction","Début arc chaud (0-1)"],
  ]],
  ["Sous-cadran humidité", [
    ["sub_offset_x","Décalage horizontal"],["sub_center_y","Position verticale"],
    ["sub_radius","Rayon horizontal"],["sub_radius_y","Rayon vertical (0 = idem)"],
    ["sub_sweep","Balayage (°)"],
    ["sub_arc_width","Demi-jauge : épaisseur du trait"],
    ["sub_min","Min"],["sub_max","Max"],["sub_major_step","Pas des graduations"],
    ["sub_label_font_size","Taille des chiffres"],
    ["sub_title_font_size","Libellé : taille"],
    ["sub_title_offset_x","Libellé : décalage horizontal"],["sub_title_offset_y","Libellé : décalage vertical"],
    ["sub_value_font_size","Valeur : taille"],
    ["sub_value_offset_x","Valeur : décalage horizontal"],["sub_value_offset_y","Valeur : décalage vertical"],
  ]],
  ["Textes", [
    ["name_offset_x","Nom : décalage horizontal"],["name_offset_y","Nom : position verticale"],
    ["name_font_size","Taille du nom"],
    ["digital_offset_x","Numérique : décalage horizontal"],["digital_offset_y","Numérique : position verticale"],
    ["digital_font_size","Taille du numérique"],
    ["decimals","Décimales"],
  ]],
  ["Aiguilles", [
    ["needle_length","Longueur aiguille"],["needle_tail","Longueur du contrepoids"],
    ["needle_moon_size","Croissant : taille"],["needle_moon_offset","Croissant : éloignement du centre"],
    ["needle_moon_thickness","Croissant : épaisseur (0-1)"],
    ["needle_moon_angle","Croissant : orientation (°)"],
  ]],
  ["Titre de la carte", [
    ["card_title_font_size","Taille du texte (px)"],
    ["card_title_margin","Marge titre / jauge (px, peut être négatif)"],
  ]],
  ["Boîtier", [
    ["case_screws_radius","Distance des vis au centre"],["case_screws_size","Taille des vis"],
    ["case_screws_start_angle","Angle de départ des vis (°)"],["lamp_intensity","Halo lumineux (0-1)"],
  ]],
];

const COLOR_FIELDS = [
  ["face_color","Cadran"],["rim_color","Cerclage"],["tick_color","Graduations"],
  ["label_color","Chiffres"],["needle_color","Aiguille température"],["sub_needle_color","Aiguille humidité"],
  ["digital_color","Valeur température"],["sub_value_color","Valeur humidité"],
  ["name_color","Nom de la pièce"],["muted_color","Libellé du sous-cadran"],
  ["text_color","Texte principal (secours)"],
  ["card_title_color","Titre de la carte"],
  ["cold_color","Arc froid"],["hot_color","Arc chaud"],["lamp_color","Lumière"],
];

function pt(cx, cy, r, a){ const rad = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; }
function f(n){ return Number(n).toFixed(2); }
function arcPath(cx, cy, r, a0, a1){
  const [x0,y0] = pt(cx,cy,r,a0), [x1,y1] = pt(cx,cy,r,a1);
  return `M ${f(x0)} ${f(y0)} A ${r} ${r} 0 ${Math.abs(a1-a0) > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}
function ept(cx, cy, rx, ry, a){
  const rad = (a - 90) * Math.PI / 180;
  return [cx + rx * Math.cos(rad), cy + ry * Math.sin(rad)];
}
function earcPath(cx, cy, rx, ry, a0, a1){
  const [x0,y0] = ept(cx,cy,rx,ry,a0), [x1,y1] = ept(cx,cy,rx,ry,a1);
  return `M ${f(x0)} ${f(y0)} A ${f(rx)} ${f(ry)} 0 ${Math.abs(a1-a0) > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}
function moonParts(id, cy, r, thickness, angleDeg, color){
  // Vrai croissant : on DÉCOUPE un cercle dans un autre via un masque.
  // (Une règle evenodd sur deux cercles garderait les DEUX parties non
  // communes, c'est-à-dire deux croissants dos à dos.)
  // Le cercle qui découpe est décalé de `d` ; l'épaisseur maximale du
  // croissant vaut exactement ce décalage, et les pointes sont franches.
  const d = Math.max(0.05, Math.min(0.95, Number(thickness))) * r;
  const a = (Number(angleDeg) || 0) * Math.PI / 180;
  const ox = d * Math.sin(a), oy = d * Math.cos(a);
  const pad = r + d + 2;
  return {
    def: `<mask id="${id}" maskUnits="userSpaceOnUse">`
       + `<rect x="${f(-pad)}" y="${f(cy-pad)}" width="${f(2*pad)}" height="${f(2*pad)}" fill="white"/>`
       + `<circle cx="${f(ox)}" cy="${f(cy+oy)}" r="${f(r)}" fill="black"/></mask>`,
    shape: `<circle cx="0" cy="${f(cy)}" r="${f(r)}" fill="${color}" mask="url(#${id})"/>`,
  };
}
function niceStep(range, target){
  const raw = range / Math.max(1, target);
  const p = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
  const n = raw / p;
  let m = 1; if(n > 5) m = 10; else if(n > 2) m = 5; else if(n > 1) m = 2;
  return m * p;
}
function shade(hex, amt){
  const h = String(hex || "#999999").replace("#","");
  const v = h.length === 3 ? h.split("").map(c=>c+c).join("") : h;
  const n = parseInt(v, 16);
  const cl = x => Math.max(0, Math.min(255, Math.round(x)));
  const r = cl(((n>>16)&255) * amt), g = cl(((n>>8)&255) * amt), b = cl((n&255) * amt);
  return "#" + [r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

const CX = 110, CY = 104;

class JaugeThermoHygro extends HTMLElement {
  static getConfigElement(){ return document.createElement("jauge-thermo-hygro-editor"); }
  static getStubConfig(){
    return { type: "custom:jauge-thermo-hygro", entity: "", humidity_entity: "", name: "Température" };
  }
  setConfig(config){
    if(!config) throw new Error("Configuration manquante");
    this._config = Object.assign({}, DEFAULT_CONFIG, config);
    loadFonts();
    this._render();
  }
  set hass(hass){ this._hass = hass; this._render(); }
  getCardSize(){ return 5; }

  _num(entityId){
    if(!this._hass || !entityId) return null;
    const st = this._hass.states[entityId];
    if(!st) return null;
    const v = parseFloat(st.state);
    return isNaN(v) ? null : v;
  }

  _render(){
    if(!this._config) return;
    const c = this._config;
    const temp = this._num(c.entity);
    const hum = this._num(c.humidity_entity);

    let name = c.name;
    if(!name && this._hass && c.entity && this._hass.states[c.entity]){
      name = this._hass.states[c.entity].attributes.friendly_name || "";
    }

    const tmin = Number(c.t_min), tmax = Number(c.t_max);
    const A1 = Number(c.sweep) / 2, A0 = -A1;
    const span = (tmax - tmin) || 1;
    const ang = v => A0 + (Math.min(tmax, Math.max(tmin, v)) - tmin) / span * (A1 - A0);

    const step = niceStep(span, Number(c.major_ticks));
    const first = Math.ceil(tmin / step) * step;
    const sub = Math.max(1, Number(c.minor_ticks_per_major));

    let ticks = "", labels = "";
    const minorAt = a => {
      const [x0,y0] = pt(CX,CY,c.tick_outer_radius,a), [x1,y1] = pt(CX,CY,c.tick_minor_inner_radius,a);
      ticks += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${shade(c.tick_color,1.7)}" stroke-width="0.8" stroke-linecap="round"/>`;
    };
    for(let v = first; v <= tmax + 1e-6; v += step){
      const a = ang(v);
      const [x0,y0] = pt(CX,CY,c.tick_outer_radius,a), [x1,y1] = pt(CX,CY,c.tick_major_inner_radius,a);
      ticks += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${c.tick_color}" stroke-width="1.6" stroke-linecap="round"/>`;
      const [lx,ly] = pt(CX,CY,c.tick_label_radius,a);
      labels += `<text x="${f(lx)}" y="${f(ly + Number(c.tick_label_font_size)*0.34)}" text-anchor="middle" font-family="${c.font}" font-size="${c.tick_label_font_size}" font-weight="300" fill="${c.label_color}">${Math.round(v)}</text>`;
      for(let k = 1; k < sub; k++){ const vv = v + step * k / sub; if(vv <= tmax + 1e-6) minorAt(ang(vv)); }
    }
    if(first > tmin){ for(let k = 1; k < sub; k++){ const vv = tmin + (first - tmin) * k / sub; if(vv > tmin) minorAt(ang(vv)); } }

    let zones = "";
    if(c.zones_enabled){
      const ce = ang(tmin + span * Number(c.cold_end_fraction));
      const hs = ang(tmin + span * Number(c.hot_start_fraction));
      zones = `<path d="${arcPath(CX,CY,c.zone_radius,A0,ce)}" fill="none" stroke="${c.cold_color}" stroke-width="${c.zone_width}" stroke-linecap="round" opacity="0.88"/>`
            + `<path d="${arcPath(CX,CY,c.zone_radius,hs,A1)}" fill="none" stroke="${c.hot_color}" stroke-width="${c.zone_width}" stroke-linecap="round" opacity="0.88"/>`;
    }

    let moonDefs = "";
    let subSvg = "", subNeedle = "";
    const SCY = Number(c.sub_center_y), SR = Number(c.sub_radius);
    const SCX = CX + Number(c.sub_offset_x || 0);
    if(c.sub_enabled){
      const isArc = c.sub_style === "arc";
      const SA1 = Number(c.sub_sweep) / 2, SA0 = -SA1;
      const smin = Number(c.sub_min), smax = Number(c.sub_max), sspan = (smax - smin) || 1;
      const sang = v => SA0 + (Math.min(smax, Math.max(smin, v)) - smin) / sspan * (SA1 - SA0);
      const sstep = Number(c.sub_major_step) || 20;

      // Rayon vertical distinct : laissé à 0, on retombe sur un cercle.
      const kx = SR;
      const ky = Number(c.sub_radius_y) > 0 ? Number(c.sub_radius_y) : SR;
      const SRY = ky;
      // Les graduations rentrent d'une même distance sur les deux axes,
      // ce qui garde des traits de longueur homogène sur l'ellipse.
      const shrink = (d) => [Math.max(1, kx - d), Math.max(1, ky - d)];
      const [oxR, oyR] = shrink(isArc ? 0 : 1);
      const [mjx, mjy] = shrink(7);
      const [mnx, mny] = shrink(4);
      const [lbx, lby] = shrink(isArc ? 15 : 14);

      let st = "", sl = "";
      for(let v = smin; v <= smax + 1e-6; v += sstep){
        const a = sang(v);
        const [x0,y0] = ept(SCX,SCY,oxR,oyR,a), [x1,y1] = ept(SCX,SCY,mjx,mjy,a);
        st += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${c.tick_color}" stroke-width="1.2" stroke-linecap="round"/>`;
        const [lx,ly] = ept(SCX,SCY,lbx,lby,a);
        sl += `<text x="${f(lx)}" y="${f(ly + Number(c.sub_label_font_size)*0.36)}" text-anchor="middle" font-family="${c.font}" font-size="${c.sub_label_font_size}" font-weight="300" fill="${c.label_color}">${Math.round(v)}</text>`;
        for(let k = 1; k < 4; k++){
          const vv = v + sstep * k / 4; if(vv > smax + 1e-6) break;
          const a2 = sang(vv);
          const [mx0,my0] = ept(SCX,SCY,oxR,oyR,a2), [mx1,my1] = ept(SCX,SCY,mnx,mny,a2);
          st += `<line x1="${f(mx0)}" y1="${f(my0)}" x2="${f(mx1)}" y2="${f(my1)}" stroke="${shade(c.tick_color,1.9)}" stroke-width="0.6" stroke-linecap="round"/>`;
        }
      }

      // Fond : disque complet en style cadran, simple arc en demi-jauge.
      const base = isArc
        ? (c.sub_arc_show
            ? `<path d="${earcPath(SCX,SCY,kx+2,ky+2,SA0,SA1)}" fill="none" stroke="${shade(c.tick_color,2.4)}" stroke-width="${c.sub_arc_width}" stroke-linecap="round"/>`
            : "")
        : `<ellipse cx="${SCX}" cy="${SCY}" rx="${f(kx+2)}" ry="${f(ky+2)}" fill="${shade(c.face_color,0.98)}" stroke="${shade(c.face_color,0.82)}" stroke-width="0.8"/>`;

      // Le pivot est au centre en style cadran, en bas de l'arc en
      // demi-jauge : le libellé descend donc sous le pivot.
      const titleY = isArc
        ? SCY + Number(c.sub_title_font_size) * 1.8 + Number(c.sub_title_offset_y || 0)
        : SCY - SRY * 0.4 + Number(c.sub_title_offset_y || 0);
      const valueY = SCY + Number(c.sub_value_offset_y);

      subSvg = base + st + sl
        + `<text x="${f(SCX + Number(c.sub_title_offset_x || 0))}" y="${f(titleY)}" text-anchor="middle" font-family="${c.font}" font-size="${c.sub_title_font_size}" font-weight="300" fill="${c.muted_color}" letter-spacing="0.6">${c.sub_title}</text>`
        + (hum === null ? "" : `<text x="${f(SCX + Number(c.sub_value_offset_x || 0))}" y="${f(valueY)}" text-anchor="middle" font-family="${c.font}" font-size="${c.sub_value_font_size}" font-weight="400" fill="${c.sub_value_color || c.text_color}">${Math.round(hum)}%</text>`);

      if(hum !== null){
        const sa = sang(hum);
        // Sur une ellipse la distance centre -> contour dépend de
        // l'angle : on la recalcule pour que la pointe suive le bord.
        const [tipx, tipy] = ept(SCX, SCY, kx, ky, sa);
        const reach = Math.hypot(tipx - SCX, tipy - SCY);
        const L = Math.max(6, reach - (isArc ? 9 : 5));
        const T = isArc ? 4 : 6;
        let moon = "";
        if(c.sub_needle_moon){
          const ms = Number(c.needle_moon_size) * 0.6;
          const m = moonParts("jth-moon-sub", T + ms, ms, c.needle_moon_thickness, c.needle_moon_angle, c.sub_needle_color);
          moonDefs += m.def;
          moon = m.shape;
        }
        subNeedle = `<g transform="translate(${SCX} ${SCY}) rotate(${f(sa)})">`
          + `<path d="M -1.3 ${T} L -0.6 ${f(-L+7)} L 0 ${f(-L)} L 0.6 ${f(-L+7)} L 1.3 ${T} Z" fill="${c.sub_needle_color}"/>`
          + `<path d="M 0 ${f(-L+2)} L 2.4 ${f(-L+9)} L 0 ${f(-L+13)} L -2.4 ${f(-L+9)} Z" fill="${c.sub_needle_color}"/>`
          + moon + `</g>`
          + `<circle cx="${SCX}" cy="${SCY}" r="2.6" fill="${shade(c.sub_needle_color,0.7)}"/>`;
      }
    }

    let screws = "";
    if(c.case_screws_enabled){
      for(let i = 0; i < 3; i++){
        const a = Number(c.case_screws_start_angle) + i * 120;
        const [sx,sy] = pt(CX,CY,Number(c.case_screws_radius),a);
        const s = Number(c.case_screws_size);
        screws += `<g transform="translate(${f(sx)} ${f(sy)}) rotate(${(a*1.7).toFixed(0)})">`
          + `<circle r="${s}" fill="${c.rim_color}" stroke="${shade(c.rim_color,0.72)}" stroke-width="0.5"/>`
          + `<line x1="${f(-s*0.65)}" y1="0" x2="${f(s*0.65)}" y2="0" stroke="${shade(c.rim_color,0.52)}" stroke-width="${f(s*0.26)}" stroke-linecap="round"/></g>`;
      }
    }

    let knurl = "";
    if(c.knurling_enabled){
      for(let i = 0; i < 96; i++){
        const a = i * 360 / 96;
        const [x0,y0] = pt(CX,CY,108,a), [x1,y1] = pt(CX,CY,103,a);
        knurl += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${shade(c.rim_color,0.72)}" stroke-width="0.7"/>`;
      }
    }

    const L = Number(c.needle_length), T = Number(c.needle_tail);
    let needle = "";
    if(temp !== null){
      const na = ang(temp);
      let moon = "";
      if(c.needle_moon){
        const ms = Number(c.needle_moon_size);
        const mcy = T + ms + Number(c.needle_moon_offset || 0);
        const m = moonParts("jth-moon", mcy, ms, c.needle_moon_thickness, c.needle_moon_angle, c.needle_color);
        moonDefs += m.def;
        moon = m.shape;
      }
      needle = `<g transform="translate(${CX} ${CY}) rotate(${f(na)})">`
        + `<path d="M -1.9 ${f(T - 1)} L -0.9 ${f(-L+22)} L 0 ${f(-L)} L 0.9 ${f(-L+22)} L 1.9 ${f(T - 1)} Z" fill="${c.needle_color}"/>`
        + `<path d="M 0 ${f(-L+2)} L 3.6 ${f(-L+13)} L 0 ${f(-L+19)} L -3.6 ${f(-L+13)} Z" fill="${c.needle_color}"/>`
        + `<path d="M 0 ${f(-L+26)} L 2.6 ${f(-L+34)} L 0 ${f(-L+42)} L -2.6 ${f(-L+34)} Z" fill="${c.needle_color}" opacity="0.9"/>`
        + moon + `</g>`;
    }

    const lamp = Math.max(0, Math.min(1, Number(c.lamp_intensity)));
    const valTxt = temp === null ? "--" : Number(temp).toFixed(Number(c.decimals)) + c.unit;

    const svg = `
<svg viewBox="-3 -9 226 226" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
<defs>
  <linearGradient id="jth-alu" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${shade(c.rim_color,0.62)}"/><stop offset="12%" stop-color="${shade(c.rim_color,1.16)}"/>
    <stop offset="26%" stop-color="${shade(c.rim_color,0.84)}"/><stop offset="40%" stop-color="${shade(c.rim_color,1.2)}"/>
    <stop offset="55%" stop-color="${shade(c.rim_color,0.76)}"/><stop offset="70%" stop-color="${shade(c.rim_color,1.12)}"/>
    <stop offset="85%" stop-color="${shade(c.rim_color,0.7)}"/><stop offset="100%" stop-color="${shade(c.rim_color,1.02)}"/>
  </linearGradient>
  <linearGradient id="jth-alu2" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${shade(c.rim_color,0.9)}"/><stop offset="30%" stop-color="${shade(c.rim_color,1.22)}"/>
    <stop offset="60%" stop-color="${shade(c.rim_color,0.78)}"/><stop offset="100%" stop-color="${shade(c.rim_color,1.08)}"/>
  </linearGradient>
  <radialGradient id="jth-lamp" cx="50%" cy="100%" r="78%">
    <stop offset="0%" stop-color="${c.lamp_color}" stop-opacity="${(0.95*lamp).toFixed(2)}"/>
    <stop offset="45%" stop-color="${c.lamp_color}" stop-opacity="${(0.42*lamp).toFixed(2)}"/>
    <stop offset="100%" stop-color="${c.lamp_color}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="jth-vign" cx="50%" cy="50%" r="50%">
    <stop offset="70%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.16"/>
  </radialGradient>
  <linearGradient id="jth-glass" x1="0" y1="0" x2="0.7" y2="1">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
    <stop offset="45%" stop-color="#ffffff" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="jth-face"><circle cx="${CX}" cy="${CY}" r="90"/></clipPath>
  ${moonDefs}
</defs>
<circle cx="${CX}" cy="${CY}" r="110" fill="url(#jth-alu)"/>
${knurl}
<circle cx="${CX}" cy="${CY}" r="101" fill="url(#jth-alu2)"/>
<circle cx="${CX}" cy="${CY}" r="92" fill="none" stroke="${shade(c.rim_color,0.6)}" stroke-width="1"/>
<circle cx="${CX}" cy="${CY}" r="90" fill="${c.face_color}"/>
<g clip-path="url(#jth-face)">
  <rect x="${CX-90}" y="${CY-90}" width="180" height="180" fill="url(#jth-lamp)"/>
  <circle cx="${CX}" cy="${CY}" r="90" fill="url(#jth-vign)"/>
</g>
${zones}${ticks}${labels}${screws}${subSvg}
${name ? `<text x="${f(CX + Number(c.name_offset_x || 0))}" y="${c.name_offset_y}" text-anchor="middle" font-family="${c.font}" font-size="${c.name_font_size}" font-weight="300" fill="${c.name_color || c.muted_color}" letter-spacing="1.4">${String(name).toUpperCase()}</text>` : ""}
${c.digital_show ? `<text x="${f(CX + Number(c.digital_offset_x || 0))}" y="${c.digital_offset_y}" text-anchor="middle" font-family="${c.font}" font-size="${c.digital_font_size}" font-weight="400" fill="${c.digital_color || c.text_color}">${valTxt}</text>` : ""}
${subNeedle}${needle}
<circle cx="${CX}" cy="${CY}" r="6.4" fill="url(#jth-alu2)" stroke="${shade(c.rim_color,0.6)}" stroke-width="0.6"/>
<path d="M ${CX-3.4} ${CY} L ${CX+3.4} ${CY} M ${CX} ${CY-3.4} L ${CX} ${CY+3.4}" stroke="${shade(c.rim_color,0.5)}" stroke-width="1"/>
<g clip-path="url(#jth-face)"><ellipse cx="${CX-28}" cy="${CY-38}" rx="62" ry="46" fill="url(#jth-glass)" transform="rotate(-24 ${CX-28} ${CY-38})"/></g>
</svg>`;

    const titleTxt = String(c.card_title || "").trim();
    const titleHtml = titleTxt
      ? `<div style="text-align:center;font-family:${c.font},sans-serif;`
        + `font-size:${Number(c.card_title_font_size)}px;color:${c.card_title_color};`
        + `line-height:1.15;margin-${c.card_title_position === "below" ? "top" : "bottom"}:${Number(c.card_title_margin)}px">`
        + `${titleTxt}</div>`
      : "";

    if(!this._card){
      this._card = document.createElement("ha-card");
      this._card.style.display = "block";
      this.appendChild(this._card);
    }
    this._card.style.padding = c.card_padding || "4px";
    if(c.card_transparent){
      this._card.style.background = "none";
      this._card.style.border = "none";
      this._card.style.boxShadow = "none";
      this._card.style.setProperty("--ha-card-background", "transparent");
      this._card.style.setProperty("--ha-card-border-width", "0");
      this._card.style.setProperty("--ha-card-box-shadow", "none");
    } else {
      this._card.style.background = "";
      this._card.style.border = "";
      this._card.style.boxShadow = "";
      this._card.style.removeProperty("--ha-card-background");
      this._card.style.removeProperty("--ha-card-border-width");
      this._card.style.removeProperty("--ha-card-box-shadow");
    }
    this._card.innerHTML = c.card_title_position === "below"
      ? svg + titleHtml
      : titleHtml + svg;
  }
}
customElements.define("jauge-thermo-hygro", JaugeThermoHygro);

class JaugeThermoHygroEditor extends HTMLElement {
  setConfig(config){
    this._config = Object.assign({}, DEFAULT_CONFIG, config);
    if(this._skipNextRender){ this._skipNextRender = false; this._syncValues(); return; }
    this._build();
  }
  set hass(hass){ this._hass = hass; if(this._form) this._form.hass = hass; }

  _emit(){
    this._skipNextRender = true;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _syncValues(){
    (this._inputs || []).forEach(({ key, el }) => {
      const v = this._config[key];
      if(el.type === "checkbox"){ if(el.checked !== !!v) el.checked = !!v; }
      else if(document.activeElement !== el && String(el.value) !== String(v)) el.value = v;
    });
  }
  _title(t){
    const h = document.createElement("div");
    h.textContent = t.toUpperCase();
    h.style.cssText = "font-weight:600;letter-spacing:.06em;font-size:12px;margin:18px 0 6px;padding-top:10px;border-top:1px solid var(--divider-color);opacity:.85";
    return h;
  }
  _row(label, input){
    const r = document.createElement("div");
    r.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0";
    const l = document.createElement("span");
    l.textContent = label; l.style.cssText = "font-size:13px;flex:1";
    r.appendChild(l); r.appendChild(input);
    return r;
  }
  _numInput(key){
    const i = document.createElement("input");
    i.type = "number"; i.step = "any"; i.value = this._config[key];
    i.style.cssText = "width:92px;padding:5px 7px;border:1px solid var(--divider-color);border-radius:5px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit;font-size:13px";
    i.addEventListener("change", () => {
      const v = parseFloat(i.value);
      this._config = Object.assign({}, this._config, { [key]: isNaN(v) ? DEFAULT_CONFIG[key] : v });
      this._emit();
    });
    (this._inputs = this._inputs || []).push({ key, el: i });
    return i;
  }
  _colorInput(key){
    const i = document.createElement("input");
    i.type = "color"; i.value = this._config[key] || "#ffffff";
    i.style.cssText = "width:46px;height:28px;padding:0;border:1px solid var(--divider-color);border-radius:5px;background:none;cursor:pointer";
    i.addEventListener("change", () => { this._config = Object.assign({}, this._config, { [key]: i.value }); this._emit(); });
    (this._inputs = this._inputs || []).push({ key, el: i });
    return i;
  }
  _checkInput(key){
    const i = document.createElement("input");
    i.type = "checkbox"; i.checked = !!this._config[key];
    i.style.cssText = "width:18px;height:18px;cursor:pointer";
    i.addEventListener("change", () => { this._config = Object.assign({}, this._config, { [key]: i.checked }); this._emit(); });
    (this._inputs = this._inputs || []).push({ key, el: i });
    return i;
  }
  _textInput(key, ph){
    const i = document.createElement("input");
    i.type = "text"; i.value = this._config[key] || ""; i.placeholder = ph || "";
    i.style.cssText = "width:140px;padding:5px 7px;border:1px solid var(--divider-color);border-radius:5px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit;font-size:13px";
    i.addEventListener("change", () => { this._config = Object.assign({}, this._config, { [key]: i.value }); this._emit(); });
    (this._inputs = this._inputs || []).push({ key, el: i });
    return i;
  }
  _selectPairs(key, pairs){
    const s = document.createElement("select");
    s.style.cssText = "width:150px;padding:5px 7px;border:1px solid var(--divider-color);border-radius:5px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit;font-size:13px";
    pairs.forEach(([v, label]) => { const op = document.createElement("option"); op.value = v; op.textContent = label; s.appendChild(op); });
    s.value = this._config[key];
    s.addEventListener("change", () => { this._config = Object.assign({}, this._config, { [key]: s.value }); this._emit(); });
    (this._inputs = this._inputs || []).push({ key, el: s });
    return s;
  }
  _selectInput(key, options){
    const s = document.createElement("select");
    s.style.cssText = "width:150px;padding:5px 7px;border:1px solid var(--divider-color);border-radius:5px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit;font-size:13px";
    options.forEach(o => { const op = document.createElement("option"); op.value = o; op.textContent = o; s.appendChild(op); });
    s.value = this._config[key];
    s.addEventListener("change", () => { this._config = Object.assign({}, this._config, { [key]: s.value }); this._emit(); });
    (this._inputs = this._inputs || []).push({ key, el: s });
    return s;
  }

  _build(){
    this.innerHTML = "";
    this._inputs = [];
    const wrap = document.createElement("div");
    wrap.style.cssText = "padding:4px 2px 16px";

    this._form = document.createElement("ha-form");
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = [
      { name: "entity", required: true, selector: { entity: { domain: "sensor", device_class: "temperature" } } },
      { name: "humidity_entity", selector: { entity: { domain: "sensor" } } },
    ];
    this._form.computeLabel = s => ({ entity: "Capteur de température", humidity_entity: "Capteur d'humidité" })[s.name] || s.name;
    this._form.addEventListener("value-changed", e => {
      this._config = Object.assign({}, this._config, e.detail.value);
      this._emit();
    });
    wrap.appendChild(this._form);

    wrap.appendChild(this._title("Général"));
    wrap.appendChild(this._row("Nom affiché", this._textInput("name", "auto")));
    wrap.appendChild(this._row("Police", this._selectInput("font", FONTS)));
    wrap.appendChild(this._row("Unité", this._textInput("unit", "°C")));
    wrap.appendChild(this._row("Marge de la carte", this._textInput("card_padding", "4px")));
    wrap.appendChild(this._row("Fond de carte transparent", this._checkInput("card_transparent")));
    wrap.appendChild(this._row("Afficher la valeur numérique", this._checkInput("digital_show")));
    wrap.appendChild(this._row("Arcs froid / chaud", this._checkInput("zones_enabled")));
    wrap.appendChild(this._row("Sous-cadran humidité", this._checkInput("sub_enabled")));
    wrap.appendChild(this._row("Style du sous-cadran", this._selectPairs("sub_style", [
      ["round","Cadran rond"], ["arc","Demi-jauge large"],
    ])));
    wrap.appendChild(this._row("Demi-jauge : trait d'arc", this._checkInput("sub_arc_show")));
    wrap.appendChild(this._row("Libellé du sous-cadran", this._textInput("sub_title", "HUMIDITY")));
    wrap.appendChild(this._row("Titre de la carte", this._textInput("card_title", "vide = aucun")));
    wrap.appendChild(this._row("Position du titre", this._selectPairs("card_title_position", [
      ["above","Au-dessus"], ["below","En dessous"],
    ])));
    wrap.appendChild(this._row("Vis de boîtier", this._checkInput("case_screws_enabled")));
    wrap.appendChild(this._row("Cannelures du cerclage", this._checkInput("knurling_enabled")));
    wrap.appendChild(this._row("Croissant de lune (aiguille T°)", this._checkInput("needle_moon")));
    wrap.appendChild(this._row("Croissant de lune (aiguille %)", this._checkInput("sub_needle_moon")));

    NUM_FIELDS.forEach(([title, fields]) => {
      wrap.appendChild(this._title(title));
      fields.forEach(([key, label]) => wrap.appendChild(this._row(label, this._numInput(key))));
    });

    wrap.appendChild(this._title("Couleurs"));
    COLOR_FIELDS.forEach(([key, label]) => wrap.appendChild(this._row(label, this._colorInput(key))));

    this.appendChild(wrap);
  }
}
customElements.define("jauge-thermo-hygro-editor", JaugeThermoHygroEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "jauge-thermo-hygro",
  name: "Jauge thermo-hygro",
  description: "Cadran double aiguille température + humidité, style instrument météo ancien",
  preview: false,
});

})();

/* ===== card-transparent ===== */
(function(){
  // Garde anti-doublon : si une carte est deja declaree (anciennes ressources
  // encore actives), on ignore la 2e declaration au lieu de planter.
  const __ce = window.customElements;
  const customElements = {
    define: (n, c, o) => { if (!__ce.get(n)) __ce.define(n, c, o); },
    get: (n) => __ce.get(n),
    whenDefined: (n) => __ce.whenDefined(n)
  };
  const __cc = window.customCards = window.customCards || [];
  const __push = __cc.push.bind(__cc);

// ============================================================
// Fond de carte transparent — option additive
//
// Ajoute l'option `card_transparent` aux cartes :
//   - custom:battery-ring-gauge
//   - custom:half-arc-gauge
//   - custom:jauge-aiguille-puissance
//
// Activée, la vignette perd son fond, sa bordure et son ombre : la
// jauge semble posée directement sur le dashboard. Sans cette clé dans
// la config, la carte est rendue exactement comme avant.
//
// Ce module NE MODIFIE AUCUN fichier JS de carte : il se greffe dessus
// après coup (patch de setConfig et de getConfigElement).
//
// Il ajoute aussi une case à cocher « Fond de carte transparent » en
// bas de l'éditeur visuel de chacune de ces cartes, sans connaître
// leur structure interne : la ligne est simplement ajoutée à la fin de
// l'éditeur, et réinsérée si l'éditeur se reconstruit.
// ============================================================

const TAGS = ["battery-ring-gauge", "half-arc-gauge", "jauge-aiguille-puissance"];

const PROPS = [
  ["background", "none"],
  ["border", "none"],
  ["boxShadow", "none"],
];
const VARS = [
  ["--ha-card-background", "transparent"],
  ["--ha-card-border-width", "0"],
  ["--ha-card-box-shadow", "none"],
];

// ---------- Rendu de la carte ----------

function findCards(el) {
  const found = [];
  if (el.querySelectorAll) found.push(...el.querySelectorAll("ha-card"));
  if (el.shadowRoot) found.push(...el.shadowRoot.querySelectorAll("ha-card"));
  return found;
}

function applyTo(el) {
  const on = !!el.__jthTransparent;
  const targets = findCards(el);
  targets.forEach((card) => {
    PROPS.forEach(([p, v]) => { card.style[p] = on ? v : ""; });
    VARS.forEach(([p, v]) => {
      if (on) card.style.setProperty(p, v);
      else card.style.removeProperty(p);
    });
  });
  PROPS.forEach(([p, v]) => { el.style[p] = on ? v : ""; });
  VARS.forEach(([p, v]) => {
    if (on) el.style.setProperty(p, v);
    else el.style.removeProperty(p);
  });
}

function schedule(el) {
  if (el.__jthRaf) return;
  el.__jthRaf = requestAnimationFrame(() => {
    el.__jthRaf = null;
    applyTo(el);
  });
}

function watchCard(el) {
  // Les cartes réécrivent leur contenu à chaque mise à jour d'état :
  // on réapplique le style dès que le DOM interne change. On observe
  // uniquement childList (pas les attributs) pour éviter toute boucle.
  if (!el.__jthObserver && typeof MutationObserver !== "undefined") {
    el.__jthObserver = new MutationObserver(() => schedule(el));
    el.__jthObserver.observe(el, { childList: true, subtree: true });
    if (el.shadowRoot) {
      el.__jthObserver.observe(el.shadowRoot, { childList: true, subtree: true });
    }
  }
  schedule(el);
}

// ---------- Case à cocher dans l'éditeur ----------

function buildRow(editor) {
  const row = document.createElement("div");
  row.className = "jth-transparent-row";
  row.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;gap:12px;" +
    "margin:10px 4px 16px;padding-top:10px;border-top:1px solid var(--divider-color)";

  const label = document.createElement("span");
  label.textContent = "Fond de carte transparent";
  label.style.cssText = "font-size:13px;flex:1";

  const box = document.createElement("input");
  box.type = "checkbox";
  box.style.cssText = "width:18px;height:18px;cursor:pointer";
  box.checked = !!(editor.__jthCfg && editor.__jthCfg.card_transparent);

  box.addEventListener("change", () => {
    const base = editor._config || editor.__jthCfg || {};
    const next = Object.assign({}, base, { card_transparent: box.checked });
    editor.__jthCfg = next;
    editor.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: next },
      bubbles: true,
      composed: true,
    }));
  });

  row.appendChild(label);
  row.appendChild(box);
  editor.__jthBox = box;
  return row;
}

function ensureRow(editor) {
  if (editor.__jthRow && editor.__jthRow.isConnected) {
    // Déjà en place : on resynchronise seulement l'état de la case.
    const want = !!(editor.__jthCfg && editor.__jthCfg.card_transparent);
    if (editor.__jthBox && editor.__jthBox.checked !== want) {
      editor.__jthBox.checked = want;
    }
    return;
  }
  editor.__jthRow = buildRow(editor);
  editor.appendChild(editor.__jthRow);
}

function scheduleRow(editor) {
  if (editor.__jthRowRaf) return;
  editor.__jthRowRaf = requestAnimationFrame(() => {
    editor.__jthRowRaf = null;
    ensureRow(editor);
  });
}

function attachEditor(editor) {
  if (!editor || editor.__jthEditorPatched) return;
  editor.__jthEditorPatched = true;

  const original = editor.setConfig ? editor.setConfig.bind(editor) : null;
  editor.setConfig = function (config, ...rest) {
    editor.__jthCfg = config;
    const result = original ? original(config, ...rest) : undefined;
    scheduleRow(editor);
    return result;
  };

  // L'éditeur peut se reconstruire entièrement (innerHTML = "") : on
  // réinsère la ligne si elle a disparu.
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(() => scheduleRow(editor))
      .observe(editor, { childList: true });
  }
  scheduleRow(editor);
}

// ---------- Greffe sur les cartes ----------

TAGS.forEach((tag) => {
  customElements.whenDefined(tag).then(() => {
    const ctor = customElements.get(tag);
    if (!ctor || ctor.__jthTransparentPatched) return;
    ctor.__jthTransparentPatched = true;

    const originalSetConfig = ctor.prototype.setConfig;
    ctor.prototype.setConfig = function (config, ...rest) {
      this.__jthTransparent = !!(config && config.card_transparent);
      const result = originalSetConfig.call(this, config, ...rest);
      watchCard(this);
      return result;
    };

    const originalGetConfigElement = ctor.getConfigElement;
    if (typeof originalGetConfigElement === "function") {
      ctor.getConfigElement = function (...args) {
        const editor = originalGetConfigElement.apply(this, args);
        try { attachEditor(editor); } catch (e) { /* éditeur inattendu : on n'insiste pas */ }
        return editor;
      };
    }
  });
});

})();