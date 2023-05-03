class PublicationsPanel extends DetailsPanel{
    constructor() {
        super()

        this.width = 380;
        this.height = 300;
        
    }

    async set(d, event){

        this.setTitle(d)
        this.setPosition(event.pageX, event.pageY)
        this.setContentDiv()

        this.labels = this.dashboard.getLabels(d.source.concat(d.target))
        console.log(this.labels)
    
        let content = '<b>Associated URIs</b><br>'
        this.labels.forEach(e => {
            content += '<b>' + (e.label ? e.label.value : e.prefLabel) + 
                ': </b>' + '<a href="https://agrovoc.fao.org/browse/agrovoc/en/page/?uri=' + (e.uri || e.uri.value) + '" target="_blank">' + (e.uri || e.uri.value) + '</a><br>'
        })
    
        content += '<b id="waiting-message">Associated Publications: </b>' +
            '<div id="loading" style="text-align: center; margin:auto;" ><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i><br>Searching for Publications</div>';
        
        this.initContent(d, content)
        
        this.fetchData()
    }

    async fetchData() {
       
        let uris = this.labels.map(d => d.uri || d.uri.value)
        let url = `/arviz/api/${this.dashboard.app}/publications?values=${uris.join(',')}`
    
        let response = await fetch(url)
        let data = await response.json()

        if (response.ok) 
            this.setContent(await this.getContent(data))
        else alert('Something went wrong. Please try again later!')
    }
    
    async getContent(result){
        let data = await this.prepareContent(result)

        let content = '';
        if (data.length > 0) {
            content = '<br><b>Associated Publications (' + data.length + ')</b><br><br>'
            data.forEach(d => {
                content += '<b>' + d.title + '</b> (' + d.year + ') </br>' + 'Authors: ' + d.authors.split('--').join(' and ') + '</br>' +
                    'DOI: <a href="https://doi.org/' + d.url +'" target="_blank">' + d.url + '</a></br>' + 
                    (this.dashboard.app === 'issa' ? '<a href="http://issa.i3s.unice.fr/visu/?uri=' + d.article + '" target="_blank">Augmented visualization (ISSA)</a><br>' : '') +
                    '</br>'
            })
        }else {
            content += '<center style="height: fit-content; text-align: center;">We could not find the publications associated to this rule.'
        }
        
        return content;
    }
    
    prepareContent(result){
        let titles = result.map(d => d.title.value)
        titles = titles.filter((d,i) => titles.indexOf(d) == i)
    
        const values = []
        titles.forEach(t => {
            let items = result.filter(d => d.title.value == t)
    
            values.push({
                'article': items[0].article.value,
                'title': t,
                'year': this.dashboard.app != 'issa' ? +items[0].date.value.split('-')[0] : Math.trunc(+items[0].date.value),
                'url': items[0].url.value,
                'authors': items.map(i => i.authors.value.replace(/[\u0300-\u036f]/g, "")).join(' and ')
            })
        })
    
        values.sort((a,b) => b.year - a.year)
        return values;
    }

}