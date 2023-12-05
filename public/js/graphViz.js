
class GraphView extends Chart{
    constructor(config) {
        super(config)

        this.id = 'graph'
    }

    init() {
        this.div.append('div')
            .attr('class', 'dragscroll graphContainer')
            .append('svg')
            .classed('content', true)
            .attr('id', 'graph-view')
            .attrs({
                'height': '100%',
                'width': '100%'
            })
        
        this.group = this.div.select('svg#graph-view')
            .append('g')
            .attr('id', 'graph-group')

        this.group.append('text')
            .attrs({
                'x': '50%',
                'y': 70,
                'id': 'rule-title'
            })
            .styles({
                'display': 'none',
                'text-anchor': 'middle'
            })
            .text('Rules')


        this.group.append('g')
            .classed('node', true)

        this.group.append('g')
            .classed('rule', true)

        this.group.append('text')
            .attr('id', 'welcome-text')
            .attrs({
                'x': '50%',
                'y': '10%'
            })
            .styles({
                'text-anchor': 'middle'
            })
    }
    
    hide() {
        d3.select(this.dashboard.shadowRoot.querySelector('div.graphContainer')).style('display', 'none')
        d3.select(this.dashboard.shadowRoot.querySelector('div.bottom-button')).style('display', 'none')
        d3.select(this.dashboard.shadowRoot.querySelector('div.forms')).style('display', 'none')
        this.hidePanels()
    }

    display() {
        d3.select(this.dashboard.shadowRoot.querySelector('div.graphContainer')).style('display', 'block')
        d3.select(this.dashboard.shadowRoot.querySelector('div.bottom-button')).style('display', 'block')

        if (this.dashboard.keyword) d3.select(this.dashboard.shadowRoot.querySelector('div.forms')).style('display', 'none')
        else d3.select(this.dashboard.shadowRoot.querySelector('div.forms')).style('display', 'table')

        if (this.dashboard.keyword)
            this.div.select('.graphContainer').style('height', '100%').style('top', 0)

        this.displayPanels()
    }

    empty(){

        let text = `We could not find any rule containing the keyword "${this.dashboard.getLabel(this.value)}". Please change the filter options or try again with another keyword.`;

        this.group.select('text#welcome-text')
            .style('display', 'block')
            .text(text)

        this.clearPanels()
        this.dashboard.hideLoading()
        this.group.selectAll('g.edges').remove()
        this.group.select('text#rule-title').style('display', 'none')
        this.group.select('g.node').style('display', 'none')
        this.group.select('g.rule').style('display', 'none')
    }

    displayClearButton() {
        d3.select(this.dashboard.shadowRoot.querySelector('#clear-selection'))
            .style('display', 'block')
            .on('click', () => this.clearSelection())
    }

    hideClearButton() {
        this.dashboard.shadowRoot.querySelector('#clear-selection').style.display = "none";
    }

    clearSelection() {
        this.hideClearButton()
        this.currentTerm = null
        this.selectedNodes = null
        this.setRules()
    }

    hideLabelInfo() {
        this.dashboard.shadowRoot.querySelector('#info-label').style.display = "none"
    }

    async update(filter){
        this.set(this.value, filter)
    }

    async set(value, filter){
      
        // remove the visual information regarding the chord diagram
        this.dashboard.chord.hide()
        this.dashboard.scatterplot.hide()

        this.display()
        
        if (this.value != value || filter) { // if the action is to create a new graph, i.e. new value or filter choice

            this.value = value;

            this.dashboard.showLoading()
            let response = await this.getRules(this.value);

            if (response.nodes.length == 0) {
                this.hideLabelInfo()
                this.empty()
                return;
            }
            this.rules = response;

            this.clearPanels()

            this.currentTerm = null;
            this.direction = null;
            this.activeTerms = null;

            this.rules.links.forEach(d => {
                d.sourceNode = this.getNodeById(d.source);
                d.targetNode = this.getNodeById(d.target); 
            })

            this.renderedNodes = this.rules.nodes.filter(d => d.type != 'rule')

            this.hideLabelInfo()
            this.clearSelection()

        } else if (this.renderedNodes) {
            this.displayPanels()
            await this.computePositions()
            this.drawNodes()
            if (this.renderedNodes.some(d => d.type == 'rule'))
                this.drawEdges()
        } 

        this.clearSearch()
        this.dashboard.hideLoading()
    }

