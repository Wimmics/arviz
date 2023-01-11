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

        this.margin = {left: 100, top: 250, bottom: this.height - 75, right: this.width - 100};

        this.tooltip = d3.select(this.dashboard.shadowRoot.querySelector('div.tooltip'))
    }

    // tooltip functions
    getRuleTooltip(d){
        return d.source.join(', ') + ' &#8594; ' + d.target.join(', ') + "<br><br>" +
            'Interestingness: ' + d.interestingness.toFixed(2) + '<br>' +
            'Confidence: ' + d.confidence.toFixed(2) + '<br><br>' +
            'Click for more';
    }

    getArcTooltip(value) {
        return value + ' rule' + (value > 1 ? 's' : '') + '<br><br> Right-click for further exploration.'
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

    cleanText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]|_/g, "")
    }

    getRuleId(d) {
        return ((this.cleanText(d.source.join('_')) + '_' + this.cleanText(d.target.join('_'))) + (d.cluster ? '_' + d.cluster : '')).replace(/\s+/g, '_');
    }

  
}