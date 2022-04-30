let dragActive = false;
let interacting = false;

function setDetailsPanel(d){

    const queryValues = d.source.concat(d.target)
    const divId = getRuleId(d) + '_' + activeChart;

    if (!d3.select('div#' + divId).empty()) {
        toast.fire({
            icon: 'warning',
            title: 'The information panel for this rule is already open!'
        })
        return;
    }

    const div = d3.select('body').append('div')
        .styles({
            'top': d3.event.pageY + 'px',
            'left': d3.event.pageX + 'px'
        })
        .classed('details-panel', true)
        .attr('id', divId)
        .on('mouseenter', highlightRule)
        .on('mouseleave', removeRuleHighlight)
        .call(d3.drag()
            .on('drag', function () {

                dragActive = true;
                const rectBounds = div.node().getBoundingClientRect(),
                    x = validateObjPosition(rectBounds.x + d3.event.dx, 0, window.innerWidth - this.clientWidth),
                    y = validateObjPosition(rectBounds.y + d3.event.dy, 0, window.innerHeight - this.clientHeight);

                div.raise().styles({
                        'top': y + 'px',
                        'left': x + 'px'
                    })
            }).on('end', () => dragActive = false))

    div.append('div')
        .classed('resizer', true)
        .call(d3.drag()
            .on('drag', function() {
                // Determine resizer position relative to resizable (parent)
                y = d3.mouse(this.parentNode)[1];
                
                // Avoid negative or really small widths
                y = Math.max(50, y);
                
                div.style('height', y + 'px');
            }))

    const divTitle = div.append('div')
        .styles({
            'padding': '10px',
            'background-color': '#2C3E50',
            'position': 'relative',
            'text-align': 'center',
            'color': 'white',
            'width': '100%',
            'cursor': 'grab'
        })
    
    divTitle.node().innerHTML += d.source.join(', ') + ' &#8594; ' + d.target.join(', ')

    setCloseIcon(divTitle).on('click', () => {
            div.remove();
            removeRuleHighlight();
        })
        // .styles({
        //     'right': '-5px',
        //     'top': '-5px'
        // })

    const contentTop = divTitle.node().clientHeight;
    const divContent = div.append('div')
        .styles({
            'padding': '10px',
            'top': contentTop + 'px',
            'position': 'absolute',
            'overflow-y': 'auto',
            'width': '100%',
            'height': 'calc(100% - ' + contentTop + 'px)',
            'overflow-x': 'hidden'
        })
        .classed('dragscroll details-content', true)

    let valid_uris = uris.filter(d => queryValues.includes(d.label.value))
    valid_uris = valid_uris.filter( (d,i) => valid_uris.findIndex(e => e.uri.value === d.uri.value) === i)

    divContent.node().innerHTML += '<b>Associated URIs</b><br>'
    valid_uris.forEach(e => {
        divContent.node().innerHTML += '<b>' + e.label.value + ': </b>' + '<a href="https://agrovoc.fao.org/browse/agrovoc/en/page/?uri=' + e.uri.value + '" target="_blank">' + e.uri.value + '</a><br>'
    })

    divContent.node().innerHTML += '<br><b>Interestingness: </b>' + d.interestingness.toFixed(2) + '<br>' +
        '<b>Confidence: </b>' + d.confidence.toFixed(2) + '<br>' +
        '<b>Support: </b>' + d.support.toFixed(4) + '<br>' +
        '<b>Symmetric: </b>' + d.isSymmetric + '<br>' +
        (d.cluster ? '<b>Cluster: </b>' + d.cluster + '<br><br>' : '') +
        '<b id="pubs-title">List of Associated Publications: </b>' +
        '<div id="loading" style="text-align: center; margin:auto;" ><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i><br>Searching for Publications</div>';
    
    getPublications(queryValues, d)   // the id is not being used in this function (is meant for cache purposes) 
}


function setPubContent(result, id){
    const publications = prepareContent(result)

    d3.select('div#loading').remove()
    d3.select('#pubs-title').remove()
    d3.select('div#'+id+'_'+activeChart).select('div.details-content').node().innerHTML += getContent(publications)
}

function getContent(result){
    let content = '';
    if (result.length > 0) {
        content = 'List of Associated Publications (' + result.length + ')<br><br>'
        result.forEach(d => {
            content += '<b>' + d.title + '</b> (' + d.year + ') </br>' + 'Authors: ' + d.authors.split('--').join(' and ') + '</br>' +
                'DOI: <a href="https://doi.org/' + d.url +'" target="_blank">' + d.url + '</a></br>' + 
                (appli === 'issa' ? 'Augmented visualization (ISSA): <a href="http://issa.i3s.unice.fr/visu/?uri=' + d.article + '" target="_blank">http://issa.i3s.unice.fr/visu/?uri=' + d.article + '</a><br>' : '') +
                '</br>'
        })
    }else {
        content += '<center style="height: fit-content; text-align: center;">We could not find the publications associated to this rule.'
    }
    
    return content;
}

function prepareContent(result){
    let titles = result.map(d => d.title.value)
    titles = titles.filter((d,i) => titles.indexOf(d) == i)

    const pubs = []
    titles.forEach(t => {
        let items = result.filter(d => d.title.value == t)

        pubs.push({
            'article': items[0].article.value,
            'title': t,
            'year': appli != 'issa' ? +items[0].date.value.split('-')[0] : Math.trunc(+items[0].date.value),
            'url': items[0].url.value,
            'authors': items.map(i => i.authors.value.replace(/[\u0300-\u036f]/g, "")).join(' and ')
        })
    })

    pubs.sort((a,b) => b.year - a.year)
    return pubs;
}

function highlightDetailsPanel(id) {
    const div = d3.select('div#'+id+'_'+activeChart);
    if (div.empty()) return;

    div.style('outline', 'solid #000')
}

function highlightRule() {
    if (dragActive) return;

    // remove the last value that correspond to the active chart
    let id = this.id.split('_')
    id.pop()
    id = id.join('_')

    charts[activeChart].highlightRule(id)
    // else highlightChord(id)
}

function removeRuleHighlight() {
    interacting = false;
    charts[activeChart].removeRuleHighlight()
    // removeGraphHighlight();
    // removeChordHighlight();
}

function removeDetailsHighlight() {
    d3.selectAll('div.details-panel').style('outline', 'none')
}

function displayDetailPanels() {
    d3.selectAll('div.details-panel')
        .style('display', function() {return this.id.includes(activeChart) ? 'block' : 'none'})
}

function clearDetailPanels() {
    d3.selectAll('div.details-panel').filter(function() { return this.id.includes(activeChart); }).remove()
}

function hideAllPanels(){
    d3.selectAll('div.details-panel').style('display', 'none')
}