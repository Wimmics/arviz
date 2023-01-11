function getURI(value) {
    let res = data.uri.filter(d => d.label == value)
    return res.length > 0 ? res[0].uri : null;
}

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

function fireSelectionError(){
    toast.fire({
        icon: 'error',
        title: 'This will delete all rules! Action not allowed.'
    })
}

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

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1)
}

function validateObjPosition(x, a, b) {
    if (x < a) return a;
    if (x > b) return b;
    return x;
}

