function prepare(query) {
    query = encodeURIComponent(query);
    query = query.replace(/\%20/g, "+");
    query = query.replace(/\(/g, "%28");
    query = query.replace(/\)/g, "%29");
    return query;
}

async function getLabelsURI() {
    let response = await fetch('/arviz/api/' + locals.appli + '/uris');
    data.uris = await response.json();
}

async function getPublications(values, rule) {

    let uris = data.uris.filter(d => values.includes(d.label.value)).map(d => d.uri.value)
    uris = uris.filter( (d,i) => uris.indexOf(d) === i)
   
    let url = `/arviz/api/${locals.appli}/publications?values=${uris.join(',')}`

    let response = await fetch(url)
    let publications = await response.json()
    
    if (response.ok) 
        setPubContent(publications, getRuleId(rule))
    else 
        alert('Something went wrong. Please try again later!')
}