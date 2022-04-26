let legend = {},
    filtering = {},
    sortCriteria = {'terms': 'alpha', 'rules': null}

function setColors(){
    const confBreaks = ss.jenks(data.rules.map(d => +d.confidence), 3),
        intBreaks = ss.jenks(data.rules.map(d => +d.interestingness), 3);

    const confScale = d3.scaleThreshold()
        .domain([confBreaks[1], confBreaks[2]])
        .range(['low', 'medium', 'high'])

    const intScale = d3.scaleThreshold()
        .domain([intBreaks[1], intBreaks[2]])
        .range(['low', 'medium', 'high'])

    const colors = [ "#ccc", "#b2dede", "#5ac8c8",
        "#dfb0d6", "#a5add3", "#5698b9", 
        "#be64ac", "#8c62aa", "#3b4994"].reverse()

    legend.values = ['high high', 'high medium', 'high low',
        'medium high', 'medium medium', 'medium low',
        'low high', 'low medium', 'low low']

    legend.bivariateColorScale = d3.scaleOrdinal()
        .domain(legend.values)
        .range(colors)

    data.rules.forEach(d => {
        const confGroup = confScale(d.confidence)
        const intGroup = intScale(d.interestingness)
        d.fill = legend.bivariateColorScale(`${confGroup} ${intGroup}`)
    })

    legend.extent = {
        'conf': {
            'min': confBreaks[0],
            'max': confBreaks[confBreaks.length - 1]
        },
        'int': {
            'min': intBreaks[0],
            'max': intBreaks[intBreaks.length - 1]
        }
    }

    //-------------------------------------------------------------
    // pattern fill (for symmetry)
    const defs = d3.select('div#legend')
        .append('svg')
        .attr('width', '100%')
        .append("defs");

    colors.push("#000") // pattern for legend

    const patternSize = 7;
    const pattern = defs.selectAll('pattern')
        .data(colors)
        .enter()
        .append("pattern")
            .attr('patternUnits', 'userSpaceOnUse')
            .attr("id", fill => `${fill}-pattern`)
            .attr("height", patternSize)
            .attr("width", patternSize)
            
    pattern.append('rect')
        .attr('width', patternSize)
        .attr('height', patternSize)
        .style('fill', d => d)

    pattern.append('circle')
        .attrs({
            'cx': 3,
            'cy': 3,
            'r': 2,
            'fill': 'white'
        })
    
}    



function setFilteringCriteria(){

    // recover unique terms in the dataset (concatenate arrays created in the index.ejs file)
    let terms = [];
    data.rules.forEach(d => {
        d.source.forEach(e => terms.push(e))
        d.target.forEach(e => terms.push(e))
    })
    terms = terms.filter((d,i) => terms.indexOf(d) == i)
    terms = terms.map(d => {
        let rules = data.rules.filter(e => e.source.includes(d) || e.target.includes(d));
        return {
            'type': 'term',
            'value': d,
            'label': d.charAt(0).toUpperCase() + d.slice(1),
            'nbRules': rules.length
        }
    })
    terms = terms.filter(d => d.nbRules > 0)

    const rangeValues = {
        'confMin': d3.min(data.rules, d => d.confidence),
        'confMax': d3.max(data.rules, d => d.confidence),
        'intMin': d3.min(data.rules, d => d.interestingness),
        'intMax': d3.max(data.rules, d => d.interestingness)
    }

    filtering = {'terms': terms,
                'symmetry': true,
                'no_symmetry': true,
                'conf': {'min': rangeValues.confMin, 'max': rangeValues.confMax, 'step': 0.02, 'avg': (rangeValues.confMin + rangeValues.confMax) / 2},
                'int': {'min': rangeValues.intMin, 'max': rangeValues.intMax, 'step': 0.05, 'avg': (rangeValues.intMin + rangeValues.intMax) / 2}}

    if (data.appli === 'covid') {
        // recover unique clusters in the dataset
        let clusters = data.rules.map(d => {
            return {
                'type' : d.cluster_type,
                'cluster': d.cluster
            }
        }).filter(d => d.cluster != 'no_clustering')

        clusters = clusters.filter((d,i) => clusters.indexOf(d) == i)
        clusters = clusters.map((d,i) => {
            let rules = data.rules.filter(e => e.cluster == d.cluster),
                terms = rules.map(e => e.source.concat(e.target)),
                uniqueTerms = [];
            terms.forEach(e => { uniqueTerms = uniqueTerms.concat(e)})
            uniqueTerms = uniqueTerms.filter((e,i) => uniqueTerms.indexOf(e) == i)
            return {
                'type': d.type,
                'value': d.cluster,
                'label': d.cluster,
                'nbRules': rules.length,
                'nbTerms': uniqueTerms.length
            }
        })

        filtering['no_clustering'] = true
        filtering['clusters_articles'] = clusters.filter(d => d.type == 'article')
        filtering['clusters_terms'] = clusters.filter(d => d.type == 'label')
        filtering['clusters_both'] = clusters.filter(d => d.type == 'label_article')
    }
            
}


