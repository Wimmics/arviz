
class CircularView {
    constructor() {
        this.visibleNodes = 40;
        this.firstNode = 0
        this.lastNode = 0
        this.data = null
        this.browsing = 'rules'
    }

    getRule(source, target) {
        let sources = source.map(e => e.label),
            targets = target.map(e => e.label),
            cluster = source[0].cluster;
        
        return this.data.filter(d => d.cluster == cluster && d.source.equals(sources) && d.target.equals(targets))[0]
    }

    getColor(d){
        return configPanel.getColor(this.getRule(d.source, d.target));
    }

    setChordDiagram(){

        this.dimensions = {
            'width': width, 
            'height': height,
            'center': {
                'x': width/2,
                'y': height/2
            }
        };

        this.outerRadius = Math.min(this.dimensions.width, this.dimensions.height) * .43,
        this.innerRadius = this.outerRadius - 20;

        this.arc = d3.arc()
            .innerRadius(this.innerRadius)
            .outerRadius(this.outerRadius);

        this.ribbon = d3.ribbon(5)
            .radius(this.innerRadius)

        if (d3.select('g#g-chords').empty()) {
            const group = d3.select('svg#chord-diagram').append("g")
                .attr("transform", () => transformString("translate", this.dimensions.center.x, this.dimensions.center.y))
                .attr('id', 'g-chords')

            group.append('g').classed('arcs', true)
            group.append('g').classed('chords', true)
            group.append('g').classed('labels', true)
            group.append('g').classed('lines', true) // lines connecting arcs and labels
            group.append('g').classed('ticks', true) // ticks indicating the number of ribbons
            group.append('g').classed('ticks_label', true) // label of ticks
        }

        this.updateChordDiagram()
    }

