class ConfigPanel{
    constructor(config) {
        this.legend = {
            intScale: null,
            confScale: null,
            bivariateColorScale: null
        }
        this.filtering = {}
        this.sortCriteria = {'terms': 'alpha', 'rules': null}

        this.config = config
        console.log('config = ', this.config)

        
    }

    getColor(d) {
        const confGroup = this.legend.confScale(d.confidence)
        const intGroup = this.legend.intScale(d.interestingness)
        return this.legend.bivariateColorScale(`${confGroup} ${intGroup}`)
    }

    setColors(){

        this.legend.confScale = d3.scaleThreshold()
            .domain([this.config.min_confidence, d3.mean([this.config.min_confidence, 1]), 1])
            .range(['low', 'medium', 'high'])

        this.legend.intScale = d3.scaleThreshold()
            .domain([this.config.min_interestingness, d3.mean([this.config.min_interestingness, 1]), 1])
            .range(['low', 'medium', 'high'])

        const colors = [ "#ccc", "#b2dede", "#5ac8c8",
            "#dfb0d6", "#a5add3", "#5698b9", 
            "#be64ac", "#8c62aa", "#3b4994"].reverse()

        this.legend.values = ['high high', 'high medium', 'high low',
            'medium high', 'medium medium', 'medium low',
            'low high', 'low medium', 'low low']

        this.legend.bivariateColorScale = d3.scaleOrdinal()
            .domain(this.legend.values)
            .range(colors)

        this.extent = {
            'conf': { 'min': this.config.min_confidence, 'max': 1 },
            'int': { 'min': this.config.min_interestingness, 'max': 1 }
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


    setFilteringCriteria(){

        this.filtering = {'symmetry': true,
                    'no_symmetry': true,
                    'conf': {'min': this.extent.conf.min, 'max': this.extent.conf.max, 'step': 0.02, 'avg': d3.mean([this.extent.conf.min, this.extent.conf.max])},
                    'int': {'min': this.extent.int.min, 'max': this.extent.int.max, 'step': 0.05, 'avg': d3.mean([this.extent.int.min, this.extent.int.max])}}

        this.config.methods.forEach(d => {
            this.filtering[d.key] = true;
        })

        this.config.lang.forEach(d => {
            this.filtering[d] = true;
        })
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

    //----------------------------------------------------------
    // set legend panel
    setLegends(){
                
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
            .data(this.legend.values)
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
                    const fill = this.legend.bivariateColorScale(d);
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
                .text(d => d.label + ' ranges from ' + this.extent[d.value].min + ' to ' + this.extent[d.value].max)

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
        let group = symGroup.selectAll('g.symm')
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
                    'y': 15 + (20 * i)
                }
            })
            .style('fill', '#000')
            .text(d => d)
        
        div.style('width', '0')
    }

    sortTerms(data){
        let values = data.map(d => d.source.concat(d.target)).flat()
        values = values.filter( (d,i) => values.indexOf(d) === i)
    }

    setSortPanel(){
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

        this.setInfoIcon(form)

        // add select forms for sorting
        const _this = this;
        let selection = form.append('select')
            .classed("btn btn-default dropdown-toggle", true)
            .style('width', '90%')
            .attr('name', 'sorting')
            .on('change', function(d){
                _this.sortCriteria[d.value] = this.options[this.selectedIndex].value;
                charts[activeChart].update()
        })

        selection.selectAll('option')
            .data(d => d.children)
            .enter()
                .append('option')
                .attr('value', d => d.value)
                .text(d => d.label)

        div.style('width', 0)

    }

    // filtering panel
    setFilterPanel(){
        const _this = this;
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
            {'label': 'Mesures of Interest', 'value': 'mesures', 
            'children': [
                {'label': 'Confidence', 'value': 'conf', 'type': 'group_range', 'min': this.filtering.conf.min, 'max': this.filtering.conf.max,
                'children': [
                    {'value': 'conf-a', 'selected': this.filtering.conf.min, 'min': this.filtering.conf.min, 'max': this.filtering.conf.avg},
                    {'value': 'conf-b', 'selected': this.filtering.conf.max, 'min': this.filtering.conf.avg + this.filtering.conf.step, 'max': this.filtering.conf.max}
                ]},
                {'label': 'Interestingness', 'value': 'int', 'type': 'group_range', 'min': this.filtering.int.min, 'max': this.filtering.int.max,
                'children': [
                    {'value': 'int-a', 'selected': this.filtering.int.min, 'min': this.filtering.int.min, 'max': this.filtering.int.avg},
                    {'value': 'int-b', 'selected': this.filtering.int.max, 'min': this.filtering.int.avg + this.filtering.int.step, 'max': this.filtering.int.max}
                ]},
                {'value': 'symmetry', 'checked': true, 'label': 'Symmetric Rules', 'type': 'checkbox'},
                {'value': 'no_symmetry', 'checked': true, 'label': 'Non-Symmetric Rules', 'type': 'checkbox'}
            ]}          
            
        ]  
        
        if (this.config.methods.length) {
            filterData.push({'label': 'Methods of Rules Extraction', 'value': 'methods',
            'children': this.config.methods.map(d => { 
                return {value: d.key, checked: true, label: d.label, type: 'checkbox'}
            }) })
        }

