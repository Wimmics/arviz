


function setGraphView(){
    
    setActiveChart('graph')
    displayDetailPanels()
    
    graph.type = arguments[0] ? arguments[0] : graph.type;
    graph.value = arguments[1] === undefined ? graph.value : arguments[1];
    graph.rules = getRules(graph.type, graph.value);


    const div = d3.select('div.viewContainer')
    let graphGroup = d3.select('g#graph-group');

    if (graphGroup.size() == 0) { // if the group does not exist
        if (d3.select('div.graphContainer').empty()) { // the svg may contain only the text info, which means that only the graph group needs to be created
            div.append('div')
                .attr('class', 'dragscroll graphContainer')
                .append('svg')
                .classed('content', true)
                .attr('id', 'graph-view')
                .attrs({
                    'height': '100%',
                    'width': '100%'
                })
        }
        
        graphGroup = d3.select('svg#graph-view').append('g').attr('id', 'graph-group')
        graphGroup.append('line')
            .attrs({
                'x1': '50%',
                'x2': '50%',
                'y1': '40',
                'y2': '85%',
                'class': 'separator'
            })

        graphGroup.append('text')
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


        graphGroup.append('g')
            .classed('node', true)

        graphGroup.append('g')
            .classed('rule', true)
    }else { // the graph already exists
        d3.select('div.graphContainer').style('display', 'block')
        // d3.select('svg#graph-view').style('display', 'block')
    } 
    if (graph.rules.nodes.length == 0) {
        let allRules = filteredData.filter(d => d.source.includes(graph.value) || d.target.includes(graph.value))

        let text = 'It looks like there are no rules within the selection for which "' + graph.value + '" is a' + (graph.type == 'source' ? 'n antecedent' : ' consequent') + '!';
        if (allRules.length > 0) {
            text += ' However, "' + graph.value + '" appears as ' + (graph.type == 'source' ? 'consequent' : 'antecedent') + ' of ' + allRules.length + ' rules. Would you like to view these rules?' 
        } 
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: text,
            showCancelButton: allRules.length > 0,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: allRules.length > 0 ? 'Yes!' : 'OK',
            cancelButtonText: 'No, Cancel!',
            showConfirmButton: true
        }).then((result) => {
            if (result.value) {
                if (allRules.length > 0)
                    setGraphView(graph.type == 'source' ? 'target' : 'source', graph.value)
                else {
                    graphGroup.selectAll('g.edges').remove()
                    graphGroup.selectAll('g.node').remove()
                    graphGroup.selectAll('g.rule').remove()
                    setInfoText()
                }
            }
        })
        return;
    }

    graph.rules.links.forEach(d => {
        d.sourceNode = getNode(d.source);
        d.targetNode = getNode(d.target); 
    })

    d3.select('div.forms').style('display', 'table')
    // d3.select('div.bottom-button').style('display', 'block')

    // clear input fields
    document.getElementById('consequentInput').value = !graph.type || graph.type == 'source' || !graph.value ? '' : graph.value;
    document.getElementById('antecedentInput').value = !graph.type || graph.type == 'target' || !graph.value ? '' : graph.value;

    // remove the visual information regarding the chord diagram
    clearChordDiagram()
    clearScatterPlot()

    if (graphGroup.selectAll('g.edges').empty())
        graphGroup.append('line')
            .attrs({
                'x1': '50%',
                'x2': '50%',
                'y1': '40',
                'y2': '95%',
                'class': 'separator'
            })

    
    if (arguments.length > 0) { // if the action is to create a new graph
        clearDetailPanels()
        graphGroup.selectAll('g.edges').remove()
        graph.currentTerm = null;
        graph.direction = null;
        graph.activeTerms = null;
        graph.renderedNodes = graph.rules.nodes.filter(d => graph.value ? d.type == graph.type : d.type != 'rule')
        computePositions().then(() => {
            setNodes()
            if (graph.value) setRules(getNodesByName(graph.value).filter(d => d.type == graph.type)[0])
        })

    }else if (graph.renderedNodes) {
        computePositions().then(() => {
            setNodes()
            if (graph.renderedNodes.some(d => d.type == 'rule'))
                setEdges()
        })
    } else {
       setInfoText()
    }

    function setInfoText(){
        // setHeatMap(graphGroup)

        const g = graphGroup.append('g')
            .attr('id', 'welcome-text')

        g.append('rect')
            .attrs({
                'x': '0',
                'y': '48%',
                'width': '100%',
                'height': '30px'
            })
            .style('fill', 'white')

        g.append('text')
            .attrs({
                'x': '50%',
                'y': '50%'
            })
            .styles({
                'text-anchor': 'middle'
            })
            .text('To begin the exploration: (1) search a term by antecedent or consequent types above or (2) click on "Display all terms".')
    }
}



