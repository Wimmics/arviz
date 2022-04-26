const fetch = require('node-fetch')

function prepare(query) {
    query = encodeURIComponent(query);
    query = query.replace(/\%20/g, "+");
    query = query.replace(/\(/g, "%28");
    query = query.replace(/\)/g, "%29");
    return query;
}

async function sendRequest(query, uri){

    // var wasabiAPISongById = wasabiUrl + "/api/v1/song/id/"
    let url = uri + "?query=";
    url = url + prepare(query);
    url = url + "&format=application%2Fsparql-results%2Bjson";
    
    let result = await fetch(url).then(async function(response){
      if(response.status >= 200 && response.status < 300){
        return await response.text().then(data => {
          return data
      })}
      else return response
    })
    return result
}

module.exports = { sendRequest }