
class CircularView extends Chart{
    constructor(config) {
        super(config)

        this.visibleNodes = 40;
        this.firstNode = 0
        this.lastNode = 0
        this.browsing = 'rules'

        this.id = "chord"
    }

    getRule(d) {
        let sources = d.source.map(e => e.label),
            targets = d.target.map(e => e.label),
            cluster = d.source[0].cluster;
        
        return this.data.filter(e => e.cluster == cluster && e.source.equals(sources) && e.target.equals(targets))[0]
    }

    getColor(d){
        return this.dashboard.legend.getColor(this.getRule(d));
    }

    init(){

        this.center = { 'x': this.width/2, 'y': this.height/2 }

        this.outerRadius = Math.min(this.width, this.height) * .43,
        this.innerRadius = this.outerRadius - 20;

        this.svg = this.div.append('svg').classed('content', true)
            .attrs({
                'id': 'chord-diagram',
                'width': '100%',
                'height': '100%'
            })
            .style('overflow', 'hidden')

        this.arc = d3.arc()
            .innerRadius(this.innerRadius)
            .outerRadius(this.outerRadius);

        this.ribbon = d3.ribbon(5)
            .radius(this.innerRadius)

        this.group = this.svg.append("g")
            .attr("transform", () => transformString("translate", this.center.x, this.center.y))
            .attr('id', 'g-chords')

        this.group.append('g').classed('arcs', true)
        this.group.append('g').classed('chords', true)
        this.group.append('g').classed('labels', true)
        this.group.append('g').classed('lines', true) // lines connecting arcs and labels
        this.group.append('g').classed('ticks', true) // ticks indicating the number of ribbons
        this.group.append('g').classed('ticks_label', true) // label of ticks

        this.hide()
    }

    set(){

        this.display()
        this.dashboard.scatterplot.hide()
        this.dashboard.graph.hide()

        this.dashboard.showLoading()
        if (arguments.length == 0) this.filterDiagramData() 
        else { 
            this.clearPanels()
            this.filterDiagramData(arguments[0])
        }
    }

    update(){

        this.dashboard.hideLoading()
        this.display()

        const generateChords = d3.forkchord()
            .padAngle(.01)
            .sortCriteria(this.dashboard.sort.sortCriteria.terms)
            .sortGroups((a, b) => b - a)
     
        const chordsData = generateChords(this.data);

        this.group.datum(chordsData)
        
        this.drawArcs()
        this.drawChords()
        this.drawLabels(chordsData.groups)
    }

    drawArcs() {
        const _this = this;
        // ------------------------------------------
        // arcs
        this.group.select('g.arcs')
            .selectAll('path')
            .data(d => d.groups)
            .join(
                enter => enter.append("path")
                    .style("fill", '#f1f1f1')
                    .style('fill-opacity', '1')
                    .style("stroke", d3.rgb('#f1f1f1').darker())
                    .classed('arc', true)
                    .attr("d", this.arc),
                update => update,
                exit => exit.remove()
            )
            .on('mouseenter', (d) => this.arcMouseover(d))  		
            .on('mouseleave', () => this.arcMouseout())			
            .on('contextmenu', d3.contextMenu(menu))
            .transition('update-arcs')
            .duration(1000)
            .attrTween('d', function(d) { return _this.arcTween(this, d) })
    }

    drawChords() {
        const _this = this;
        //-----------------------------------------------------------------------
        // chords
        
        this.group.select('g.chords')
            .selectAll('path')
            .data(d => d)
            .join(
                enter => enter.append("path")
                    .classed('chord', true)
                    .attr("d", this.ribbon),
                update => update,
                exit => exit.remove()
            )
            .styles(d => {
                let rule = this.getRule(d)
                let color = this.getColor(d);
                return {
                    'stroke' : d3.rgb(color).darker(),
                    'stroke-width': 1,
                    'fill': rule.isSymmetric ? this.getPatternUrl(color) : color,
                    'opacity': 1
                }
            })
            .attr('id', d => this.getRuleId(this.getRule(d)))
            .on('click', d => this.newPanel(this.getRule(d)))
            .on('mouseenter', function(d) { _this.mouseover(this, d)})
            .on('mouseleave', (d) => this.mouseout(d)) 
            .transition('update-chords')
            .duration(500)
            .attrTween('d', function(d) { return _this.ribbonTween(this, d) })
    }

