class Chart{
    constructor(config) {
        this.config = config;

        this.extent = {
            'conf': { 'min': this.config.min_confidence, 'max': 1 },
            'int': { 'min': this.config.min_interestingness, 'max': 1 }
        }

        this.dashboard = document.querySelector("#arviz")

        this.data = null

        this.div = d3.select(this.dashboard.shadowRoot.querySelector('div.viewContainer'));
        this.width = this.div.node().clientWidth
        this.height = this.div.node().clientHeight

        this.margin = {left: 100, top: 250, bottom: this.height - 75, right: this.width - 50};

        this.panels = {}

        this.value = null;

        this.tooltip = d3.select(this.dashboard.shadowRoot.querySelector('div.tooltip'))

    }

    getValue() {
        return this.value;
    }

    getPatternUrl(color) {
        return `url('${window.location.pathname}${window.location.search}#${color}-pattern')`
    }

    displayTooltip(content) {

        let x = d3.event.pageX,
            width = this.tooltip.node().clientWidth;
        x = width + x > window.innerWidth ? window.innerWidth - width : x;
    
        let y = d3.event.pageY + 5;
    
        this.tooltip.styles({
                'left': x + 'px',
                'top': y + 'px',
                'opacity': '1'
            })
            .html(content)
    }
    
    hideTooltip(){
        this.tooltip.style('opacity', '0')
    }

    // tooltip functions
    getRuleTooltip(d){
        return d.source.map(e => this.dashboard.getLabel(e)).join(', ') + ' &#8594; ' + d.target.map(e => this.dashboard.getLabel(e)).join(', ') + "<br><br>" +
            'Interestingness: ' + d.interestingness.toFixed(2) + '<br>' +
            'Confidence: ' + d.confidence.toFixed(2) + '<br><br>' +
            'Click for more';
    }

    getArcTooltip(value) {
        return value + ' rule' + (value > 1 ? 's' : '') + '<br><br> Right-click for further exploration.'
    }

    cleanText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]|_/g, "")
    }

    getRuleId(d) {
        return ('rule_' + (this.cleanText(d.source.join('_')) + '_' + this.cleanText(d.target.join('_'))) + (d.cluster ? '_' + d.cluster : '')).replace(/\s+/g, '_');
    }

    clearPanels() {
        for (let key of Object.keys(this.panels)) {
            this.panels[key].clear()
        }
    }

    displayPanels() {
        for (let key of Object.keys(this.panels)) {
            this.panels[key].display()
        }
    }

    hidePanels() {
        for (let key of Object.keys(this.panels)) {
            this.panels[key].hide()
        }
    }

    highlightRule() {

    }

    removeRuleHighlight() {

    }

    isPanelMoving() {
        for (let key of Object.keys(this.panels)) 
            if (this.panels[key].dragActive) 
                return true;
        
        return false;
    }

    async newPanel(d) {
        let event = d3.event;
        let id = this.getRuleId(d)
        
        let panel = this.dashboard.app === "crobora" ? new ImagesPanel(id) : new PublicationsPanel(id) 
        panel.init()
        panel.set(d, event)

        panel.div
            .on('mouseenter', () => this.highlightRule(id, d))
            .on('mouseleave', () => this.removeRuleHighlight(d))
        
        this.panels[id] = panel;         
    }


    async fetchData() {
        let url = '/arviz/' + this.dashboard.app + '/data/' + this.id;
        let response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify( {
                // type: this.type,
                value: this.value,
                filtering: this.dashboard.filter.getFilteringCriteria(),
                //uncheck_methods: this.dashboard.filter.getMethods(),
                dataset: this.dashboard.filter.getDataset()
            } )
        })
        return response.json()
    }
  
}