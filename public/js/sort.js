class SortPanel extends ConfigPanel {
    constructor(config) {
        super(config)

        this.sortCriteria = {'terms': 'alpha', 'rules': 'confidence'}
        this.title = "Data Sorting"
    }

    init() {

        this.options = [
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

        this.set()

    }

    set() {
        this.div = d3.select(this.dashboard.shadowRoot.querySelector('div#data-sort'))
            .styles({
                'width': this.width + 'px',
                'height': this.height + 'px',
                'overflow': 'hidden'
            })

        this.setTitleBar()

        let form = this.div.selectAll('.sorting-div')
            .data(this.options)
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
                _this.dashboard.updateChart()
        })

        selection.selectAll('option')
            .data(d => d.children)
            .enter()
                .append('option')
                .attr('value', d => d.value)
                .text(d => d.label)

        this.div.style('width', 0)

    }
}