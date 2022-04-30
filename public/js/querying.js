function prepare(query) {
    query = encodeURIComponent(query);
    query = query.replace(/\%20/g, "+");
    query = query.replace(/\(/g, "%28");
    query = query.replace(/\)/g, "%29");
    return query;
}

async function getLabelsURI() {
    let response = await fetch('/arviz/api/' + appli + '/uris');
    uris = await response.json();

    // let labels = uris.map(d => d.label.value)
    // labels = labels.filter((d,i) => labels.indexOf(d) == i)

    
}

async function getPublications(values, rule) {

    let valid_uris = uris.filter(d => values.includes(d.label.value)).map(d => d.uri.value)
    valid_uris = valid_uris.filter( (d,i) => valid_uris.indexOf(d) === i)
   
    let url = `/arviz/api/${appli}/publications?values=${valid_uris.join(',')}`

    let response = await fetch(url)
    let publications = await response.json()
    
    if (response.ok) 
        setPubContent(publications, getRuleId(rule))
    else 
        alert('Something went wrong. Please try again later!')
}

// async function getLabels() {
//     let response = await fetch('/arviz/')
// }