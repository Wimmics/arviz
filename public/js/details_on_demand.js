
class DetailsPanel {
    constructor() {

        this.dragActive = false;
        this.interacting = false;

        this.div = null;

        this.dashboard = document.querySelector("#arviz")

        this.width = null;
        this.height = null;
    }

    init() {
        const _this = this;

        this.div = d3.select(this.dashboard.shadowRoot.querySelector('div.panels-container'))
            .append('div')
            .classed('details-panel', true)
            .styles({
                width: this.width + 'px',
                height: this.height + 'px'
            })
            .call(d3.drag()
                .on('drag', function() {
                    _this.dragActive = true;
                    const rectBounds = _this.div.node().getBoundingClientRect(),
                        x = validateObjPosition(rectBounds.x + d3.event.dx, 0, window.innerWidth - this.clientWidth),
                        y = validateObjPosition(rectBounds.y + d3.event.dy, 0, window.innerHeight - this.clientHeight);

                    _this.div.raise().styles({ 'top': y + 'px', 'left': x + 'px' })
                }).on('end', () => _this.dragActive = false))

        // this.width = this.div.node().clientWidth;

        this.setResizer()
    
        this.setTopBar()
       
        this.divContent = this.div.append('div')
            .classed('dragscroll details-content', true)

    }

    setResizer(){
        const _this = this;

        this.div.append('div')
            .classed('resizer', true)
            .call(d3.drag()
                .on('drag', function() {
                    // Determine resizer position relative to resizable (parent)
                    // Avoid negative or really small widths
                    let y = Math.max(50, d3.mouse(this.parentNode)[1]);                    
                    _this.div.style('height', y + 'px');
                }))
    }

    setTopBar() {
        this.divTitle = this.div.append('div')
            .classed('top-bar', true)
   

        this.divTitle.append('div')
            .classed('title-content', true)
            .style('width', this.width * .85 + 'px')
            .style('padding', '5px')

        this.divTitle.append('div')
            .style('width', this.width * .15 + 'px')
            .style('height', '35px')
            .style('filter', 'brightness(0) invert(1)')
            .append('svg')
            .attr('transform', 'translate(30, 10)')
                .append("svg:image")
                .attr('xlink:href', '/arviz/images/times.svg')
                .attr('width', '15')
                .attr('height', '15')
                .style('cursor', 'pointer')
                .on('click', () => this.clear())
    }

    setPosition(x, y) {
        d3.select(this.div.node()).style('left', x + 'px').style('top', y + 'px')
    }

    setTitle(d) {
        this.divTitle.select('div.title-content').node().innerHTML += d.source.join(', ') + ' &#8594; ' + d.target.join(', ')
    }

    setContentDiv() {
        const contentTop = this.divTitle.node().clientHeight;
        this.divContent.style('top', contentTop + 'px').style('height', 'calc(100% - ' + (contentTop + 20) + 'px)')
    }

    setContent(content){
        this.div.select('div#loading').remove()
        this.div.select('#waiting-message').remove()
        this.div.select('div.details-content').node().innerHTML += content;
    }

    initContent(d, content) {
        this.divContent.node().innerHTML = '<br><b>Interestingness: </b>' + d.interestingness.toFixed(2) + '<br>' +
            '<b>Confidence: </b>' + d.confidence.toFixed(2) + '<br>' +
            '<b>Support: </b>' + d.support.toFixed(4) + '<br>' +
            '<b>Symmetric: </b>' + d.isSymmetric + '<br>' +
            (d.cluster ? '<b>Cluster: </b>' + d.cluster + '<br><br>' : '') + content;
    }

    warning() {
        toast.fire({
            icon: 'warning',
            title: 'The information panel for this rule is already open!'
        })
    }
    
    highlight() {
        this.div.style('outline', 'solid #000')
    }
    
    removeHighlight() {
        this.div.style('outline', 'none')
    }
    
    display() {
        this.div.style('display', 'block')
    }
    
    hide(){
        this.div.style('display', 'none')
    }

    clear() {
        this.div.remove()
    }



}