        if (this.config.lang.length) {
            filterData.push({'label': 'Language', 'value': 'lang',
            'children': this.config.lang.map(d => { 
                return {value: d, checked: true, label: d, type: 'checkbox'}
            }) })
        }
                
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
            .on('change', function(d) { _this.handleCheckbox(this) })

        checkboxes.append('text')
            .style('position', 'relative')
            .style('left', '5px')
            .append('text')
            .text(d => d.label)

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
            
        let range = group_range.append('td')
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
                .on('mousedown', function(d) { _this.updateInputRange(this) })
                .on('mouseup', () => {
                    let changed = false;
                    ['conf', 'int'].forEach(e => {
                        const a = d3.select('input#'+e+'-a').node(),
                            b = d3.select('input#'+e+'-b').node();    

                        changed = changed || this.filtering[e].min != a.valueAsNumber || this.filtering[e].max != b.valueAsNumber;
                        this.filtering[e] = { 'min': a.valueAsNumber, 'max': b.valueAsNumber }
                    })
                    if (changed) {
                        charts[activeChart].update()
                    }
                })

        div.style('width', '0')
    }

    updateInputRange(elem){
        console.log(this)
        let pivot = null;
        const group = d3.select(elem.parentNode.parentNode);

        let range = elem.id.split('-')[0];
        
        const a = group.select('input#'+range+'-a').node(),
            b = group.select('input#'+range+'-b').node();
        
        if (elem === a){
            if (a.valueAsNumber >= Number(a.max)) {
                pivot = Math.min(this.filtering[range].max - this.filtering[range].step, Number(a.max) + this.filtering[range].step);
            }
        }
        
        if (elem === b){
            if (b.valueAsNumber <= Number(b.min)) {
                pivot = Math.max(this.filtering[range].min, Number(b.min) - this.filtering[range].step * 2);
            }
        }

        if (pivot){
            a.max = pivot.toFixed(2);
            b.min = (pivot + this.filtering[range].step).toFixed(2);
        }
        
        group.select('text#'+range+'-text').text(`${(+a.value).toFixed(2)} - ${(+b.value).toFixed(2)}`)
        
        const getStep = (elem) => {
            return Number(elem.max) - Number(elem.min) + this.filtering[range].step;
        }

        a.style.flexGrow = getStep(a) * 100;
        b.style.flexGrow = getStep(b) * 100;

        
    }

    // update upon a filtering choice
    handleCheckbox(elem) {

        this.filtering[elem.id] = elem.checked;

        // this.updateFilteringKeys()
        console.log(activeChart)
        charts[activeChart].update()
    }

    getMethods() {
        let unckeck_methods = this.config.methods.filter(d => !this.filtering[d.key])
        return unckeck_methods.map(d => d.key)
    }

    getLanguages() {
        let unckeck_langs = this.config.lang.filter(d => !this.filtering[d])
        return unckeck_langs.map(d => d)
    }

    async filterData(data) {
        // apply confidence and interestingness filters
        data = data.filter(d => d.confidence >= this.filtering.conf.min && d.confidence <= this.filtering.conf.max && 
            d.interestingness >= this.filtering.int.min && d.interestingness <= this.filtering.int.max)

        // apply symmetry filter
        data = data.filter(d => this.filtering.symmetry && this.filtering.no_symmetry ? true : 
            (this.filtering.symmetry ? d.isSymmetric : (this.filtering.no_symmetry ? !d.isSymmetric : false)))
        
        let unckeck_methods = this.config.methods.filter(d => !this.filtering[d.key])
        unckeck_methods = unckeck_methods.map(d => d.key)
        data = data.filter(d => !unckeck_methods.some(e => d.cluster.includes(e)) )

        return data
    }

    // updateFilteringKeys(){
    //     let keys = Object.keys(this.filtering);
    //     keys.forEach(key => {
    //         if (!d3.select('table#'+key).empty()){
            
    //             this.filtering[key] = [];
    //             d3.select('table#'+key).selectAll('input').nodes().forEach(function(n){
    //                 if (n.checked){
    //                     this.filtering[key].push(d3.select(n).datum())
    //                 }
    //             })
    //         }
    //     })
    // }

}

// function updateCharts(){
//     filteredData = getFilteredData(); // update filtered data used in both charts

//     const svg = d3.select('svg#' + (activeChart == 'graph' ? 'graph-view' : 'chord-diagram'));
//     if (filteredData.length == 0) { // if is empty hide the chart and display a message to the user
//         svg.html(null)

//         svg.attr('height', '100%')
//             .append('text')
//             .text('The dataset is empty. Please check your filtering options.')
//             .style('text-anchor', 'middle')
//             .attrs({
//                 'x': '50%',
//                 'y': '50%',
//                 'id': 'info-text'
//             })
//     } else { // otherwise update the charts
//         svg.select('text#info-text').remove() 

//         clearDetailPanels()
//         updateSearchForms() // update the valid values in the antecedent and consequent lists

//         if (activeChart == 'graph') setGraphView(graph.type, graph.value)
//         else if (activeChart == 'chord') filterDiagramData()
//         else setScatterPlot()
//     }
// }






