// function getNELabel(named_entity) {
//     let data = data.uris.filter(d => d.named_entity == named_entity)[0] 
//     return data ? data.label : null;
// }

function getURI(value) {
    let res = data.uri.filter(d => d.label == value)
    return res.length > 0 ? res[0].uri : null;
}

// function LabelToNE(label) {
//     return NEData.filter(d => d.label == label)[0].named_entity;
// }

function getClusterSubject(cluster, type) {
    let filter = data.clusters.filter(d => d.cluster == cluster).map(d => {
        let info = 'Covering topics of: <br>';
        Object.keys(d).sort((a,b) => d[b] - d[a])
            .forEach(e => {
                if (d[e] >= 1) {
                    info += (d[e] > 20 ? '<b>' : '') + e + ' (' + Math.trunc(d[e]) + '% of items)' + (d[e] > 20 ? '</b>' : '') + '<br>'
                }
            })

        return {
            cluster: d.cluster,
            info: info
        }
    })[0]

    return filter ? filter.info : 'No information available.'
}

function getFilteredData(){
    
    let filteredData = data.rules.filter(d => d.confidence >= filtering.conf.min && d.confidence <= filtering.conf.max && 
                                        d.interestingness >= filtering.int.min && d.interestingness <= filtering.int.max)
    // filter according symmetry option
    filteredData = filteredData.filter(d => filtering.symmetry && filtering.no_symmetry ? true : 
            (filtering.symmetry ? d.isSymmetric : (filtering.no_symmetry ? !d.isSymmetric : false)))
    
    if (data.appli === 'covid') {
        // filter data according to selected clusters
        const selectedClusters = filtering.clusters_articles.concat(filtering.clusters_terms).concat(filtering.clusters_both).map(d => d.value);
        filteredData = filteredData.filter(d => selectedClusters.includes(d.cluster) || (filtering.no_clustering && d.cluster == 'no_clustering'))
    }

    let selectedTerms = filtering.terms.map(d => d.value)
    // check that all terms in the source and target side are included in the user's choices
    filteredData = filteredData.filter(d => d.source.some(t => selectedTerms.includes(t)) || 
                                            d.target.some(t => selectedTerms.includes(t)))

    return filteredData;
}

function sortTerms(){
    if (sortCriteria.terms == 'nbrules') 
        filtering.terms.sort((a,b) => {
            let nodesA = data.rules.filter(d => d.target.includes(a.value) || d.source.includes(a.value)),
                nodesB = data.rules.filter(d => d.target.includes(b.value) || d.source.includes(b.value))
            return nodesB.length - nodesA.length;
        })
    else
        filtering.terms.sort((a,b) => a.value.localeCompare(b.value))
}

function transformString() {
    let args = Array.prototype.slice.call(arguments);
    return args.shift() + '(' + args.join(',') + ')';
}

function openDropdown(){
	let element = typeof arguments[0] != 'undefined' ? arguments[0] : this;
	if (typeof element.nodeName == 'undefined') element = this;
	
	const dropdownContent = element.nextElementSibling;
	
	if(dropdownContent.style.display == "block") {
        dropdownContent.style.display = "none";
    } else {
        dropdownContent.style.display = "block"; 
    }

    return dropdownContent.style.display == 'none';
}

const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    onOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

Array.prototype.equals = function (array) {
  // if the other array is a falsy value, return
  if (!array)
      return false;

  // compare lengths - can save a lot of time 
  if (this.length != array.length)
      return false;

  for (var i = 0, l=this.length; i < l; i++) {
      // Check if we have nested arrays
      if (this[i] instanceof Array && array[i] instanceof Array) {
          // recurse into the nested arrays
          if (!this[i].equals(array[i]))
              return false;       
      }           
      else if (this[i] != array[i]) { 
          // Warning - two different object instances will never be equal: {x:20} != {x:20}
          return false;   
      }           
  }       
  return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});