// info icon
function setInfoIcon(node) {
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

//----------------------------------------------------------
// set legend panel
function setLegends(chart){
            
    const div = d3.select('div#legend').styles({
            'width': '250px',
            'height': '250px',
            'overflow': 'hidden'
        }),
        width = div.node().clientWidth,
        legendwidth = 80;
    
    setCloseIcon(div).on('click', closeNav)

    div.selectAll('span').style('top', '-155px')

    const svg = div.append('svg')
        .attrs({
            'width': '100%',
            'height': '100%',
            'id': 'legend-container'
        })
        .styles({
            'position': 'relative',
            'text-align': 'center',
            'top': '-160px',
            'left': '30px'
        })

    const rectWidth = legendwidth / 3;
    let top = 10,
        left = legendwidth;

    const legendSvg = svg.append('g')
        .attr('id', 'legend-confint')

    const rects = legendSvg.selectAll('rect')
        .data(legend.values)
        .enter()
            .append('rect')
            .attrs((d,i) => {
                return {
                    'x': rectWidth * Math.floor(i / 3),
                    'y': rectWidth * (i % 3),
                    'width': rectWidth,
                    'height': rectWidth
                }
            })
            .styles(d => {
                const fill = legend.bivariateColorScale(d);
                return {
                    'fill': fill, 
                    'stroke': d3.rgb(fill).darker()
                }
            })

    rects.append('title')
        .text(d => d.split(' ')[0] + ' confidence, ' + d.split(' ')[1] + ' interestingness')


    svg.append('defs')
        .append('marker')
        .attrs({
            'id': 'arrow',
            'markerWidth': 10,
            'markerHeight': 10,
            'refX': 0,
            'refY': 3,
            'orient': "auto",
            'markerUnits':"strokeWidth",
            'viewBox':"0 0 20 20"
        })
        .append('path')
        .attr('d', 'M0,0 L0,6 L9,3 z')
        .style('fill', '#000')

    const lines = [{'x1': legendwidth, 'x2': -5, 'y1': legendwidth, 'y2': legendwidth},
        {'x1': legendwidth, 'x2': legendwidth, 'y1': legendwidth, 'y2': -5}]

    legendSvg.selectAll('lines')
        .data(lines)
        .enter()    
            .append('line')
            .attrs(d => d)
            .attr('marker-end', "url(#arrow)")
            .styles({
                'stroke': 'black',
                'stroke-width': 2
            })

    const titleData = [
        {'label':'Confidence', 'value': 'conf', 'x': legendwidth/2 - 5, 
            'y': legendwidth + 10, 
            'rotate': 0},
        {'label':'Interestingness', 'value': 'int', 'x': legendwidth + 10, 
            'y': legendwidth/2 - 5, 
            'rotate': -90}]

    legendSvg.selectAll('text')
        .data(titleData)
        .enter()
            .append('text')
            .attr('transform', (d, i) => `translate(${d.x}, ${d.y})rotate(${d.rotate})`)
            .text(d => d.label)
            .styles({
                'text-anchor': 'middle',
                'fill': '#000',
                'font-size': '12px'
            })
            .style('cursor', 'help')
            .append('title')
            .text(d => d.label + ' ranges from ' + legend.extent[d.value].min + ' to ' + legend.extent[d.value].max)

    legendSvg.attr('transform', `translate(${left}, 0)rotate(45)`)

    // ---------------------------------------------------------------
    // symmetry legend
    top = 150;
    left = 25;
    const rectSide = 15;
    
    const symGroup = svg.append('g')
        .attr('id', 'legend-symmetry')
        .attr('transform', `translate(${left}, ${top})`)

    symGroup.append('text')
        .style('fill', '#000')
        .attrs({
            'x': 0,
            'y': 0
        })
        .text('The rule is')

    const input = ['Symmetric', 'Not symmetric']    
    group = symGroup.selectAll('g.symm')
        .data(input)
        .enter()
            .append('g')
        
    group.append('rect')
        .attrs((_,i) => {
            return {
                'x': 0,
                'y': 5 + (20 * i),
                'width': 15,
                'height': 15
            }
        })
        .styles((d,i) => {
            return {
                'fill': i == 0 ? "url('##000-pattern')" : '#000'
            }
        })
    group.append('text')
        .attrs((_,i) => {
            return {
                'x': 20,
                'y': 15 + (chart == 'chord-diagram' ? 5: 0) + (20 * i)
            }
        })
        .style('fill', '#000')
        .text(d => d)
    
    div.style('width', '0')
}



function setSortPanel(){
    const div = d3.select('div#data-sort')
        .styles({
            'width': '250px',
            'height': '200px',
            'overflow': 'hidden'
        })
    
    div.append('text')
        .text('Data Sorting')
        .styles({
            'font-weight': 'bold'
        })
        
    setCloseIcon(div).on('click', closeNav)

    const options = [
        {'label': 'Sort terms by',
        'value': 'terms',
        'type': 'sorting',
        'help': 'Sort the terms in a descending order according to the selected criteria.<br>' +
                'In the chord diagram, the terms are placed on a clockwise direction around the circle.<br>' + 
                'This sorting criterium also affects the order of terms in the browsing feature under the chord diagram',
        'children': [
            {'label': 'Alphabetic Order', 'value': 'alpha'},
            {'label': 'Number of Rules', 'value': 'nbrules'}
        ]},
        {'label': 'Sort rules by',
        'value': 'rules',
        'type': 'sorting',
        'help': 'Sort the displayed rules in a descending order according to the selected criteria. <br>' + 
            'In the chord diagram, the rules (ribbons) are placed over a clockwise direction within each arc.',
        'children': [
            {'label': 'None', 'value': null},
            {'label': 'Confidence', 'value': 'confidence'},
            {'label': 'Interestingness', 'value': 'interestingness'}
        ]}
    ]

    let form = div.selectAll('div')
        .data(options)
        .enter()
            .append('div')
            .classed('sorting-div', true)
    
    form.append('text')
        .text(d => d.label)

    setInfoIcon(form)

    // add select forms for sorting
    let select = form.append('select')
        .classed("btn btn-default dropdown-toggle", true)
        .style('width', '90%')
        .attr('name', 'sorting')
        .on('change', function(d){
            sortCriteria[d.value] = this.options[this.selectedIndex].value;
            sortTerms()
            // update the charts accordingly
            if (activeChart == 'chord') {
                setChordDiagramView();
            } else {
                computePositions().then(() => {
                    setNodes()
                    if (!d3.selectAll('g.edges').empty()) setEdges()
                })
            }
    })

    select.selectAll('option')
        .data(d => d.children)
        .enter()
            .append('option')
            .attr('value', d => d.value)
            .text(d => d.label)

    div.style('width', 0)

}

// filtering panel
function setFilterPanel(){
    const div = d3.select('div#data-filter')
        .styles({
            'width': '270px',
            'height': '50%',
            'overflow-y': 'auto',
            'overflow-x': 'hidden'
        })

    div.append('text')
        .text('Data Filtering')
        .styles({
            'position': 'relative',
            'font-weight': 'bold',
            'top': '10px',
            'left': '10px'
        })
    
    setCloseIcon(div).on('click', closeNav)

    let filterData = [
        {'label': 'Terms', 'value': 'terms', 
        'help': 'Clusters have preference over terms. Thus, if the selected term does not belong to a selected cluster, it will not be shown.',
        'children': [
            // filter terms per subject (ask Lucie for the list with terms and subjects) or direct selection
            {'label': 'select from the list', 'value': 'terms', 'type': 'dropdown',
                'children': [{'value':'all', 'label': 'All Terms', 'nbRules': data.rules.length, 'nbTerms': filtering.terms.length}].concat(filtering.terms.sort((a,b) => a.value.localeCompare(b.value)))}
        ]},
        {'label': 'Mesures of Interest', 'value': 'mesures', 
        'children': [
            {'label': 'Confidence', 'value': 'conf', 'type': 'group_range', 'min': filtering.conf.min, 'max': filtering.conf.max,
            'children': [
                {'value': 'conf-a', 'selected': filtering.conf.min, 'min': filtering.conf.min, 'max': filtering.conf.avg},
                {'value': 'conf-b', 'selected': filtering.conf.max, 'min': filtering.conf.avg + filtering.conf.step, 'max': filtering.conf.max}
            ]},
            {'label': 'Interestingness', 'value': 'int', 'type': 'group_range', 'min': filtering.int.min, 'max': filtering.int.max,
            'children': [
                {'value': 'int-a', 'selected': filtering.int.min, 'min': filtering.int.min, 'max': filtering.int.avg},
                {'value': 'int-b', 'selected': filtering.int.max, 'min': filtering.int.avg + filtering.int.step, 'max': filtering.int.max}
            ]},
            {'value': 'symmetry', 'checked': true, 'label': 'Symmetric Rules', 'type': 'checkbox'},
            {'value': 'no_symmetry', 'checked': true, 'label': 'Non-Symmetric Rules', 'type': 'checkbox'}
        ]}
    ]   

    if (data.appli === 'covid') {
        filterData.push({'label': 'Clusters', 'value': 'clusters', 
        'children': [
            {'value': 'no_clustering', 'checked': true, 'label': 'No Clustering', 'type': 'checkbox'},
            {'label': 'of papers', 'value': 'clusters_articles', 'type': 'dropdown',
                'children': [{'value':'all', 'label': 'All', 
                            'nbRules': data.rules.filter(d => d.cluster_type == 'article').length}].concat(filtering.clusters_articles)},
            {'label': 'of terms', 'value': 'clusters_terms', 'type': 'dropdown',
                'children': [{'value':'all', 'label': 'All', 
                            'nbRules': data.rules.filter(d => d.cluster_type == 'label').length}].concat(filtering.clusters_terms)},
            {'label': 'of papers and terms', 'value': 'clusters_both', 'type': 'dropdown',
                    'children': [{'value':'all', 'label': 'All', 
                                'nbRules': data.rules.filter(d => d.cluster_type == 'label_article').length}].concat(filtering.clusters_both)}
        ]})
    }

    let filterActive = false;
            
    // filtering 
    const filterGroup = div.selectAll('div')
        .data(filterData)
        .enter()
            .append('div')
            .classed('filtering-div', true)

    filterGroup.append('text')
        .text(d => d.label)
        .style('font-weight', 'bold')

    const table_tr = filterGroup.selectAll('div')
        .data(d => d.children)
        .enter()
            .append('div')
            .style('width', '90%')

    const checkboxes = table_tr.filter(d => d.type == 'checkbox')   

    checkboxes.append('input')
        .attr('type', 'checkbox')
        .classed('custom-control-input', true)
        .style('float', 'left')
        .style('margin-left', '3.5%')
        .style('transform', 'scale(1.2)')
        .property('checked', true)
        .attr('id', d => d.value)
        .on('change', setFilter)

    checkboxes.append('text')
        .style('position', 'relative')
        .style('left', '5px')
        .append('text')
        .text(d => d.label)

    // dropdowns
    const dropdowns = table_tr.filter(d => d.type == 'dropdown')   
        .append('div')
        .classed('dropdown', true)
        .style('left', '2%')
        .style('display', 'inline')
        .style('width', '100%')


    const ddbtn = dropdowns.append('button')
        .classed("btn btn-default dropdown-toggle", true)
        .on("click", function(d){
            let closed = openDropdown(this)
        
            const _this = this.nextElementSibling;
            if (!closed)
                d3.selectAll('ul.dropdown-menu').style('display', function() { return this == _this ? 'block' : 'none'})
        })
        .text(d => d.label)
        .styles({
            'width': '95%',
            'text-align': 'left',
            'white-space': 'normal'
        })
            
    ddbtn.append('span')
        .classed('glyphicon glyphicon-menu-down', true)
        .styles({
            'margin-right': '2px',
            'float': 'right'
        })


    let ddmenu = dropdowns.append('ul')
        .classed('dropdown-menu', true)
        .styles({
            'height': '250px',
            'overflow-y': 'scroll',
            'overflow-x': 'hidden',
            'top': '20px',
            'width': '100%',
            'z-index': 100
        })

    let table = ddmenu.append('table')
        .attr('id', d => d.value)
    
    let ddmenu_tr = table.selectAll('tr')
        .data(d => d.children)
        .enter()
            .append('tr')
            .style('height', '45px')
            .style('top', '10px')

    ddmenu_tr.append('td')
        .styles({
            'position': 'relative',
            'left': '5px',
            'top': '2px'
        })
        .append('input')
        .attr('type', 'checkbox')
        .classed('custom-control-input', true)
        .style('transform', 'scale(1.2)')
        .property('checked', function(d) { 
            let parentData = d3.select(this.parentNode.parentNode.parentNode).datum()
            return parentData.value.includes('clusters') ? false : true;
        })
        .on('change', setFilter)

    // add the labels
	let labels = ddmenu_tr.append('td')
        .style('position', 'relative')
        .style('left', '5px')
        .style('width', '240px')
        .style('padding', '5px')
        .append('text')

    labels.append('tspan')
        .style('display', 'block')
        .text(d => d.label)

    labels.append('tspan')
        .style('display', 'block')
        .attr('dy', 20)
        .text(d => d.nbRules + ' rule' + (d.nbRules > 1 ? 's' : '') + '' + (d.type == 'cluster' ? ', ' + d.nbTerms + ' terms' : ''))

    labels.filter(d => d.type != 'term' && d.value != 'all')
        .attr('data-tippy-content', d => getClusterSubject(d.value, d.type))
        .classed('config-info', true)


    // range input
    let group_range = table_tr.filter(d => d.type == 'group_range')
    
    let group_td = group_range
        .append('g')
        .attr('id', d => d.value + '-group')
        
    group_td.append('text')
        .style('margin-left', '10px')
        .text(d => d.label)

    group_td.append('text')
        .style('float', 'right')
        .style('margin-right', '10px')
        .attr('id', d => d.value + '-text')
        .text(d => d.min.toFixed(2) + ' - ' + d.max.toFixed(2))
        
    range = group_range.append('td')
        .style('position', 'relative')
        .style('left', '2.5%')
        .style('width', '95%')
        .style('display', 'flex')
        
    range.selectAll('input')
        .data(d => d.children)
        .enter()
            .append('input')
            .styles({
                'min-width': '0', 
                'margin': '0',
                'padding': '0',
                'flex': '1 0 0',
                'border-radius': '0',
                'appearance': 'none'
            })
            .attrs(d => {
                return {
                    'type': 'range',
                    'max': d.max,
                    'min': d.min,
                    'class': 'slider',
                    'step': .01,
                    'id': d.value,
                    'value': d.selected
                }
            })
            .on('mousedown', updateInputRange)
            .on('mouseup', function() {
                let changed = false;
                ['conf', 'int'].forEach(e => {
                    const a = d3.select('input#'+e+'-a').node(),
                        b = d3.select('input#'+e+'-b').node();    

                    changed = changed || filtering[e].min != a.valueAsNumber || filtering[e].max != b.valueAsNumber;
                    filtering[e] = {'min': a.valueAsNumber, 'max': b.valueAsNumber}
                })
                if (changed) updateCharts()
            })

    function updateInputRange(){
        let pivot = null;
        const group = d3.select(this.parentNode.parentNode);

        let range = this.id.split('-')[0];
        
        const a = group.select('input#'+range+'-a').node(),
            b = group.select('input#'+range+'-b').node();
        
        if (this === a){
            if (a.valueAsNumber >= Number(a.max)) {
                pivot = Math.min(filtering[range].max - filtering[range].step, Number(a.max) + filtering[range].step);
            }
        }
        
        if (this === b){
            if (b.valueAsNumber <= Number(b.min)) {
                pivot = Math.max(filtering[range].min, Number(b.min) - filtering[range].step * 2);
            }
        }

        if (pivot){
            a.max = pivot.toFixed(2);
            b.min = (pivot + filtering[range].step).toFixed(2);
        }
        
        group.select('text#'+range+'-text').text(`${(+a.value).toFixed(2)} - ${(+b.value).toFixed(2)}`)
        
        a.style.flexGrow = getStep(a) * 100;
        b.style.flexGrow = getStep(b) * 100;

        function getStep(elem) {
            return Number(elem.max) - Number(elem.min) + filtering[range].step;
        }
    }

    div.style('width', '0')
}

function setUploadFilePanel(){
        const div = d3.select('div#upload-file')
            .styles({
                'width': '270px',
                'height': '50%',
                'overflow-y': 'auto',
                'overflow-x': 'hidden',
                'left': 'calc(100% - 270px)',
                'border-radius': '5px 0px 5px 0px'
            })
    
        div.append('text')
            .text('Change Dataset')
            .styles({
                'position': 'relative',
                'font-weight': 'bold',
                'top': '10px',
                'left': '10px'
            })
        
        setCloseIcon(div).on('click', closeNav)

        const uploadForm = div.append('div')
            .styles({
                'position': 'relative',
                'top': '20px',
                'padding': '5px'
            })

        uploadForm.append('text')
            .text('Select file:') // add an option to show the right format to the user

        uploadForm.append('input')
            .attrs({
                'type': 'file',
                'id': 'data_file',
                'name': 'data_file'
            })
        
        uploadForm.append('button')
            .styles({
                'position': 'relative',
                'width': '50%',
                'left': '25%'
            })
            .text('Submit')
            .on('click', () => { // a finaliser
                const filename = document.getElementById('data_file').value.split('\\')[2];
                console.log(filename)
                const parts = filename.split('.')
                if (parts[parts.length - 1] == 'json') {

                    location.href = location.protocol + '//' + location.host + '/upload-data'
                } else {
                    toast.fire({
                        icon: 'error',
                        title: 'The chosen file extension is not valid. You must upload a ".json" file.'
                    })
                }
            })
        
        
        

}

function updateSearchForms(){

    let antecedents = [], 
        consequents = [];

    filteredData.forEach(d => {
        d.source.forEach(e => {
            antecedents.push(e)
        })
        d.target.forEach(e => {
            consequents.push(e)
        })
    })

    antecedents = antecedents.filter((d,i) => antecedents.indexOf(d) == i)
    consequents = consequents.filter((d,i) => consequents.indexOf(d) == i)

    autocomplete(document.getElementById("antecedentInput"), antecedents);
    autocomplete(document.getElementById("consequentInput"), consequents);
}

function setInfoTooltip(){
    tippy('.config-info', {
        theme: 'light',
        placement: 'right-start', 
        allowHTML: true,
        interactive: true,
        appendTo: document.body,
        followCursor: false,
        delay: [200, 0],
        animation: 'scale'
    })
}

function fireSelectionError(){
    toast.fire({
        icon: 'error',
        title: 'This will delete all rules! Action not allowed.'
    })
}

// update upon a filtering choice
function setFilter() {
    let error = false;
    if (this.id == 'no_clustering' || this.id.includes('symmetry')){
        if (!this.checked) {
            if (this.id == 'symmetry') {
                if (!filtering['no_symmetry'].checked) {
                    error = true;
                    fireSelectionError()
                } 
            } else if (this.id == 'no_symmetry') {
                if (!filtering['no_symmetry'].checked) {
                    error = true;
                    fireSelectionError()
                } 
            } else {
                if (filtering['clusters_articles'].length == 0 && filtering['clusters_terms'].length == 0 && filtering['clusters_both'].length == 0) {
                    error = true;
                    fireSelectionError()
                }
            }
        }

        if (!error) {
            filtering[this.id] = this.checked;
        } else this.checked = !this.checked;
        
    } else {
        let parent = d3.select(this.parentNode.parentNode.parentNode);
        
        if (d3.select(this).datum().value == 'all') {
            if (!this.checked){
                let clusters = Object.keys(filtering).filter(key => key.includes('clusters') && key != parent.datum().value)
                let selected = 0;
                clusters.forEach(key => {
                    selected += filtering[key].length;
                })
                if (!filtering['no_clustering'] && selected == 0) {
                    this.checked = !this.checked;
                    fireSelectionError()
                }
            }
            parent.selectAll('input').property('checked', this.checked)
        } else { // if the user unselect an item, unselect the "all option" since not all items are selected
            parent.selectAll('input')
                .filter(d => d.value == 'all')
                .property('checked', false)
        }
    }

    updateFilteringKeys()
    updateCharts()
}

function updateFilteringKeys(){
    let keys = Object.keys(filtering);
    keys.forEach(key => {
        if (!d3.select('table#'+key).empty()){
        
            filtering[key] = [];
            d3.select('table#'+key).selectAll('input').nodes().forEach(function(n){
                if (n.checked){
                    filtering[key].push(d3.select(n).datum())
                }
            })
        }
    })
}

function updateCharts(){
    filteredData = getFilteredData(); // update filtered data used in both charts

    const svg = d3.select('svg#' + (activeChart == 'graph' ? 'graph-view' : 'chord-diagram'));
    if (filteredData.length == 0) { // if is empty hide the chart and display a message to the user
        svg.html(null)

        svg.attr('height', '100%')
            .append('text')
            .text('The dataset is empty. Please check your filtering options.')
            .style('text-anchor', 'middle')
            .attrs({
                'x': '50%',
                'y': '50%',
                'id': 'info-text'
            })
    } else { // otherwise update the charts
        svg.select('text#info-text').remove() 

        clearDetailPanels()
        updateSearchForms() // update the valid values in the antecedent and consequent lists

        if (activeChart == 'graph') setGraphView(graph.type, graph.value)
        else if (activeChart == 'chord') filterDiagramData()
        else setScatterPlot()
    }
}






