class SystemPanelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._expanded = false;
  }

  setConfig(config) {
    if (!config.name) throw new Error('Please define name');
    this.config = config;
    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._buildDom();
      this._rendered = true;
    }
    this._update();
  }

  _isUp(state) {
    return ['up', 'on', 'normal', 'ok'].includes(state?.toLowerCase());
  }

  _formatUptime(state, unit) {
    if (!state || state === 'unknown' || state === 'unavailable') return '?';
    var totalHours;
    var asDate = new Date(state);
    if (!isNaN(asDate) && state.includes('-')) {
      totalHours = (Date.now() - asDate) / 3600000;
    } else {
      var val = parseFloat(state);
      if (isNaN(val)) return state;
      if (unit === 'd' || unit === 'days') totalHours = val * 24;
      else if (unit === 'min' || unit === 'minutes') totalHours = val / 60;
      else if (unit === 's' || unit === 'seconds') totalHours = val / 3600;
      else totalHours = val;
    }
    if (totalHours < 0) return '?';
    if (totalHours < 1) return Math.max(1, Math.floor(totalHours * 60)) + ' min';
    var days = Math.floor(totalHours / 24);
    var hours = Math.floor(totalHours % 24);
    if (days === 0) return hours + 'h';
    if (hours === 0) return days + 'd';
    return days + 'd ' + hours + 'h';
  }

  _s(id) { return this._hass?.states?.[id]; }

  _buildDom() {
    const c = this.config;
    const stats = c.stats || [];
    const actions = c.actions || [];

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          overflow: hidden;
          padding: 0;
        }
        .header {
          display: flex;
          align-items: center;
          padding: 12px 12px 12px 16px;
          gap: 12px;
        }
        .icon-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .main-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.05);
        }
        .main-icon ha-icon { --mdc-icon-size: 28px; }
        .badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .badge ha-icon { --mdc-icon-size: 14px; }
        .info { flex: 1; min-width: 0; }
        .name {
          font-size: 1.1em;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .secondary {
          font-size: 0.85em;
          color: var(--secondary-text-color);
          margin-top: 2px;
        }
        .header-actions {
          display: flex;
          gap: 2px;
          flex-shrink: 0;
        }
        .act-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 0.85em;
          font-family: inherit;
        }
        .act-btn:hover { background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.05); }
        .act-btn ha-icon { --mdc-icon-size: 16px; }
        .stats-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          cursor: pointer;
          user-select: none;
          border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
          color: var(--secondary-text-color);
          font-size: 0.9em;
        }
        .stats-toggle:hover { background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.03); }
        .chevron {
          --mdc-icon-size: 18px;
          transition: transform 0.2s;
        }
        .chevron.open { transform: rotate(180deg); }
        .stats-body {
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.3s ease;
        }
        .stats-body.open { max-height: 500px; }
        .stats-inner {
          padding-bottom: 8px;
        }
        .stat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px 6px 20px;
          font-size: 0.9em;
        }
        .stat-left {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--secondary-text-color);
        }
        .stat-left ha-icon { --mdc-icon-size: 18px; }
        .stat-val { color: var(--primary-text-color); }
      </style>
      <ha-card>
        <div class="header">
          <div class="icon-wrap">
            <div class="main-icon" id="main-icon">
              <ha-icon icon="${c.icon || 'mdi:server'}"></ha-icon>
            </div>
            <div class="badge" id="badge">
              <ha-icon id="badge-icon" icon="mdi:heart-pulse"></ha-icon>
            </div>
          </div>
          <div class="info">
            <div class="name">${c.name}</div>
            <div class="secondary" id="secondary"></div>
          </div>
          ${actions.length ? `
            <div class="header-actions">
              ${actions.map((a, i) => `
                <button class="act-btn" data-i="${i}" style="color:${a.color || 'inherit'}" title="${a.name}">
                  <ha-icon icon="${a.icon || 'mdi:play'}"></ha-icon>
                  <span>${a.name}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        ${stats.length ? `
          <div class="stats-toggle" id="toggle">
            <span>System Stats</span>
            <ha-icon class="chevron" id="chevron" icon="mdi:chevron-down"></ha-icon>
          </div>
          <div class="stats-body" id="stats-body">
            <div class="stats-inner">
              ${stats.map((s, i) => `
                <div class="stat-row">
                  <div class="stat-left">
                    <ha-icon icon="${s.icon || 'mdi:information'}"></ha-icon>
                    <span>${s.name || s.entity}</span>
                  </div>
                  <span class="stat-val" id="sv${i}"></span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </ha-card>
    `;

    this._el = {
      card: this.shadowRoot.querySelector('ha-card'),
      mainIcon: this.shadowRoot.getElementById('main-icon'),
      badge: this.shadowRoot.getElementById('badge'),
      badgeIcon: this.shadowRoot.getElementById('badge-icon'),
      secondary: this.shadowRoot.getElementById('secondary'),
      chevron: this.shadowRoot.getElementById('chevron'),
      statsBody: this.shadowRoot.getElementById('stats-body'),
      statVals: stats.map((_, i) => this.shadowRoot.getElementById('sv' + i))
    };

    const tgl = this.shadowRoot.getElementById('toggle');
    if (tgl) {
      tgl.addEventListener('click', () => {
        this._expanded = !this._expanded;
        this._el.chevron.classList.toggle('open', this._expanded);
        this._el.statsBody.classList.toggle('open', this._expanded);
      });
    }

    this.shadowRoot.querySelectorAll('.act-btn').forEach(btn => {
      const action = (this.config.actions || [])[+btn.dataset.i];
      btn.addEventListener('click', () => {
        if (action.confirmation && !confirm(action.confirmation)) return;
        const [domain, svc] = (action.service || 'button.press').split('.');
        this._hass.callService(domain, svc, { entity_id: action.entity });
      });
    });

    if (this._expanded && this._el.chevron && this._el.statsBody) {
      this._el.chevron.classList.add('open');
      this._el.statsBody.classList.add('open');
    }

    this._uptimeInterval = setInterval(() => this._update(), 60000);
  }

  disconnectedCallback() {
    if (this._uptimeInterval) {
      clearInterval(this._uptimeInterval);
      this._uptimeInterval = null;
    }
  }

  _update() {
    if (!this._el) return;
    const c = this.config;

    const iconEntity = this._s(c.status_entity);
    const iconUp = this._isUp(iconEntity?.state);
    const iconCol = iconUp ? 'var(--success-color, #4CAF50)' : 'var(--error-color, #F44336)';
    this._el.mainIcon.style.color = iconCol;

    const badgeEntity = this._s(c.badge_entity || c.status_entity);
    const badgeUp = this._isUp(badgeEntity?.state);
    const badgeCol = badgeUp ? 'var(--success-color, #4CAF50)' : 'var(--error-color, #F44336)';
    this._el.badge.style.color = badgeCol;

    const us = this._s(c.uptime_entity);
    const uv = us ? this._formatUptime(us.state, us.attributes?.unit_of_measurement) : '?';
    var secondary = 'Up ' + uv;
    if (c.temp_entity) {
      const ts = this._s(c.temp_entity);
      if (ts) {
        const tu = ts.attributes?.unit_of_measurement || '°C';
        secondary += ' · ' + ts.state + ' ' + tu;
      }
    }
    this._el.secondary.textContent = secondary;

    (c.stats || []).forEach((s, i) => {
      const e = this._s(s.entity);
      if (this._el.statVals[i]) {
        const u = e?.attributes?.unit_of_measurement;
        this._el.statVals[i].textContent = e ? e.state + (u ? ' ' + u : '') : '?';
      }
    });
  }

  getCardSize() { return 3; }
}

if (!customElements.get('system-panel-card')) customElements.define('system-panel-card', SystemPanelCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'system-panel-card',
  name: 'System Panel',
  description: 'System control panel with status, stats, and power controls'
});
class AiDescribeCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = 'empty';
    this._result = '';
  }

  setConfig(config) {
    if (!config.source) throw new Error('source required');
    this.config = {
      source_type: 'camera',
      name: 'Describe',
      ai_entity: 'ai_task.google_ai_task',
      prompt: 'Describe what you see. One sentence.',
      ...config
    };
    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._buildDom();
      this._rendered = true;
    }
  }

  async _trigger() {
    if (this._state === 'loading') return;
    this._state = 'loading';
    this._updateDom();

    var c = this.config;
    var mediaId = c.source_type === 'camera'
      ? 'media-source://camera/' + c.source
      : c.source;

    var timeout = new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('timeout')); }, 30000);
    });

    try {
      var result = await Promise.race([
        this._hass.callService('ai_task', 'generate_data', {
          task_name: 'ai_describe',
          entity_id: c.ai_entity,
          instructions: c.prompt,
          attachments: [{
            media_content_id: mediaId,
            media_content_type: 'image/jpeg'
          }]
        }, undefined, true),
        timeout
      ]);

      if (result && result.response && result.response.data) {
        this._result = String(result.response.data).substring(0, 255);
        this._state = 'result';
      } else {
        this._state = 'error';
      }
    } catch (e) {
      this._state = 'error';
    }

    this._updateDom();
  }

  _buildDom() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .wrap {
          position: relative;
          cursor: pointer;
          padding: 12px 16px;
          border-radius: var(--ha-card-border-radius, 12px);
          background: var(--ha-card-background, var(--card-background-color));
          box-shadow: var(--ha-card-box-shadow, none);
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.2s;
          min-height: 24px;
        }
        .wrap:hover { background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.04); }
        .wrap:hover .retrigger { opacity: 1; }
        .icon { color: var(--amber-color, #FFC107); flex-shrink: 0; }
        .icon ha-icon { --mdc-icon-size: 22px; }
        .empty { color: var(--secondary-text-color); font-size: 1em; font-weight: 500; }
        .summary { color: var(--primary-text-color); font-size: 0.95em; line-height: 1.4; flex: 1; }
        .retrigger {
          opacity: 0;
          transition: opacity 0.2s;
          color: var(--amber-color, #FFC107);
          flex-shrink: 0;
        }
        .retrigger ha-icon { --mdc-icon-size: 18px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .pulsing { animation: pulse 1.5s ease-in-out infinite; }
        .loading { color: var(--secondary-text-color); font-size: 0.95em; font-style: italic; }
        .error { color: var(--error-color, #F44336); font-size: 0.95em; }
        @media (hover: none) { .retrigger { opacity: 1; } }
      </style>
      <div class="wrap" id="wrap">
        <div class="icon" id="icon"><ha-icon icon="mdi:creation"></ha-icon></div>
        <span id="text"></span>
        <div class="retrigger" id="retrigger"><ha-icon icon="mdi:creation"></ha-icon></div>
      </div>
    `;

    this._el = {
      wrap: this.shadowRoot.getElementById('wrap'),
      icon: this.shadowRoot.getElementById('icon'),
      text: this.shadowRoot.getElementById('text'),
      retrigger: this.shadowRoot.getElementById('retrigger')
    };

    this._el.wrap.addEventListener('click', () => this._trigger());
    this._updateDom();
  }

  _updateDom() {
    if (!this._el) return;

    if (this._state === 'loading') {
      this._el.icon.className = 'icon pulsing';
      this._el.icon.style.display = '';
      this._el.text.className = 'loading';
      this._el.text.textContent = 'Analyzing...';
      this._el.retrigger.style.display = 'none';
    } else if (this._state === 'error') {
      this._el.icon.className = 'icon';
      this._el.icon.style.display = '';
      this._el.text.className = 'error';
      this._el.text.textContent = 'Unavailable — try again';
      this._el.retrigger.style.display = 'none';
    } else if (this._state === 'result') {
      this._el.icon.style.display = 'none';
      this._el.text.className = 'summary';
      this._el.text.textContent = this._result;
      this._el.retrigger.style.display = '';
    } else {
      this._el.icon.className = 'icon';
      this._el.icon.style.display = '';
      this._el.text.className = 'empty';
      this._el.text.textContent = this.config.name;
      this._el.retrigger.style.display = 'none';
    }
  }

  getCardSize() { return 1; }
}

if (!customElements.get('ai-describe-card')) customElements.define('ai-describe-card', AiDescribeCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ai-describe-card',
  name: 'AI Describe',
  description: 'On-demand AI description of any media source'
});