    clearSearch() {
        this.dashboard.shadowRoot.querySelector('#source-input').value = this.dashboard.getLabel(this.value);
    }

    getNodeById(nodeId){
        return this.rules.nodes.filter(d => d.id == nodeId)[0];
    }

    getNodesByName(name){
        return this.renderedNodes.filter(d => d.name == name);
    }

    mouseover(d) {
        let ruleId = d.id >= 0 ? d.id : d3.select(this.parentNode).datum().rule;

        const edges = this.group.selectAll('g.edges');
        if (edges.size() == 0) return;

        let elements = [],
            ruleNodes = [];

        if (['source', 'target'].includes(d.type)) {
            ruleNodes = this.renderedNodes.filter(d => d.type == 'rule')
            if (ruleNodes.length == 0) return;
            elements = ruleNodes.filter(e => e.type == 'rule' && e[d.type].includes(d.name))
            elements = elements.map(e => e.id)
            if (elements.length == 0) return;
        }
        
        edges.transition()
            .duration(500)
            .style('opacity', e => {
                if (['source', 'target'].includes(d.type) && elements.includes(e.rule)) return 1;
                else if (e.rule == ruleId) return 1;
                else return .05;
            })

        let rule = this.rules.nodes.filter(e => e.id == ruleId)[0]
        if (!['source', 'target'].includes(d.type)) {
            let id = this.getRuleId(rule)
            if (this.panels[id]) this.panels[id].highlight()
        } 

        if (d.type == 'rule') {
            this.displayTooltip(this.getRuleTooltip(d))
        } else if (['source', 'target'].includes(d.type)) {
            this.displayTooltip(this.getArcTooltip(ruleNodes.filter(e => e[d.type].includes(d.name)).length))
        }
        
        this.dashboard.closeNav()
    }

    highlightRule(id) {
        this.group.selectAll('g.edges')
            .transition()
            .duration(500)
            .style('opacity', function() { return this.id == id ? 1 : 0.05; })
    }

    removeRuleHighlight(d){
        
        this.group.selectAll('g.edges')
            .transition()
            .duration(500)
            .style('opacity', 1)

        if (d.type === "rule") {
            let id = this.getRuleId(d)
            if (this.panels[id]) this.panels[id].removeHighlight()
        }

        this.hideTooltip()
    }

    async sortTermsByNbRules(counts) {
        // sort both sides separately 
        const sides = ['source', 'target'];
        sides.forEach(t => {
            this.renderedNodes.sort((a,b) => {
                let keys = Object.keys(counts[t])
                if (a.type == t) {
                    if (a.type == b.type) {
                        if (keys.includes(a.name) && keys.includes(b.name))
                            return this.dashboard.sort.sortCriteria.terms == 'alpha' ? a.name.localeCompare(b.name) : counts[t][b.name] - counts[t][a.name]
                        else if (keys.includes(a.name) && !keys.includes(b.name))
                            return -1;
                        else return 1;
                    }else return -1;
                } else return 1;
            })
        })
    }

    async sortTermsBySelection(counts) {
        ['source', 'target'].forEach(t => {
            this.renderedNodes.sort( (a,b) => {
                if (a.type === t) {
                    if (a.type === b.type) { // if both are in the same side, then sort them
                        if (this.selectedNodes.includes(a.id) && this.selectedNodes.includes(b.id)) {
                            this.dashboard.sort.sortCriteria.terms == 'alpha' ? a.name.localeCompare(b.name) : counts[t][b.name] - counts[t][a.name]
                        } else if (this.selectedNodes.includes(a.id) && !this.selectedNodes.includes(b.id)) { //
                            return -1
                        } else return 1
                    } else return -1
                } else return 1
            })
        })
    }

    countRules(nodes, counts) {
        nodes.forEach(d => {
            ['source', 'target'].forEach(type => {
                d[type].forEach(t => { // t == term
                    if (!Object.keys(counts[type]).includes(t))
                        counts[type][t] = nodes.filter(v => v[type].includes(t)).length;
                })
            })
        })
        return counts
    }

