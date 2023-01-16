function prepare(query) {
    query = encodeURIComponent(query);
    query = query.replace(/\%20/g, "+");
    query = query.replace(/\(/g, "%28");
    query = query.replace(/\)/g, "%29");
    return query;
}





// async function getLabels() {
//     let response = await fetch('/arviz/')
// }