    updateChordDiagram(){

        const _this = this;
        const generateChords = d3.forkchord()
            .padAngle(.01)
            .sortCriteria(configPanel.sortCriteria.terms)
            .sortGroups((a, b) => b - a)
     
        const chordsData = generateChords(this.data);

        const cdGroup = d3.select('g#g-chords').datum(chordsData)
        
        // ------------------------------------------
        // arcs

        const arcGroup = cdGroup.select('g.arcs').selectAll('path').data(d => d.groups)

        arcGroup.join(
            enter => enter.append("path")
                .style("fill", '#f1f1f1')
                .style('fill-opacity', '1')
                .style("stroke", d3.rgb('#f1f1f1').darker())
                .classed('arc', true)
                .attr("d", this.arc),
            update => update,
            exit => exit.remove()
        )
        .on('mouseenter', (d) => {
            if (dragActive) return;

            d3.selectAll('path.chord').transition()
                .duration(200)
                .style("opacity", e => e.source.some(s => s.index.includes(d.index)) || e.target.some(t => t.subindex.includes(d.index)) ? 1 : .05)
            
            let relatedTerms = this.data.filter(e => e.source.includes(d.label) || e.target.includes(d.label)).map(e => e.source.concat(e.target))
            
            d3.selectAll('text.terms')
                .transition()
                .duration(200)
                .styles(e => {
                    let valid = relatedTerms.some(x => x.includes(e.label));
                    return {
                        'font-weight': valid ? 'bold' : 'normal',
                        'opacity': valid ? '1' : '.2'
                    }
                })

            showArcTooltip((d.value.in + d.value.out) / 10)
            closeNav()
        })  		
        .on('mouseleave', function(d){
            if (d3.event.buttons > 0) return;

            d3.selectAll('path.chord').transition()
                .duration(500)
                .style('opacity', 1)

            d3.selectAll('text.terms')
                .transition()
                .duration(200)
                .style('font-weight', 'normal')
                .style('opacity', '1')
            hideTooltip()

        })			
        .on('contextmenu', d3.contextMenu(menu))
        .transition('update-arcs')
        .duration(1000)
        .attrTween('d', function(d) { return _this.arcTween(this, d) })

        //-----------------------------------------------------------------------
        // chords
        
        const chordGroup = cdGroup.select('g.chords').selectAll('path').data(d => d)

        chordGroup.join(
            enter => enter.append("path")
                .classed('chord', true)
                .attr("d", this.ribbon)
                .on('click', d => setDetailsPanel(this.getRule(d.source, d.target, d.cluster)))
                .on('mouseenter', function(d) { _this.mouseover(this, d)})
                .on('mouseleave', () => this.mouseout()), // add the mouseover here
            update => update,
            exit => exit.remove()
        )
        .styles(d => {
            let rule = this.getRule(d.source, d.target)
            let color = this.getColor(d);
            return {
                'stroke' : d3.rgb(color).darker(),
                'stroke-width': 1,
                'fill': rule.isSymmetric ? "url('#"+ color + "-pattern')" : color,
                'opacity': 1
            }
        })
        // .attr('data-tippy-content', d => getTooltipContent(getRule(d.source, d.target)))
        
        .attr('id', d => getRuleId(this.getRule(d.source, d.target, d.cluster)))
        .transition('update-chords')
        .duration(500)
        .attrTween('d', function(d) { return _this.ribbonTween(this, d) })


        // setTooltip('.chord')

        // -----------------------------------
        // Labels (terms)

        const labelData = chordsData.groups
        labelData.forEach(d => {
            const distance1 = this.innerRadius + 10,
                distance2 = distance1 + 25;
            d.angle = d.startAngle + (d.endAngle - d.startAngle)/2 - Math.PI/2;
            d.cx = Math.cos(d.angle) * distance1;
            d.x = Math.cos(d.angle) * distance2;
            d.cy = Math.sin(d.angle) * distance1;
            d.y = Math.sin(d.angle) * distance2;
        });

        const labelGroup = cdGroup.select('g.labels').selectAll('text').data(labelData)
    
        labelGroup.join(
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

        const lineGroup = cdGroup.select('g.lines').selectAll('polyline').data(labelData)
        
        lineGroup.join(
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

    mouseover(elem, d) {
        if (dragActive) return;

        this.highlightRule(elem.id);
        highlightDetailsPanel(elem.id);

        const rule = this.getRule(d.source, d.target, d.cluster)
        showRuleTooltip(rule)
    }

    mouseout(){
        this.removeRuleHighlight();
        removeDetailsHighlight()
        hideTooltip()
    }

    highlightRule(id){
        let path = d3.select('path#'+id)
        if (path.empty()) return;

        d3.selectAll('path.chord')
            .transition()
            .duration(200)
            .style("opacity", function() {return this.id == id ? 1 : .05})

        let ruleData = path.datum();
        ruleData = ruleData.source.concat(ruleData.target).map(e => e.label)
        d3.selectAll('text.terms')
            .transition()
            .duration(200)
            .styles(e => {
                let valid = ruleData.includes(e.label);
                return {
                    'font-weight': valid ? 'bold' : 'normal',
                    'opacity': valid ? '1' : '.2'
                }
            })

        closeNav()
    }

    removeRuleHighlight() {
        d3.selectAll('path.chord')
            .transition()
            .duration(200)
            .style("opacity", 1)

        d3.selectAll('text.terms')
            .transition()
            .duration(200)
            .style('font-weight', 'normal')
            .style('opacity', '1')
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
        this.lastNode = value > cd.maxNodes ? cd.maxNodes : value;
        value = this.lastNode - this.visibleNodes;
        this.firstNode = this.lastNode == this.maxNodes ? value : this.firstNode;
        clearDetailPanels()
        this.updateRotationValueForm()
    }

    decreaseRotationValue(){
        let value = this.firstNode - this.visibleNodes;
        this.firstNode = value < 0 ? 0 : value;
        value = this.firstNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value;
        clearDetailPanels()
        this.updateRotationValueForm()
    }

    increaseRotationValue(){
        let value = this.lastNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value;
        value = this.lastNode - this.visibleNodes
        this.firstNode = value < 0 ? 0 : value;
        clearDetailPanels()
        this.updateRotationValueForm()
    }

    async updateRotationValueForm(){

        document.querySelector('.rotationNavText').innerHTML = capitalize(this.browsing) + ' ' + (this.firstNode + 1) + ' - ' + 
            (this.lastNode >= this.maxNodes ? this.maxNodes : this.lastNode)
        
        document.querySelector('#rotationValueInput').value = this.visibleNodes;

        this.updateDiagramData()

    } 

    update() {
        this.setChordDiagramView()
    }

    setChordDiagramView(){

        setActiveChart('chord')
        displayDetailPanels();
        
        const div = d3.select('div.viewContainer')
        if (div.select('svg#chord-diagram').empty())
            div.append('svg').classed('content', true)
                .attrs({
                    'id': 'chord-diagram',
                    'width': '100%',
                    'height': '100%'
                })
                .style('overflow', 'hidden')

        d3.select('div.rotationValueNav').style('display', 'block')  

        // clear the visual information about the other charts
        clearGraphView()
        clearScatterPlot()

        if (arguments.length == 0) this.filterDiagramData() 
        else this.filterDiagramData(arguments[0])
    }

    async filterDiagramData(){

        // this.firstNode = 0;
        this.source = arguments.length > 0 ? 'vis' : 'server'
        let result = this.source === 'vis' ? await this.fetchData(arguments[0]) : await this.fetchData();
       
        this.total = result.data
        

        // cd.validTerms = []
        // cd.filteredData.forEach(d => {
        //     d.source.forEach(e => { if (!cd.validTerms.includes(e)) cd.validTerms.push(e); })
        //     d.target.forEach(e => { if (!cd.validTerms.includes(e)) cd.validTerms.push(e); })
        // })
        // this.data = this.source this.total.data
        this.maxNodes = this.source === 'vis' ? this.total.length : result.count; // result.count is the total number of rules sent by the server
        
        let value = this.firstNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value;

        this.updateRotationValueForm()
    }

    async fetchData() {
        let url = '/arviz/' + appli + '/data/circular';

        let values = null
        if (arguments.length) {
            let d = arguments[0]
            values = {
                interestingness: d.interestingness,
                confidence: d.confidence,
                isSymmetric: d.isSymmetric,
                sort: configPanel.sortCriteria.rules,
                filtering: configPanel.filtering,
                uncheck_methods: configPanel.getMethods(),
                langs: configPanel.getLanguages()
            }
        } else {
            values = {
                first: this.firstNode,
                last: this.lastNode,
                sort: configPanel.sortCriteria.rules,
                filtering: configPanel.filtering,
                uncheck_methods: configPanel.getMethods(),
                langs: configPanel.getLanguages()
            }
        }

        let response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify( values )
        })
        return response.json()
    }

    async updateDiagramData(){
        // if (cd.browsing == 'rules') {
        //     // cd.filteredData.sort((a,b) => b[sortCriteria.rules] - a[sortCriteria.rules])
        //     // cd.data = cd.filteredData.slice(cd.firstNode, cd.lastNode)
        // } else {
        //     cd.selectedTerms = cd.validTerms.slice(cd.firstNode, cd.lastNode)
        //     cd.data = cd.filteredData.filter(d => d.source.some(t => cd.selectedTerms.includes(t)) || d.target.some(t => cd.selectedTerms.includes(t)));
        // }
        // if (sortCriteria.rules) cd.data.sort((a,b) => b[sortCriteria.rules] - a[sortCriteria.rules])
        if (this.source === 'vis') {
            this.data = this.total.slice(this.firstNode, this.lastNode)
        } else {
            let result = await this.fetchData()
            this.data = result.data;
        }

        document.querySelector('.rotationNavText2').innerHTML = "of " + this.maxNodes + ' ' + this.browsing + (this.browsing == 'terms' ? ' in ' + this.data.length + ' rules' : '')
        // d3.select('div.rotationValueNav').node().innerHTML += "<div class='rotationNavText'> of " + this.maxNodes + ' ' + this.browsing + (this.browsing == 'terms' ? ' in ' + this.data.length + ' rules' : '') + '</div>' //+
            // "<button onclick=switchBrowsing()>Switch to " + (this.browsing == 'rules' ? 'terms' : 'rules') + "</button>"

        this.setChordDiagram()
    }

    switchBrowsing(){
        this.browsing = this.browsing == 'rules' ? 'terms' : 'rules';
        this.maxNodes = this.browsing == 'terms' ? this.validTerms.length : this.filteredData.length;
        let value = this.firstNode + this.visibleNodes;
        this.lastNode = value > this.maxNodes ? this.maxNodes : value; 

        this.updateRotationValueForm()
    }

}
// updateRotationValueForm()

// setChordDiagramView()


