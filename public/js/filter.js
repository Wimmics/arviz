class FilterPanel extends ConfigPanel {
    constructor(config) {
        super(config)

        this.filtering = {}
        this.title = "Data Filtering"
    }

    async init() {
        await this.setFilteringCriteria()

        this.div = d3.select(this.dashboard.shadowRoot.querySelector('div#data-filter'))
            .styles({
                'width': this.width + 'px',
                'height': '50%',
                'overflow-y': 'auto',
                'overflow-x': 'hidden',
            })
            

        this.set()
    }

    async setFilteringCriteria(){

        let confAvg =  d3.mean([this.extent.conf.min, this.extent.conf.max ]),
            intAvg = d3.mean([ this.extent.int.min, this.extent.int.max ]);

        this.filtering = {'symmetry': true,
                    'no_symmetry': true,
                    'conf': {'min': this.extent.conf.min, 'max': this.extent.conf.max, 'step': 0.02, 'avg': confAvg, 'default': .7, max_sel: this.extent.conf.max, min_sel: .7},
                    'int': {'min': this.extent.int.min, 'max': this.extent.int.max, 'step': 0.05, 'avg': intAvg , 'default': .3, max_sel: this.extent.int.max, min_sel: .3},
                    'methods': []
                }

        this.config.methods.forEach((d,i) => {
            this.filtering.methods.push({value: d.key, selected: i === 0 });
        })

        this.data = [
            {'label': 'Mesures of Interest', 'value': 'mesures', 
            'children': [
                {'label': 'Confidence', 'value': 'conf', 'type': 'group_range', 'min': this.filtering.conf.min, 'max': this.filtering.conf.max, 
                    'selected': this.filtering.conf.default,
                'children': [
                    {'value': 'conf-a', 'selected': this.filtering.conf.default, 'min': this.filtering.conf.min, 'max': this.filtering.conf.avg},
                    {'value': 'conf-b', 'selected': this.filtering.conf.max, 'min': this.filtering.conf.avg + this.filtering.conf.step, 'max': this.filtering.conf.max}
                ]},
                {'label': 'Interestingness', 'value': 'int', 'type': 'group_range', 'min': this.filtering.int.min, 'max': this.filtering.int.max, 
                    'selected': this.filtering.int.default,
                'children': [
                    {'value': 'int-a', 'selected': this.filtering.int.default, 'min': this.filtering.int.min, 'max': this.filtering.int.avg},
                    {'value': 'int-b', 'selected': this.filtering.int.max, 'min': this.filtering.int.avg + this.filtering.int.step, 'max': this.filtering.int.max}
                ]},
                {'value': 'symmetry', 'checked': true, 'label': 'Symmetric Rules', 'type': 'checkbox'},
                {'value': 'no_symmetry', 'checked': true, 'label': 'Non-Symmetric Rules', 'type': 'checkbox'}
            ]}          
            
        ]  

        
        if (this.config.methods.length && this.config.methods.length > 1) {
            this.methods = this.config.methods.map((d,i) => { return {value: d.key, selected: i === 0, label: d.label} })
        }

    }

     // filtering panel
     set(){
        const _this = this;
        

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
            .text(d => d.selected.toFixed(2) + ' - ' + d.max.toFixed(2))
            
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
                .on('mouseup', () => this.setSelection())

        this.div.style('width', '0')


        // set datasets list on the nav-bar
        const datasetList = d3.select(this.dashboard.shadowRoot.querySelector("#dataset-list"))

        datasetList.selectAll('option')
            .data(this.methods)
            .enter()
                .append('option')
                .attr("value", d => d.value)
                .property('selected', d => d.selected)
                .text(d => d.label)
                
        datasetList.on('change', function() {
            let selectedOption = this.options[this.selectedIndex]
            let value = selectedOption.value
            _this.filtering.methods.forEach(d => d.selected = d.value === value)
            _this.dashboard.updateChart(true)
        })
                
        
    }

    setSelection() {
        let changed = false;
        ['conf', 'int'].forEach(e => {
            const a = this.div.select('input#'+e+'-a').node(),
                b = this.div.select('input#'+e+'-b').node();    

            changed = changed || this.filtering[e].min_sel != a.valueAsNumber || this.filtering[e].max_sel != b.valueAsNumber;
            this.filtering[e].min_sel = a.valueAsNumber
            this.filtering[e].max_sel = b.valueAsNumber

            this.div.select('text#'+e+'-text').text(`${(a.valueAsNumber).toFixed(2)} - ${(b.valueAsNumber).toFixed(2)}`)
        })

        if (changed) {
            this.dashboard.updateChart(true)
        }
    }

    updateInputRange(elem){
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
        
        const getStep = (elem) => {
            return Number(elem.max) - Number(elem.min) + this.filtering[range].step;
        }

        a.style.flexGrow = getStep(a) * 100;
        b.style.flexGrow = getStep(b) * 100;
    }

    // update upon a filtering choice
    handleCheckbox(elem) {

        this.filtering[elem.id] = elem.checked;

        this.dashboard.updateChart()
    }

    getFilteringCriteria() {
        return this.filtering;
    }

    getMethods() {
        let unckeck_methods = this.config.methods.filter(d => !this.filtering[d.key])
        return unckeck_methods.map(d => d.key)
    }

    getDataset() {
        return this.filtering.methods.find(d => d.selected).value;
    }

    // async filterData(data) {
    //     // apply confidence and interestingness filters
    //     data = data.filter(d => d.confidence >= this.filtering.conf.min && d.confidence <= this.filtering.conf.max && 
    //         d.interestingness >= this.filtering.int.min && d.interestingness <= this.filtering.int.max)

    //     // apply symmetry filter
    //     data = data.filter(d => this.filtering.symmetry && this.filtering.no_symmetry ? true : 
    //         (this.filtering.symmetry ? d.isSymmetric : (this.filtering.no_symmetry ? !d.isSymmetric : false)))
        
    //     let unckeck_methods = this.config.methods.filter(d => !this.filtering[d.key])
    //     unckeck_methods = unckeck_methods.map(d => d.key)
    //     data = data.filter(d => !unckeck_methods.some(e => d.cluster.includes(e)) )

    //     return data
    // }


}