    async computePositions(){
        if (this.renderedNodes.length == 0) return;
            
        let counts = {'source': {}, 'target': {}}

        // sort terms in a way that position the ones involved to the selected term first
        if (this.currentTerm) {

            // count the number of rules per term (only the active ones)
            await this.countRules(this.renderedNodes.filter(d => d.type == 'rule'), counts)
        
            await this.sortTermsBySelection(counts)

        }
        else {
            // sort terms according to criteria
            if (this.dashboard.sort.sortCriteria.terms === 'alpha') {
                this.renderedNodes.sort((a,b) => a.type == 'rule' ? 1 : a.name.localeCompare(b.name));
            } else {
                this.countRules(this.rules.nodes.filter(d => d.type == 'rule'), counts)
                this.sortTermsByNbRules(counts);
            }   
        }

        // sort rules according to selected criteria
        if (this.dashboard.sort.sortCriteria.rules) {
            this.renderedNodes.sort((a,b) => a.type != 'rule' ? 1 : b[this.dashboard.sort.sortCriteria.rules] - a[this.dashboard.sort.sortCriteria.rules])
        }

        // indexing nodes for displaying
        let counter = {'rule': 0, 'source': 0, 'target': 0}
        this.renderedNodes.forEach(d => {
            d.index = counter[d.type]++;
        })

        // compute the position of nodes
        this.renderedNodes.forEach(d => {
            d.height = 40;

            d.width = d.type == 'rule' ? 40 : 15;

            d.x = d.type == 'rule' ? 50 : (d.type == 'source' ? 5 : 80);
            d.y = 50 + (d.height + 20) * d.index;
            d.tx = d.type == 'rule' ? d.x : d.x + d.width / 2;
            d.ty = d.y + (d.height / 2 + 5);
        })

        // update the height of the svg according to the number of nodes displayed
        let maxY = d3.max(this.renderedNodes, d => d.y);
        maxY = maxY < this.height ? this.height : maxY + 100;
        this.div.select('svg#graph-view').attr('height', maxY)

    }

    getShapeStyle(d){

        return {
            'fill': () => {
                if (d.id === this.currentTerm) return '#2C3E50'
                if (this.value && d.name === this.value) return '#dcdcdc'
                if (d.type === "rule")
                    return d.isSymmetric ? this.getPatternUrl(d.fill) : d.fill
                return "#fff"
            },
            'stroke-width': 1,
            'stroke': d.type == 'rule' ? 'none' : '#000',
            'opacity': !this.selectedNodes || d.type === 'rule' ? 1 : (this.selectedNodes.includes(d.id) ? 1 : .3),
            'cursor': 'pointer'
        } 
    }

    getTextStyle(d){
        return {
            'opacity': !this.selectedNodes ? 1 : (this.selectedNodes.includes(d.id) ? 1 : .3),
            'text-anchor': 'middle',
            'font-weight': 'normal',
            'cursor': 'pointer',
            'fill': d.id === this.currentTerm ? 'white' : 'black',
        }
    }

    isRuleSelected(d) {
        return d.nodes.includes(this.currentTerm) && d.nodes.every(e => this.selectedNodes.includes(e))
    }

    // select the rule nodes and the terms that must be displayed upon the selection of a term in one of the sides
    async setRules(d){
        if (d && (d.type == 'rule' || d.id === this.currentTerm)) return;

        this.div.select('div.graphContainer').node().scrollTo(0, 0);

        this.renderedNodes = [... this.rules.nodes]
        
        if (d) { // if a node was selected

            this.direction = d.type == 'source' ? 'target' : 'source';
            let selectedRules = this.renderedNodes.filter(e => e.type === 'rule' ? e[d.type].includes(d.name) : false)

            this.currentTerm = d.id;
            this.selectedNodes = selectedRules.map(e => e.nodes).flat()

            this.renderedNodes = this.renderedNodes.filter(e => e.type === 'rule' ? this.isRuleSelected(e) : true)

            this.displayClearButton()
        }
        
        await this.computePositions()
        this.hideText()
        this.displayNodes() 

        this.drawNodes()
        this.drawEdges()

        this.group.selectAll('g.node').selectAll('rect').styles(e => this.getShapeStyle(e))
    }

    displayNodes() {
        this.group.select('g.node').style('display', 'block')
        this.group.select('g.rule').style('display', 'block')
    }