function getNode(nodeId){
    return graph.rules.nodes.filter(d => d.id == nodeId)[0];
}

function getNodesByName(name){
    return graph.renderedNodes.filter(d => d.name == name);
}

function mouseover(d) {
    let ruleId = d.id >= 0 ? d.id : d3.select(this.parentNode).datum().rule;

    const edges =  d3.select('g#graph-group').selectAll('g.edges');
    if (edges.size() == 0) return;

    let elements = []
        ruleNodes = [];

    if (['source', 'target'].includes(d.type)) {
        ruleNodes = graph.renderedNodes.filter(d => d.type == 'rule')
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

    let rule = graph.rules.nodes.filter(e => e.id == ruleId)[0]
    if (!['source', 'target'].includes(d.type)) {
        highlightDetailsPanel(getRuleId(rule))
    } 

    if (d.type == 'rule') {
        showRuleTooltip(d)
    } else if (['source', 'target'].includes(d.type)) {
        showArcTooltip(ruleNodes.filter(e => e[d.type].includes(d.name)).length)
    }
    
    closeNav()
}

function highlightGraphRule(id) {
    d3.selectAll('g.edges').transition()
        .duration(500)
        .style('opacity', function() { return this.id == id ? 1 : 0.05; })
}

function removeGraphHighlight(){
    d3.selectAll('g.edges')
        .transition()
        .duration(500)
        .style('opacity', 1)

    removeDetailsHighlight()

    hideTooltip()
}


function computePositions(){
    if (graph.renderedNodes.length == 0) return;

    return new Promise((fulfill, reject) => {
        
        let counts = {'source': {}, 'target': {}}

        function countRules(nodes) {
            counts = {'source': {}, 'target': {}}
            nodes.forEach(d => {
                ['source', 'target'].forEach(type => {
                    d[type].forEach(t => { // t == term
                        if (!Object.keys(counts[type]).includes(t))
                            counts[type][t] = nodes.filter(v => v[type].includes(t)).length;
                    })
                })
            })
        }

        function sortTermsByNbRules() {
            // sort both sides separately 
            const sides = ['source', 'target'];
            sides.forEach(t => {
                graph.renderedNodes.sort((a,b) => {
                    let keys = Object.keys(counts[t])
                    if (a.type == t) {
                        if (a.type == b.type) {
                            if (keys.includes(a.name) && keys.includes(b.name))
                                return sortCriteria.terms == 'alpha' ? a.name.localeCompare(b.name) : counts[t][b.name] - counts[t][a.name]
                            else if (keys.includes(a.name) && !keys.includes(b.name))
                                return -1;
                            else return 1;
                        }else return -1;
                    } else return 1;
                })
            })
        }

        // sort terms according to criteria
        if (sortCriteria.terms == 'alpha') {
            graph.renderedNodes.sort((a,b) => a.type == 'rule' ? 1 : a.name.localeCompare(b.name));
        } else {
            countRules(graph.rules.nodes.filter(d => d.type == 'rule'))
            sortTermsByNbRules();
        }

        // sort terms in a way that position the ones involved to the selected term first
        if (!graph.value && graph.currentTerm && graph.renderedNodes.some(d => d.type == 'rule')) {

            // count the number of rules per term (only the active ones)
            countRules(graph.renderedNodes.filter(d => d.type == 'rule'))
            sortTermsByNbRules();

            // save the terms related to the active rules for aesthetic purposes
            graph.activeTerms = {'source': Object.keys(counts.source), 
                'target': Object.keys(counts.target)};
        }

        // sort rules according to selected criteria
        if (sortCriteria.rules) {
            graph.renderedNodes.sort((a,b) => a.type != 'rule' ? 1 : b[sortCriteria.rules] - a[sortCriteria.rules])
        }

        // indexing nodes for displaying
        let counter = {'rule': 0, 'source': 0, 'target': 0}
        graph.renderedNodes.forEach(d => {
            d.index = counter[d.type]++;
        })

        // compute the position of nodes
        graph.renderedNodes.forEach(d => {
            d.height = 40;

            d.width = d.type == 'rule' ? 40 : 15;

            d.x = d.type == 'rule' ? 50 : (d.type == 'source' ? 5 : 80);
            d.y = (d.type == 'rule' ? 110 : 110) + (d.height + 20) * d.index;
            d.tx = d.type == 'rule' ? d.x : d.x + d.width / 2;
            d.ty = d.y + (d.height / 2 + 5);
        })

        // update the height of the svg according to the number of nodes displayed
        let maxY = d3.max(graph.renderedNodes, d => d.y);
        maxY = maxY < height ? height : maxY + 100;
        d3.select('svg#graph-view').attr('height', maxY)

        fulfill(graph.renderedNodes)
    })
}


function setNodes(){

    const graphGroup = d3.select('g#graph-group')

    graphGroup.select('g#welcome-text').remove()
    d3.select('g#graph-group').select('text#rule-title')
        .style('display', graph.renderedNodes.some(d => d.type == 'rule') ? 'block' : 'none')

    const rects = graphGroup.select('g.node').selectAll('rect').data(graph.renderedNodes.filter(d => d.type != 'rule')),
        texts = graphGroup.select('g.node').selectAll('text').data(graph.renderedNodes.filter(d => d.type != 'rule')),
        squares = graphGroup.select('g.rule').selectAll('rect').data(graph.renderedNodes.filter(d => d.type == 'rule'));

    rects.join(
        enter => enter.append('rect')
            .attrs(d => {
                return {
                    'width': d.width + '%',
                    'height': d.height,
                    'fill': 'white'
                }
            })
            .on('click', setRules)
            .on('mouseenter', mouseover)
            .on('mouseleave', removeGraphHighlight)
            .on('contextmenu', d3.contextMenu(menu)),
        update => update,
        exit => exit.remove()
    )
    // .transition()
    // .duration(1000)
    .attrs((d,i) => {
        return {
            x: d.x + '%',
            y: d.y
        }
    })
    .styles(getShapeStyle)


    width = d3.select('div.graphContainer').node().clientWidth;

    texts.join(
        enter => enter.append('text')
            .on('click', setRules)
            .on('mouseenter', mouseover)
            .on('mouseleave', removeGraphHighlight)
            .on('contextmenu', d3.contextMenu(menu)),
        update => update,
        exit => exit.remove()
    )
    .text(d => d.name)
    .attrs(function(d,i){
        return {
            x: d.tx + '%',
            y: this.getComputedTextLength() > width * 14/100 ? d.ty - 8 : d.ty
        }
    })
    .call(wrap, width * 14/100, d => width * d.tx / 100)
    .transition()
    .duration(1500)
    .styles(getTextStyle)

    

    squares.join(
        enter => enter.append('rect')
            .classed('g-rule', true),
        update => update,
        exit => exit.remove()
    )
    .on('mouseenter', mouseover)
    .on('mouseleave', removeGraphHighlight)
    .on('click', setDetailsPanel)
    .transition()
    .duration(500)
    .attrs(d => {
        return {
            'width': d.width,
            'height': d.height,
            'transform': `translate(${width/2}, ${d.y})rotate(45)`
        }
    }).attrs(getShapeStyle)

    
    // create tooltip container for each rule
    // setTooltip('.g-rule')
}

function getShapeStyle(d){
   
    return {
        'fill': graph.value && d.name == graph.value ? '#f1f1f1' : (d.type == 'rule' ? (d.isSymmetric ? "url('#"+ d.fill + "-pattern')" : d.fill) : 'white'),
        'stroke-width': d.id == graph.currentTerm ? 3 : 1,
        'stroke': d.type == 'rule' ? 'none' : '#000',
        'color': d.type == 'rule' ? 'white' : 'black',
        'opacity': graph.value || !graph.activeTerms || d.type == 'rule' ? 1 : (graph.activeTerms[d.type].includes(d.name) ? 1 : .3),
        'cursor': 'pointer'
    } 
}

function getTextStyle(d){
    return {
        'opacity': graph.value || !graph.activeTerms ? 1 : (graph.activeTerms[d.type].includes(d.name) ? 1 : .3),
        'text-anchor': 'middle',
        'font-weight': 'normal',
        'cursor': 'pointer'
    }
}

// select the rule nodes and the terms that must be displayed upon the selection of a term in one of the sides
function setRules(d){
    if (d.type == 'rule' || d.id == graph.currentTerm) return;

    d3.select('div.graphContainer').node().scrollTo(0, 0);

    graph.direction = d.type == 'source' ? 'target' : 'source';

    // select rule connected to the selected term while keeping every term
    graph.renderedNodes = graph.rules.nodes.filter(e => e.type == 'rule' ? e[d.type].includes(d.name) : true)
    // verify whether the "other side" terms should be totally kept as well
    if (graph.value) {
        const validTerms = graph.renderedNodes.filter(e => e.type == 'rule').map(e => e[graph.direction])
        graph.renderedNodes = graph.renderedNodes.filter(e => e.type == graph.direction ? validTerms.some(t => t.includes(e.name)) : true)
    }

    d3.selectAll('line').remove()
    graph.currentTerm = d.id;
    computePositions().then(() => {
        setNodes()
        setEdges()

        d3.select('svg#graph-view').selectAll('g.node').selectAll('rect').styles(getShapeStyle)
    })
}

/*
    Display links towards rules
*/
function setEdges(){
    const graphGroup = d3.select('g#graph-group');

    let ruleNodes = graph.renderedNodes.filter(d => d.type == 'rule')
    
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

        let sourceNodes = d.source.map(e => getNodesByName(e).filter(a => a.type == 'source')[0]),
            targetNodes = d.target.map(e => getNodesByName(e).filter(a => a.type == 'target')[0]),
            rule = graph.renderedNodes.filter(e => e.id == d.id)[0],
            center = (Math.sqrt(2) * d.width)/2,
            rx = rule.x / 100 * width,
            ry = rule.y + center,
            y = top + (linkDistance * i),
            x = ((sourceNodes[0].x + sourceNodes[0].width) / 100 * width + rx) / 2 ;

        sourceNodes.forEach(e => {
            links[i].points.push({'x': (e.x + e.width) / 100 * width, 'y': e.y + e.height / 2})
            links[i].points.push({'x': x, 'y': y, 'linkingNode': true}) // central vertical point of antecedents
        })

        links[i].points.push({'x': rx - center, 'y': ry}) // rule position
        links[i].points.push({'x': rx + center, 'y': ry}) // rule position

        x = (rx + targetNodes[0].x / 100 * width) / 2;

        targetNodes.forEach(e => {
            links[i].points.push({'x': x, 'y': y, 'linkingNode': true}) // central vertical point of consequents
            links[i].points.push({'x': e.x / 100 * width, 'y': e.y + e.height / 2})
        })
    })

    const lineGenerator = d3.line()
        .x(d => d.x)
        .y(d => d.y)

    graphGroup.selectAll('g.edges').remove()

    const edgeGroup = graphGroup.selectAll('g.edges')
        .data(links)
        .enter()
            .append("g")
            .classed('edges', true)
            .attr('id', d => {
                let rule = graph.rules.nodes.filter(e => e.id == d.rule)[0];
                return getRuleId(rule)
            })

    const path = edgeGroup.append("path")
        .classed('edge', true)
        .attr('d', d => lineGenerator(d.points))


    path.attr("stroke-dasharray", function() { return this.getTotalLength()})
        .attr("stroke-dashoffset", function() { let totalLength = this.getTotalLength(); return graph.direction == 'source' ? -totalLength : totalLength; })
        .transition()
            .duration(700)
            .ease(d3.easeLinear) 
            .attr("stroke-dashoffset", 0);

    // draw intermediary nodes
    let linkingNodes = edgeGroup.selectAll('circle')
        .data(d => d.points.filter(p => p.linkingNode))
        .enter()
        .append('circle')
        .attrs(d => {
            return {
                'cx': d.x,
                'cy': d.y,
                'r': 6
            }
        })
        .styles(function(d){
            return {
                'fill': '#000',
                'stroke': '#000'
            }
        })
        .on('mouseenter', mouseover)
        .on('mouseleave', removeGraphHighlight)
    
    linkingNodes.style('opacity', '0')
        .transition()
        .duration(500)
        .ease(d3.easeLinear)
        .style('opacity', '1')

    // bring rules to front
    graphGroup.selectAll("g.rule").raise()

}  

function getRules(type, value){
    let rules = {'nodes': [], 'links':[]}
    
    function pushNode(d){
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
            'fill': d.fill,
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

    // filter data according to whether the user chose ascendent, consequent or all rules
    let validRules = filteredData.slice(0, 1000)
    if (value) {
        validRules = filteredData.filter(d => d[type].includes(value))
    }
    // console.log(filteredData)
    // console.log(validRules)
    validRules.forEach(pushNode)
    return rules
}


// setGraphView('source', null)
// setGraph('source', null)

// setGraph('source', 'cough')
