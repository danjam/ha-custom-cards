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
