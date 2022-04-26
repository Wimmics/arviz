function destroyTooltips(elem) {
    return new Promise((fulfill, reject) => {
        const instances = d3.selectAll(elem)
        instances.each(function() { if (this._tippy) this._tippy.destroy(); })
        fulfill()
    })
}

function setTooltip(elem){
    
    destroyTooltips(elem).then(() => {
        tippy(elem, {
            theme: 'light',
            placement: 'right-start', 
            allowHTML: true,
            interactive: true,
            appendTo: document.body,
            followCursor: elem == '.chord' ? 'initial' : false,
            delay: [200, 0],
            animation: 'scale',
            onHide(instance){
                d3.selectAll('g.edges')
                    .transition()
                    .duration(500)
                    .style('opacity', 1)
    
                d3.selectAll('path.chord')
                    .transition()
                    .duration(200)
                    .style("opacity", 1)

                d3.selectAll('text.terms')
                    .transition()
                    .duration(200)
                    .style('font-weight', 'normal')
                    .style('opacity', '1')
            },
            onShow(instance) {
                const ref = instance.reference;
                if (ref.className.baseVal != 'chord') return;
                d3.selectAll('path.chord')
                    .transition()
                    .duration(200)
                    .style("opacity", function() {return this === ref ? 1 : .05})

                let ruleData = d3.select(ref).datum();
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
        })
    })
}

function getTooltipContent(d){
    let source = d.source.map(t => getNELabel(t)),
        target = d.target.map(t => getNELabel(t))

    return source.join(', ') + ' &#8594; ' + target.join(', ') + "<br/>" +
        'Click for more information';
        // 'Interestingness: ' + d.interestingness.toFixed(2) + '<br/>' +
        // 'Confidence: ' + d.confidence.toFixed(2) + '<br/>' +
        // 'Support: ' + d.support.toFixed(4) + '<br/>' +
        // 'Symmetric: ' + d.isSymmetric + '<br/>' +
        // 'Cluster: ' + d.cluster +
        // '<button class="tip-button" onclick=getPublications(this,' + JSON.stringify(d) + ')>Show associated publications</button>'
}

const tipInstances = [];

function getPublications(button, d){
    const values = d.source.concat(d.target)
    const index = tipInstances.findIndex(t => t.values.equals(values))
    
    const style = {
        placement: 'bottom', 
        theme: 'light',
        arrow: false,
        allowHTML: true,
        interactive: true,
        appendTo: 'parent',
        trigger: 'click',
        modifiers: {
            preventOverflow: {
                enabled: false,
            },
            flip: {
                enabled: false,
            }
        }
    }

    let tip = null;
    if (index == -1) { // if the tooltip does not exist 
        tip = tippy(button, style)
        tip.setContent('<div class="papers-list" style="height: fit-content; text-align: center;"><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i></br>Searching for Publications</div>')
        tipInstances.push({
            'tip': tip,
            'values': values
        })
    
        tipInstances[tipInstances.length - 1].tip.show()
    }
    processQuery(values)
}

function getContent(result){
    let content = '<div class="papers-list" '
    if (result.length > 0) {
        content += '>';
        result.forEach(d => {
            content += '<b>' + d.title + '</b> (' + d.year + ') </br>' + 'Authors: ' + d.authors + '</br>' +
                'DOI: <a href="' + d.url +'" target="_blank">' + d.url + '</a></br></br>'
        })
    }else {
        content += 'style="height: fit-content; text-align: center;">We could not find the publications associated to this rule.'
    }
    
    content += '</div>';
    return content;
}

function prepareContent(result){
    let titles = result.map(d => d.title.value)
    titles = titles.filter((d,i) => titles.indexOf(d) == i)

    const pubs = []
    titles.forEach(t => {
        let items = result.filter(d => d.title.value == t)
        pubs.push({
            'title': t,
            'year': items[0].date.value.split('-')[0],
            'url': items[0].url.value,
            'authors': items.map(i => i.authors.value.replace(/[\u0300-\u036f]/g, "")).join(' and ')
        })
    })
    return pubs;
}

function setPubContent(result){
    const publications = prepareContent(result)

    const tip = tipInstances[tipInstances.length - 1].tip;
    
    tip.setContent(getContent(publications))
}