class ARViz extends HTMLElement {
    constructor () {
        super()
        this.attachShadow({ mode: "open" })

        this.height 
        this.width
        this.activeChart = null

        // this.configPanel = null
        this.legend = null;
        this.sort = null;
        this.filter = null

        this.graph = null
        this.chord = null
        this.scatterplot = null

        this.labels = []
    }

    async connectedCallback() {
        const _this = this;

        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.app = this.getAttribute("app")
        console.log("app = ", this.app)

        await this.fetchConfig()

        this.legend = new Legend(this.config)
        this.legend.init()
        
        this.sort = new SortPanel(this.config)
        this.sort.init()

        this.filter = new FilterPanel(this.config)
        this.filter.init()
            
        await this.fetchLabels() 
        d3.selectAll('.labels-loading').style('display', 'none')
        d3.select('#vis-loading').style('display', 'none')

        // set page 
        const div = d3.select(this.shadowRoot.querySelector('div.viewContainer'))
        this.width = div.node().clientWidth
        this.height = div.node().clientHeight

        this.graph = new GraphView(this.config)
        this.graph.init()

        this.chord = new CircularView(this.config)
        this.chord.init()

        this.scatterplot = new ScatterPlot(this.config)
        this.scatterplot.init()

        this.setInteraction()

        this.graph.set()

    }

    setInteraction() {
        const _this = this;

        // set menu buttons interaction
        d3.selectAll(this.shadowRoot.querySelectorAll('div.menu-icon'))
            .filter(function() { return this.id != 'about_button'; })
            .on('click', function() {
                _this.openNav(this.id.split('_')[0])
            } )

        d3.select(this.shadowRoot.querySelector("div#about_button"))
            .on('click', () => this.about())

        d3.selectAll(this.shadowRoot.querySelectorAll(".tab-bar"))
            .on('click', function(){
                let chart = this.id.split('-')[0]
                _this.setActiveChart(chart)
                _this[chart].set()
               
            })

        d3.select(this.shadowRoot.querySelector("#rotationValuePrevious"))
            .on('click', () => this.chord.decreaseRotationValue())

        d3.select(this.shadowRoot.querySelector('#rotationValueNext'))
            .on('click', () => this.chord.increaseRotationValue())

        d3.select(this.shadowRoot.querySelector('#rotationValueInput'))
            .on('change', function(event) { _this.chord.updateRotationValue(event) })

        let forms = d3.selectAll(this.shadowRoot.querySelectorAll("div.autocomplete"))
            
        forms.selectAll("input[type=text]")
            .on('input', function(event) { _this.updateDatalist() })

        forms.selectAll("button")
            .on('click', () => this.handleInput())
    }

    async fetchConfig() {
        let response = await fetch('/arviz/' + this.app + '/config')
        this.config = await response.json()
    }

    async fetchLabels() {
        let response = await fetch('/arviz/api/' + this.app + (!this.config.rdf ? '/labels' : '/uris'));
        this.labels = await response.json()
    }

    getLabels(labels) {
        let values = this.labels.filter(d => labels.includes(d.label ? d.label.value : d))
        return values.filter( (d,i) => values.indexOf(d) === i)
    }

    // handle the submit action from the graph view's forms
    handleInput(){
        d3.event.preventDefault();

        let element = d3.event.path[0]
        
        let type = element.id.split('-')[0]
        let value = this.shadowRoot.querySelector('#' + element.id.replace('button', 'input')).value;
        this.graph.set(type, value)

        if (type === 'source') this.shadowRoot.querySelector('#target-input').value = '';
        else this.shadowRoot.querySelector('#source-input').value = '';
    }       

    updateDatalist() {
        let value = d3.event.srcElement.value.toLowerCase()
        if (value.length > 2) {
            let tempLabels = [];
            if (this.labels.length)
                tempLabels = this.labels.filter(d => d.label ? d.label.value.toLowerCase().includes(value) : d.toLowerCase().includes(value))

            d3.select(this.shadowRoot.querySelector('#labels_list'))
                .selectAll('option')
                .data(tempLabels)
                .join(
                    enter => enter.append('option'),
                    update => update,
                    exit => exit.remove()
                )
                .attr('value', d => d.label ? d.label.value : d)
        }
    }
    
    about(event) {
        window.open('/arviz/about')
    }

    updateChart() {
        this[this.activeChart].update()
    }

    getActiveChart() {
        return this.activeChart;
    }

