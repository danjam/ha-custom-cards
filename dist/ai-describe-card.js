class AiDescribeCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config.summary_entity) throw new Error('summary_entity required');
    if (!config.source) throw new Error('source required');
    this.config = {
      source_type: 'camera',
      name: 'Describe',
      script: 'ai_describe',
      ai_entity: 'ai_task.google_ai_task',
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
    this._update();
  }

  _trigger() {
    var c = this.config;
    var scriptId = c.script.replace('script.', '');
    var data = {
      source: c.source,
      source_type: c.source_type,
      summary_entity: c.summary_entity,
      ai_entity: c.ai_entity
    };
    if (c.prompt) data.prompt = c.prompt;
    this._hass.callService('script', scriptId, data);
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
        .wrap:hover { background: rgba(255,255,255,0.1); }
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
  }

  _update() {
    if (!this._el || !this._hass) return;
    var state = this._hass.states[this.config.summary_entity];
    var val = state ? state.state : '';
    var empty = !val || val === 'unknown' || val === '';
    var loading = val === 'Analyzing...';

    if (loading) {
      this._el.icon.className = 'icon pulsing';
      this._el.icon.style.display = '';
      this._el.text.className = 'loading';
      this._el.text.textContent = 'Analyzing...';
      this._el.retrigger.style.display = 'none';
    } else if (empty) {
      this._el.icon.className = 'icon';
      this._el.icon.style.display = '';
      this._el.text.className = 'empty';
      this._el.text.textContent = this.config.name;
      this._el.retrigger.style.display = 'none';
    } else {
      this._el.icon.style.display = 'none';
      this._el.text.className = 'summary';
      this._el.text.textContent = val;
      this._el.retrigger.style.display = '';
    }
  }

  getCardSize() { return 1; }
}

customElements.define('ai-describe-card', AiDescribeCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ai-describe-card',
  name: 'AI Describe',
  description: 'On-demand AI description of any media source'
});