    hideText() {
        this.group.select('#welcome-text').style('display', 'none')
        d3.select('g#graph-group').select('text#rule-title')
            .style('display', this.renderedNodes.some(d => d.type == 'rule') ? 'block' : 'none')
    }

    drawNodes() {
        this.drawLabelBoxes()
        this.drawLabels() 
        this.drawDiamonds()      
    }

    drawLabelBoxes() {
        this.group.select('g.node')
            .selectAll('rect')
            .data(this.renderedNodes.filter(d => d.type != 'rule'))
            .join(
                enter => enter.append('rect')
                    .attrs(d => {
                        return {
                            'width': d.width + '%',
                            'height': d.height,
                            'fill': 'white'
                        }
                    })
                    .on('click', d => this.setRules(d))
                    .on('mouseenter', d => this.mouseover(d))
                    .on('mouseleave', d => this.removeRuleHighlight(d))
                    .on('contextmenu', d3.contextMenu(menu)),
                update => update,
                exit => exit.remove()
            )
            .attrs((d,i) => {
                return {
                    x: d.x + '%',
                    y: d.y
                }
            })
            .styles(d => this.getShapeStyle(d))
    }

    drawLabels() {
        this.group.select('g.node')
            .selectAll('text')
            .data(this.renderedNodes.filter(d => d.type != 'rule'))
            .join(
                enter => enter.append('text')
                    .on('click', d => this.setRules(d))
                    .on('mouseenter', d => this.mouseover(d))
                    .on('mouseleave', d => this.removeRuleHighlight(d))
                    .on('contextmenu', d3.contextMenu(menu)),
                update => update,
                exit => exit.remove()
            )
            .text(d => this.dashboard.getLabel(d.name))
            .attrs(function(d,i){
                return {
                    x: d.tx + '%',
                    y: this.getComputedTextLength() > this.width * 14/100 ? d.ty - 8 : d.ty
                }
            })
            .call(wrap, this.width * 14/100, d => this.width * d.tx / 100)
            .transition()
            .duration(1500)
            .styles(d => this.getTextStyle(d))

    }

    drawDiamonds() {
        this.group.select('g.rule')
            .selectAll('rect')
            .data(this.renderedNodes.filter(d => d.type === 'rule'))
            .join(
                enter => enter.append('rect')
                    .classed('g-rule', true),
                update => update,
                exit => exit.remove()
            )
            .on('mouseenter', d => this.mouseover(d))
            .on('mouseleave', d => this.removeRuleHighlight(d))
            .on('click', d => this.newPanel(d))
            .transition()
            .duration(500)
            .attrs(d => {
                return {
                    'width': d.width,
                    'height': d.height,
                    'transform': `translate(${this.width/2}, ${d.y})rotate(45)`
                }
            }).attrs(d => this.getShapeStyle(d))
    }

    async getEdgesPoints() {
        let ruleNodes = this.renderedNodes.filter(d => d.type == 'rule')
        if (this.currentTerm) ruleNodes = ruleNodes.filter(d =>  d.nodes.includes(this.currentTerm) && d.nodes.every(e => this.selectedNodes.includes(e)))
        
        let links = [],
            linkDistance = 35,
            diff = (ruleNodes[ruleNodes.length - 1].y - ruleNodes[0].y) - (linkDistance * ruleNodes.length),
            top = ruleNodes[0].y + (Math.abs(diff) / 2);

        ruleNodes.forEach((d,i) => {
            if (!links.some(e => e.rule == d.id)) {
                links.push({
                    'rule': d.id,
                    'symmetric': d.isSymmetric,
                    'type': 'edge',
                    'points': []
                })
            }

            let sourceNodes = d.source.map(e => this.getNodesByName(e).filter(a => a.type == 'source')[0]),
                targetNodes = d.target.map(e => this.getNodesByName(e).filter(a => a.type == 'target')[0]),
                rule = this.renderedNodes.filter(e => e.id == d.id)[0],
                center = (Math.sqrt(2) * d.width)/2,
                rx = rule.x / 100 * this.width,
                ry = rule.y + center,
                y = top + (linkDistance * i),
                x = ((sourceNodes[0].x + sourceNodes[0].width) / 100 * this.width + rx) / 2 ;

            sourceNodes.forEach(e => {
                links[i].points.push({
                    'source': { x: (e.x + e.width) / 100 * this.width, y: e.y + e.height / 2},
                    'target': { x: rx - center, y: ry }
                })
            })

            x = (rx + targetNodes[0].x / 100 * this.width) / 2;

            targetNodes.forEach(e => {
                links[i].points.push({
                    source: { x: e.x / 100 * this.width, y: e.y + e.height / 2},
                    target: {'x': rx + center, 'y': ry}
                })
            })
        })

        return links
    }