    drawLabels(data) {

        data.forEach(d => {
            const distance1 = this.innerRadius + 10,
                distance2 = distance1 + 25;
            d.angle = d.startAngle + (d.endAngle - d.startAngle)/2 - Math.PI/2;
            d.cx = Math.cos(d.angle) * distance1;
            d.x = Math.cos(d.angle) * distance2;
            d.cy = Math.sin(d.angle) * distance1;
            d.y = Math.sin(d.angle) * distance2;
        });

        this.group.select('g.labels')
            .selectAll('text')
            .data(data)
            .join(
                enter => enter.append("text")
                        .classed('terms', true),
                update => update,
                exit => exit.remove()
            )
            .transition('update-labels')
            .duration(500)
            .attrs(d => {
                return {
                    'x': d.angle > Math.PI/2 ? d.x - 45 : d.x + 45,
                    'y': d.y
                }
            })
            .style('text-anchor', d => d.angle > Math.PI/2 ? 'end' : 'start')
            .text(d => d.label)
            .style('font-style', d => this.browsing == 'terms' && this.selectedTerms.includes(d.label) ? 'italic' : 'normal')

        this.group.select('g.lines')
            .selectAll('polyline')
            .data(data)
            .join(
                enter => enter.append('polyline')
                    .styles({
                        'opacity': .3,
                        'stroke': 'black',
                        'stroke-width': '1px',
                        'fill': 'none'
                    }),
                update => update,
                exit => exit.remove()
            )
            .transition()
            .duration(1000)
            .attr('points', d => {
                return [
                    [d.cx, d.cy],
                    [d.x, d.y],
                    [d.angle > Math.PI/2 ? d.x - 40 : d.x + 40, d.y]
                ]
            })
    }

    arcMouseover(d) {
        if (this.isPanelMoving()) return;

        this.group.selectAll('path.chord')
            .transition('chord-arcmouseover')
            .duration(200)
            .style("opacity", e => e.source ? e.source.some(s => s.index.includes(d.index)) || e.target.some(t => t.subindex.includes(d.index)) ? 1 : .05 : .05) // fix this!
        
        let relatedTerms = this.data.filter(e => e.source.includes(d.label) || e.target.includes(d.label)).map(e => e.source.concat(e.target))
        
        this.group.selectAll('text.terms')
            .transition('terms-arcmouseover')
            .duration(200)
            .styles(e => {
                let valid = relatedTerms.some(x => x.includes(e.label));
                return {
                    'font-weight': valid ? 'bold' : 'normal',
                    'opacity': valid ? '1' : '.2'
                }
            })

        this.displayTooltip(this.getArcTooltip((d.value.in + d.value.out) / 10)) 
        this.dashboard.closeNav()
    }

    arcMouseout(){
        if (d3.event.buttons > 0) return;

        this.group.selectAll('path.chord')
            .transition('chord-arcmouseout')
            .duration(500)
            .style('opacity', 1)

        this.group.selectAll('text.terms')
            .transition('terms-arcmouseout')
            .duration(200)
            .style('font-weight', 'normal')
            .style('opacity', '1')

        this.hideTooltip()
    }

    mouseover(elem, d) {
        if (this.isPanelMoving()) return;

        const rule = this.getRule(d)
        this.highlightRule(elem.id, d);

        if (this.panels[elem.id]) this.panels[elem.id].highlight()

        this.displayTooltip(this.getRuleTooltip(rule))
    }

    mouseout(d){
        this.removeRuleHighlight(this.getRule(d));
        this.hideTooltip()
    }

    highlightRule(id, d){
        
        let path = this.group.select('path#'+id)
        if (path.empty()) return;

        this.group.selectAll('path.chord')
            .transition()
            .duration(200)
            .style("opacity", function() { return this.id === id ? 1 : .05})

        let labels = d.source.concat(d.target).map(e => e.label || e)
        this.group.selectAll('text.terms')
            .transition()
            .duration(200)
            .styles(e => {
                let valid = labels.includes(e.label);
                return {
                    'font-weight': valid ? 'bold' : 'normal',
                    'opacity': valid ? '1' : '.2'
                }
            })

        this.dashboard.closeNav()
    }