function wrap(text, width, x, step) {
	text.each(function() {
		let text = d3.select(this),
			words = text.text().split(/\s+/).reverse(),
			word,
			line = [],
			lineNumber = 1,
			lineHeight = 1.1, // ems
			y = text.attr("y"),
			dy = parseFloat(text.attr("dy")) || 0,	
			tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
        
		width = (typeof width === "function") ? width.call(this) : width;
		
		while (word = words.pop()) {
			line.push(word);
            tspan.text(line.join(" "));
			if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                if (line.length > 0) {
                    line = [word];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", (step ? lineNumber * lineHeight + "em" : lineHeight + 'em')).text(word);
                    lineNumber++;
                } else { // the line comprises only one word
                    let newWord = '';
                    let i = 0; while (i < word.length){
                        newWord += word[i++];
                        tspan.text(newWord);
                        if (tspan.node().getComputedTextLength() > width-1) break;
                    }
                    tspan.text(newWord+'-');
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", (step ? lineNumber * lineHeight + "em" : lineHeight + 'em')).text(word.slice(newWord.length));
                }
			}
		}
	});
}

function openNav() {
    const id = this.id.split('_')[0];

    d3.select('div#'+id)
        .style('width', '270px')
        .style('left', id == 'upload-file' ? 'calc(100% - 270px)' : '0px')
}

function closeNav() {
    if (arguments.length == 0) d3.selectAll('.sideNav-bar').style('width', 0)
    else this.parentNode.style.width = "0";

    d3.select('div#upload-file').style('left', '100%')
}


function showSideButtonTooltip(){
    const id = this.id.split('_')[0]
    switch(id) {
        case 'legend':
            displayTooltip('Color code of rules')
            break;
        case 'data-filter':
            displayTooltip('Filter dataset')
            break;
        case 'data-sort':
            displayTooltip('Modify order of appearance of rules and/or terms')
            break;
        case 'about':
            displayTooltip('Learn more about the project')
            break;
        case 'upload-file':
            displayTooltip('Explore your own data')
            break;
    }
}


// tooltip functions
function showRuleTooltip(d){

    let htmlContent = d.source.join(', ') + ' &#8594; ' + d.target.join(', ') + "<br><br>" +
        'Interestingness: ' + d.interestingness.toFixed(2) + '<br>' +
        'Confidence: ' + d.confidence.toFixed(2) + '<br><br>' +
        'Click for more';

    displayTooltip(htmlContent)
}

function showArcTooltip(count){
    displayTooltip(count + ' rule' + (count > 1 ? 's' : '') + '<br><br> Right-click to explore this term in the Association Graph view.')  
}

function displayTooltip(content) {
   
    const tooltip = d3.select('div.tooltip')
    
    let x = d3.event.pageX,
        width = tooltip.node().clientWidth;
    x = width + x > window.innerWidth ? window.innerWidth - width : x;

    let y = d3.event.pageY + 5;


    tooltip.styles({
            'left': x + 'px',
            'top': y + 'px',
            'opacity': '1'
        })
        .html(content)
}

function hideTooltip(){
    d3.selectAll('div.tooltip')
        .style('opacity', '0')
}



// close button for every floating div
function setCloseIcon(div) {
    const span = div.append('span')
        .classed('close-icon', true)
        
    span.append('i')
        .classed('fas fa-times', true)

    return span;
}

function cleanText(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]|_/g, "")
}

function getRuleId(d) {
    return ((cleanText(d.source.join('_')) + '_' + cleanText(d.target.join('_'))) + (d.cluster ? '_' + d.cluster : '')).replace(/\s+/g, '_');
}

function setActiveChart(chart){
    activeChart = chart;

    // update tab
    d3.selectAll('div.tab-bar')
        .styles(function() {
            const active = this.id.split('-')[0] == activeChart;
            return {
                'height' : active ? '30px' : '20px',
                'background-color': active ? '#cccccc' : '#2C3E50',
                'color': active ? '#2C3E50' : '#cccccc',
                'line-height': active ? '30px' : '20px'
            }
        })
    
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1)
}

function validateObjPosition(x, a, b) {
    if (x < a) return a;
    if (x > b) return b;
    return x;
}

// clear views
function clearChordDiagram(){
    d3.select('div.options').select('div.rotationValueNav').style('display', 'none') 
    d3.select('svg#chord-diagram').remove()
}

function clearScatterPlot(){
    d3.select('svg#scatter-plot').style('display', 'none')
}

function clearGraphView(){
    d3.select('div.graphContainer').style('display', 'none')
    // d3.select('svg#graph-view').style('display', 'none')
    d3.select('div.bottom-button').style('display', 'none')
    d3.select('div.forms').style('display', 'none')
}