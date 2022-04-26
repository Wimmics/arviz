

function setChordDiagramData(dataset){
    cd.data = dataset;
}

function getRule(source, target) {
    let sources = source.map(e => e.label),
        targets = target.map(e => e.label),
        cluster = source[0].cluster;
    
    return cd.data.filter(d => d.cluster == cluster && d.source.equals(sources) && d.target.equals(targets))[0]
}

function getColor(d){
    return getRule(d.source, d.target).fill;
}

function setChordDiagram(){

    cd.dimensions = {
        'width': width, 
        'height': height,
        'center': {
            'x': width/2,
            'y': height/2
        }
    };

    cd.outerRadius = Math.min(cd.dimensions.width, cd.dimensions.height) * .43,
    cd.innerRadius = cd.outerRadius - 20;

    cd.arc = d3.arc()
        .innerRadius(cd.innerRadius)
        .outerRadius(cd.outerRadius);

    cd.ribbon = d3.ribbon(5)
        .radius(cd.innerRadius)

    if (d3.select('g#g-chords').empty()) {
        const group = d3.select('svg#chord-diagram').append("g")
            .attr("transform", function(){ return transformString("translate", cd.dimensions.center.x, cd.dimensions.center.y); })
            .attr('id', 'g-chords')

        group.append('g').classed('arcs', true)
        group.append('g').classed('chords', true)
        group.append('g').classed('labels', true)
        group.append('g').classed('lines', true) // lines connecting arcs and labels
        group.append('g').classed('ticks', true) // ticks indicating the number of ribbons
        group.append('g').classed('ticks_label', true) // label of ticks
    }

    updateChordDiagram()
}