    setActiveChart(chart){
       
        this.activeChart = chart;

        // update tab
        d3.selectAll(this.shadowRoot.querySelectorAll('div.tab-bar'))
            .styles(function() {
                const active = this.id.split('-')[0] === this.activeChart;
                return {
                    'height' : active ? '30px' : '20px',
                    'background-color': active ? '#cccccc' : '#2C3E50',
                    'color': active ? '#2C3E50' : '#cccccc',
                    'line-height': active ? '30px' : '20px'
                }
            })
        
    }

    showLoading() {
        d3.select(this.shadowRoot.querySelector('#vis-loading'))
            .style('display', 'block')
    }

    hideLoading() {
        d3.select(this.shadowRoot.querySelector('#vis-loading')).style('display', 'none')
    }

    openNav(id) {
        d3.select(this.shadowRoot.querySelector('div#'+id))
            .style('width', '270px')
            .style('left', id == 'upload-file' ? 'calc(100% - 270px)' : '0px')
    }

    closeNav() {
        if (arguments.length == 0) d3.selectAll(this.shadowRoot.querySelectorAll('.sideNav-bar')).style('width', 0)
        else this.parentNode.style.width = "0";
    }
}


const template = document.createElement("template");
template.innerHTML = `

<link rel="stylesheet" href="/arviz/css/common.css">
<link rel="stylesheet" href="/arviz/css/graph_viz.css">
<link rel="stylesheet" href="/arviz/css/chordDiagram.css">
<link rel="stylesheet" href="/arviz/css/detailsPanel.css">

<div class="panels-container"></div>
<div class="tooltip"></div>

<!-- left side buttons -- settings for the current data and visual tools -->
<div class='menu-buttons' >
    <div class="menu-icon left-icon" id='legend_button' title='Color code of rules'>
        <img src="/arviz/images/palette.png"></img>
    </div>
    <div class="menu-icon left-icon" id='data-filter_button' title='Filter dataset'>
        <img src="/arviz/images/filter.png"></img>
    </div>
    <div class="menu-icon left-icon" id='data-sort_button' title='Modify order of appearance of rules and/or terms'>
        <img src="/arviz/images/sort.png"></img>
    </div>
    <div class="menu-icon left-icon" style='top: 20px;' id='about_button' title='Learn more about the project'>
        <img src="/arviz/images/info.png"></img>
    </div>
</div>

<!-- divs activated by the buttons above -->
<div class='sideNav-bar' id='legend'></div>
<div class='sideNav-bar' id='data-filter'></div>
<div class='sideNav-bar' id='data-sort'></div>
<div class='sideNav-bar' id='upload-file'></div>

<div class='visu-space'>
    <!-- tabs that enable switching between views -->
    <div class="tab-bar" id='scatterplot-tab'>Overview of Rules</div>
    <div class="tab-bar" id='chord-tab'>Circular Paginated View of Subsets</div>
    <div class="tab-bar" id='graph-tab'>Exploratory Graph View of Items</div>

    <!-- the div that will contain the views -->
    <div class='viewContainer'>
        <div id="vis-loading" style="top:30%; font-size: 40px; z-index: 1000; position:absolute; left:45%;" >
            <img src='/arviz/images/loading.gif' width="150px"></img>
        </div>
        
    </div>
    
    <!-- the forms below are only enabled for the association graph view -->
    <datalist id="labels_list"></datalist>
    <div class='forms'>
        <div class='left' id='antecedentSide'>
            <div class="autocomplete">
                <label class='text-div'>Search rules by</label> 
                <input id="source-input" list="labels_list" type="text" name="source" placeholder="Antecedent" >
                <button id="source-button">Go</button>   
                <i class="fa-solid fa-circle-info" title="Type at least three letters"></i>
                <i class="fa fa-refresh fa-spin labels-loading"></i>
            </div>  
        </div>
        <div class='right' id='consequentSide'>
            <div class="autocomplete">
                <label class='text-div'>Search rules by</label> 
                <input id="target-input" type="text" name="target" placeholder="Consequent" list="labels_list">
                <button id="target-button">Go</button>
                <i class="fa-solid fa-circle-info" title="Type at least three letters"></i> 
                <i class="fa fa-refresh fa-spin labels-loading"></i>
            </div>
        </div>
    </div>
    
    <!-- the forms below are enabled together with the circular view -->
    <div class="options">
        <div class="rotationValueNav">
            <label class="rotationNavText"></label>
            <button id='rotationValuePrevious'>Previous</button>
            <input type='text' id='rotationValueInput'></input>
            <button id='rotationValueNext'>Next</button>
            <label class="rotationNavText2"></label>
        </div>
    </div>

</div>
`

customElements.define("vis-arviz", ARViz);