    removeRuleHighlight(d) {
        this.group.selectAll('path.chord')
            .transition()
            .duration(200)
            .style("opacity", 1)

        this.group.selectAll('text.terms')
            .transition()
            .duration(200)
            .style('font-weight', 'normal')
            .style('opacity', '1')

        let id = this.getRuleId(d)
        if (this.panels[id]) this.panels[id].removeHighlight()
        
    }

    arcTween(elem, a) {
        var i = d3.interpolate(elem._current, a);
        elem._current = i(0);
        return (t) => {
            return this.arc(i(t));
        };
    }

    ribbonTween(elem, a) {
        var i = d3.interpolate(elem._current, a);
        elem._current = i(0);
        return (t) => {
            return this.ribbon(i(t));
        };
    }

    updateRotationValue(event){
        this.visibleNodes = +d3.event.target.value;
        let value = this.firstNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value;
        value = this.lastNode - this.visibleNodes;
        this.firstNode = this.lastNode == this.maxNodes ? value : this.firstNode;
        this.clearPanels()
        this.updateRotationValueForm()
    }

    decreaseRotationValue(){
        let value = this.firstNode - this.visibleNodes;
        this.firstNode = value < 0 ? 0 : value;
        value = this.firstNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value;
        this.clearPanels()
        this.updateRotationValueForm()
    }

    increaseRotationValue(){
        let value = this.lastNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value;
        value = this.lastNode - this.visibleNodes
        this.firstNode = value < 0 ? 0 : value;
        this.clearPanels()
        this.updateRotationValueForm()
    }

    async updateRotationValueForm(){

        this.dashboard.shadowRoot.querySelector('.rotationNavText').innerHTML = capitalize(this.browsing) + ' ' + (this.firstNode + 1) + ' - ' + 
            (this.lastNode >= this.maxNodes ? this.maxNodes : this.lastNode)
        
        this.dashboard.shadowRoot.querySelector('#rotationValueInput').value = this.visibleNodes;

        this.updateDiagramData()

    } 

    hide() {
        this.svg.style("display", 'none')
        d3.select(this.dashboard.shadowRoot.querySelector('div.rotationValueNav')).style('display', 'none') 
        this.hidePanels()
    }

    display() {
        this.svg.style("display", 'block')
        d3.select(this.dashboard.shadowRoot.querySelector('div.rotationValueNav')).style('display', 'block') 
        this.displayPanels()
    }

    async filterDiagramData(){

        this.source = arguments.length > 0 ? 'vis' : 'server'
        let result = this.source === 'vis' ? await this.fetchData(arguments[0]) : await this.fetchData();
       
        this.total = result.data
        
        this.maxNodes = this.source === 'vis' ? this.total.length : result.count; // result.count is the total number of rules sent by the server
        
        let value = this.firstNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value;

        this.updateRotationValueForm()
    }

    async updateDiagramData(){
        
        if (this.source === 'vis') {
            this.data = this.total.slice(this.firstNode, this.lastNode)
        } else {
            let result = await this.fetchData()
            this.data = result.data;
        }

        this.dashboard.shadowRoot.querySelector('.rotationNavText2').innerHTML = "of " + this.maxNodes + ' ' + this.browsing + 
            (this.browsing == 'terms' ? ' in ' + this.data.length + ' rules' : '')

        this.update()
    }

    switchBrowsing(){
        this.browsing = this.browsing == 'rules' ? 'terms' : 'rules';
        this.maxNodes = this.browsing == 'terms' ? this.validTerms.length : this.filteredData.length;
        let value = this.firstNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value; 

        this.updateRotationValueForm()
    }

    async fetchData() {
        let url = '/arviz/' + this.dashboard.app + '/data/' + this.id;

        let values = {
            sort: this.dashboard.sort.sortCriteria.rules,
            filtering: this.dashboard.filter.getFilteringCriteria(),
            uncheck_methods: this.dashboard.filter.getMethods(),
            langs: this.dashboard.filter.getLanguages()
        }

        if (arguments.length) {
            let d = arguments[0]
            values.interestingness = d.interestingness
            values.confidence = d.confidence
            values.isSymmetric = d.isSymmetric
        } else {
            values.first = this.firstNode
            values.last = this.lastNode
        }

        let response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify( values )
        })
        return response.json()
    }

}


