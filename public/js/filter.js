class FilterPanel extends ConfigPanel {
    constructor(config) {
        super(config)

        this.filtering = {}
        this.title = "Data Filtering"
    }

    init() {
        this.setFilteringCriteria()

        this.data = [
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

        if (this.config.methods.length && this.config.methods.length > 1) {
            this.data.push({'label': 'Methods of Rules Extraction', 'value': 'methods',
                'children': this.config.methods.map(d => { 
                    return {value: d.key, checked: true, label: d.label, type: 'checkbox'}
                }) })
        }

        if (this.config.lang.length && this.config.lang.length > 1) {
            this.data.push({'label': 'Language', 'value': 'lang',
                'children': this.config.lang.map(d => { 
                    return {value: d, checked: true, label: d, type: 'checkbox'}
                }) })
        }

        this.set()
    }

    setFilteringCriteria(){

        this.filtering = {'symmetry': true,
                    'no_symmetry': true,
                    'conf': {'min': this.extent.conf.min, 'max': this.extent.conf.max, 'step': 0.02, 'avg': d3.mean([this.extent.conf.min, this.extent.conf.max ])},
                    'int': {'min': this.extent.int.min, 'max': this.extent.int.max, 'step': 0.05, 'avg': d3.mean([ this.extent.int.min, this.extent.int.max ])}}

        this.config.methods.forEach(d => {
            this.filtering[d.key] = true;
        })

        this.config.lang.forEach(d => {
            this.filtering[d] = true;
        })
    }

     // filtering panel
     set(){
        const _this = this;
        this.div = d3.select(this.dashboard.shadowRoot.querySelector('div#data-filter'))
            .styles({
                'width': this.width + 'px',
                'height': '50%',
                'overflow-y': 'auto',
                'overflow-x': 'hidden'
            })

        this.setTitleBar()
        
        // filtering 
        const filterGroup = this.div.selectAll('div.filtering-div')
            .data(this.data)
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

        this.div.style('width', '0')
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

        charts[activeChart].update()
    }

    getFilteringCriteria() {
        return this.filtering;
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


}