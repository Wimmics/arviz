class ConfigPanel{
    constructor(config) {
        this.config = config
        this.dashboard = document.querySelector('#arviz')
        
        this.width = 250 
        this.height = 250

        this.extent = {
            'conf': { 'min': this.config.min_confidence, 'max': 1 },
            'int': { 'min': this.config.min_interestingness, 'max': 1 }
        }

        this.div = null;
        this.title = null;

    }

    // info icon
    setInfoIcon(node) {
        node.append('span.info')
            .styles({
                'position': 'relative',
                'font-size': '1.2em',
                'left': '10px',
                'color': '#cccccc',
                'cursor': 'pointer',
                'z-index': 2
            })
            .attr('data-tippy-content', d => d.help)
            .classed('config-info', true)
            .append('i')
            .classed('fas fa-info-circle', true)
    }

    setTitleBar() {
        let topbar = this.div.append('div')
            .classed('panel-topbar', true)
        
        topbar.append('div')
            .style('width', this.width * .8 + 'px')
            .style('padding', '5px')
            .append('text')
            .text(this.title)
            .style('font-weight', 'bold')
            
        topbar.append('div')
            .style('width', this.width * .2 + 'px')
            .append('svg')
            .attr('transform', 'translate(30, 10)')
                .append("svg:image")
                .attr('xlink:href', '/arviz/images/times.svg')
                .attr('width', '15')
                .attr('height', '15')
                .style('cursor', 'pointer')
                .on('click', () => this.dashboard.closeNav())
    }
}