function updateChordDiagram(){

    // cd.sortingCriteria = arguments[0] || cd.sortingCriteria;

    const generateChords = d3.forkchord()
        .padAngle(.01)
        .sortCriteria(sortCriteria.terms)
        .sortGroups((a, b) => b - a)

    const chordsData = generateChords(cd.data);

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
            .attr("d", cd.arc),
        update => update,
        exit => exit.remove()
    )
    .on('mouseenter', function(d){
        if (dragActive) return;

        d3.selectAll('path.chord').transition()
            .duration(200)
            .style("opacity", e => e.source.some(s => s.index.includes(d.index)) || e.target.some(t => t.subindex.includes(d.index)) ? 1 : .05)
        
        let relatedTerms = cd.filteredData.filter(e => e.source.includes(d.label) || e.target.includes(d.label)).map(e => e.source.concat(e.target))
        
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
    .attrTween('d', arcTween)

    //-----------------------------------------------------------------------
    // chords

    const chordGroup = cdGroup.select('g.chords').selectAll('path').data(d => d)

    chordGroup.join(
        enter => enter.append("path")
            .classed('chord', true)
            .attr("d", cd.ribbon), // add the mouseover here
        update => update,
        exit => exit.remove()
    )
    .styles(d => {
        let rule = getRule(d.source, d.target)
        let color = getColor(d);
        return {
            'stroke' : d3.rgb(color).darker(),
            'stroke-width': 1,
            'fill': rule.isSymmetric ? "url('#"+ color + "-pattern')" : color,
            'opacity': 1
        }
    })
    // .attr('data-tippy-content', d => getTooltipContent(getRule(d.source, d.target)))
    .on('click', d => setDetailsPanel(getRule(d.source, d.target, d.cluster)))
    .on('mouseenter', mouseover)
    .on('mouseleave', mouseout)
    .attr('id', d => getRuleId(getRule(d.source, d.target, d.cluster)))
    .transition('update-chords')
    .duration(1000)
    .attrTween('d', ribbonTween)


    // setTooltip('.chord')

    // -----------------------------------
    // Labels (terms)

    const labelData = chordsData.groups
    labelData.forEach(d => {
        const distance1 = cd.innerRadius + 10,
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
    .duration(1000)
    .attrs(d => {
        return {
            'x': d.angle > Math.PI/2 ? d.x - 45 : d.x + 45,
            'y': d.y
        }
    })
    .style('text-anchor', d => d.angle > Math.PI/2 ? 'end' : 'start')
    .text(d => d.label)
    .style('font-style', d => cd.browsing == 'terms' && cd.selectedTerms.includes(d.label) ? 'italic' : 'normal')

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

    function mouseover(d) {
        if (dragActive) return;

        highlightChord(this.id);
        highlightDetailsPanel(this.id);

        const rule = getRule(d.source, d.target, d.cluster)
        showRuleTooltip(rule)
    }

    function mouseout(){
        removeChordHighlight();
        removeDetailsHighlight()
        hideTooltip()
    }
}

function highlightChord(id){
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

function removeChordHighlight() {
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

function arcTween(a) {
    var i = d3.interpolate(this._current, a);
    this._current = i(0);
    return function(t) {
        return cd.arc(i(t));
    };
}

function ribbonTween(a) {
    var i = d3.interpolate(this._current, a);
    this._current = i(0);
    return function(t) {
        return cd.ribbon(i(t));
    };
}

function updateRotationValue(event){
    cd.visibleNodes = +event.target.value;
    let value = cd.firstNode + cd.visibleNodes;
    cd.lastNode = value > cd.maxNodes ? cd.maxNodes : value;
    value = cd.lastNode - cd.visibleNodes;
    cd.firstNode = cd.lastNode == cd.maxNodes ? value : cd.firstNode;
    clearDetailPanels()
    updateRotationValueForm()
}

function decreaseRotationValue(){
    let value = cd.firstNode - cd.visibleNodes;
    cd.firstNode = value < 0 ? 0 : value;
    value = cd.firstNode + cd.visibleNodes;
    cd.lastNode = value > cd.maxNodes ? cd.maxNodes : value;
    clearDetailPanels()
    updateRotationValueForm()
}

function increaseRotationValue(){
    let value = cd.lastNode + cd.visibleNodes;
    cd.lastNode = value > cd.maxNodes ? cd.maxNodes : value;
    value = cd.lastNode - cd.visibleNodes
    cd.firstNode = value < 0 ? 0 : value;
    clearDetailPanels()
    updateRotationValueForm()
}

function updateRotationValueForm(){
    const htmlContent = '<div class="rotationNavText">' +
        capitalize(cd.browsing) + ' ' + (cd.firstNode + 1) + ' - ' + (cd.lastNode >= cd.maxNodes ? cd.maxNodes : cd.lastNode) + '</div>' +
        "<button id='rotationValuePrevious' onclick=decreaseRotationValue()>Previous</button>" +
        "<input type='text' id='rotationValueInput' onchange=updateRotationValue(event) value= " + cd.visibleNodes + " />" +
        "<button id='rotationValueNext' onclick=increaseRotationValue()>Next</button>" ;

    d3.select('div.rotationValueNav').node().innerHTML = htmlContent;

    updateDiagramData()

} 

function setChordDiagramView(){
    // if (activeChart == 'chord') return;

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

    if (arguments.length == 0) filterDiagramData() 
    else filterDiagramData(arguments[0])
    // else {
    //     cd.filteredData = arguments[0]
    //     cd.maxNodes = cd.filteredData.length;
    //     cd.firstNode = 0;
    //     let value = cd.firstNode + cd.visibleNodes;
    //     cd.lastNode = value > cd.maxNodes ? cd.maxNodes : value;
    //     updateRotationValueForm()
    // } 

    
    // updateRotationValueForm()
}

function filterDiagramData(){

    cd.filteredData = arguments.length > 0 ? arguments[0] : JSON.parse(JSON.stringify(filteredData));

    cd.validTerms = []
    cd.filteredData.forEach(d => {
        d.source.forEach(e => { if (!cd.validTerms.includes(e)) cd.validTerms.push(e); })
        d.target.forEach(e => { if (!cd.validTerms.includes(e)) cd.validTerms.push(e); })
    })
    cd.maxNodes = cd.filteredData.length;
    cd.firstNode = 0;
    let value = cd.firstNode + cd.visibleNodes;
    cd.lastNode = value > cd.maxNodes ? cd.maxNodes : value;
    updateRotationValueForm()
}

function updateDiagramData(){
    if (cd.browsing == 'rules') {
        cd.filteredData.sort((a,b) => b[sortCriteria.rules] - a[sortCriteria.rules])
        cd.data = cd.filteredData.slice(cd.firstNode, cd.lastNode)
    } else {
        cd.selectedTerms = cd.validTerms.slice(cd.firstNode, cd.lastNode)
        cd.data = cd.filteredData.filter(d => d.source.some(t => cd.selectedTerms.includes(t)) || d.target.some(t => cd.selectedTerms.includes(t)));
    }
    if (sortCriteria.rules) cd.data.sort((a,b) => b[sortCriteria.rules] - a[sortCriteria.rules])


    d3.select('div.rotationValueNav').node().innerHTML += "<div class='rotationNavText'> of " + cd.maxNodes + ' ' + cd.browsing + (cd.browsing == 'terms' ? ' in ' + cd.data.length + ' rules' : '') + '</div>' +
        "<button onclick=switchBrowsing()>Switch to " + (cd.browsing == 'rules' ? 'terms' : 'rules') + "</button>"

    setChordDiagram()
}

function switchBrowsing(){
    cd.browsing = cd.browsing == 'rules' ? 'terms' : 'rules';
    cd.maxNodes = cd.browsing == 'terms' ? cd.validTerms.length : cd.filteredData.length;
    let value = cd.firstNode + cd.visibleNodes;
    cd.lastNode = value > cd.maxNodes ? cd.maxNodes : value; 

    updateRotationValueForm()
}
// updateRotationValueForm()

// setChordDiagramView()