    /*
        Display links towards rules
    */
    async drawEdges(){

        let links = await this.getEdgesPoints()

        const edgeGroup = this.group.selectAll('g.edges')
            .data(links)
            .join(
                enter => enter.append("g")
                    .classed('edges', true),
                update => update,
                exit => exit.remove()
            )    
            .attr('id', d => {
                let rule = this.rules.nodes.filter(e => e.id == d.rule)[0];
                return this.getRuleId(rule)
            })

        const path = edgeGroup.selectAll("path")
            .data(d => d.points)
            .join(
                enter => enter.append('path')
                    .classed('edge', true),
                update => update,
                exit => exit.remove()
            )
            .attr('d', d3.linkHorizontal().x(d => d.x).y(d => d.y))


        path.attr("stroke-dasharray", function() { return this.getTotalLength()})
            .attr("stroke-dashoffset", function() { let totalLength = this.getTotalLength(); return this.direction == 'source' ? -totalLength : totalLength; })
            .transition()
                .duration(700)
                .ease(d3.easeLinear) 
                .attr("stroke-dashoffset", 0);

        // bring rules to front
        this.group.selectAll("g.rule").raise()
        this.group.selectAll("g.node").raise()

    }  

    async getRules(){
        let rules = {'nodes': [], 'links':[]}
        
        const pushNode = (d) => {
            let ruleNode = rules.nodes.length;
            rules.nodes.push({'id': ruleNode, 
                'source': d.source,
                'target': d.target,
                'confidence': d.confidence,
                'isSymmetric': d.isSymmetric,
                'interestingness': d.interestingness,
                'support': d.support,
                'cluster': d.cluster,
                'graph': d.graph,
                'fill': this.dashboard.legend.getColor(d),
                'type': 'rule'})

            let antIds = [],
                conIds = [],
                nbLinks = 0; 
        

            d.source.forEach(a => {
                let source = rules.nodes.findIndex(e => e.name == a && e.type == 'source')
                if (source == -1) {
                    source = rules.nodes.length
                    rules.nodes.push({
                        'id': source, 
                        'name': a,  
                        'type': 'source'})
                }
                antIds.push(source)
                d.target.forEach(c => {
                    let target = rules.nodes.findIndex(e => e.name == c && e.type == 'target')
                    if (target == -1){
                        target = rules.nodes.length
                        rules.nodes.push({
                            'id': target, 
                            'name': c, 
                            'type': 'target'})
                    }
                    conIds.push(target)
                    
                    if (!rules.links.some(d => d.source == source && d.target == ruleNode)){
                        rules.links.push({'source': source, 'target': ruleNode, 'name': a + ' => ' + c})
                        nbLinks++;
                    }
                        
                    if (!rules.links.some(d => d.source == ruleNode && d.target == target)){
                        rules.links.push({'source': ruleNode, 'target': target, 'name': a + ' => ' + c})
                        nbLinks++;
                    }
                })
            })

            let totalLinks = rules.links.length-1;
            for (let i = totalLinks; i > totalLinks - nbLinks; i--){
                if (rules.links[i].type == 'source')
                    rules.links[i].nodes = antIds;
                else rules.links[i].nodes = conIds;
            }
        }

        this.data = await this.fetchData()
        this.data.forEach(pushNode)

        rules.nodes.forEach(d => {
            if (d.type !== 'rule') return;

            let sources = d.source.map(e => rules.nodes.find(x => x.name === e && x.type === 'source').id)
            let targets = d.target.map(e => rules.nodes.find(x => x.name === e && x.type === 'target').id)
            d.nodes = sources.concat(targets)
        })

        return rules
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
                uncheck_methods: this.dashboard.filter.getMethods()
            } )
        })
        return response.json()
    }
}
