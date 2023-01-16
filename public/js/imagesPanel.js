class ImagesPanel extends DetailsPanel {
    constructor() {
        super()

        this.path = "http://dataviz.i3s.unice.fr/crobora/assets/images/images_archives/"
    }

    async set(d, event){

        this.setTitle(d)
        this.setPosition(event.pageX, event.pageY)
        this.setContentDiv()

        this.labels = this.dashboard.getLabels(d.source.concat(d.target))
        console.log(this.labels)
    
        let content = '<b id="waiting-message">Associated Images: </b>' +
            '<div id="loading" style="text-align: center; margin:auto;" ><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i><br>Loading Images...</div>';
        
        this.initContent(d, content)
        
        this.fetchData()
    }

    async fetchData() {
       
        let url = `/arviz/api/${this.dashboard.app}/images?values=${this.labels.join(',')}`
    
        let response = await fetch(url)
        let data = await response.json()
        console.log(data)

        if (response.ok) 
            this.setContent(await this.getContent(data))
        else alert('Something went wrong. Please try again later!')
    }

    async getContent(result){
        

        let content = '';
        if (result.length > 0) {
            content = '<b>' + result.length + ' associated images </b><br><br>'

            result.forEach(d => {
                let docLink = d.documentId ? `http://dataviz.i3s.unice.fr/crobora/document/${d.documentId.replace('/', '_')}` : '#'

                content += `<div class="image-content" >
                    <a href="${docLink}" target="_blank" >
                        <img class="main-image" src=${this.getLink(d.image)} width="80%" title="Click to explore the archive metadata in the CROBORA platform" ></img> </a>
                    <p>Archive: <b>${d.documentTitle}</b> <br><br>
                    <b>Keywords:</b><br>
                    <ul>
                    ${d.celebrity.map(e => `<li title="Celebrity"> <img src="/arviz/images/${this.dashboard.app}/celebrity-icon.svg" width="15px"></img> ${e} </li>`).join('')}
                    ${d.illustration.map(e => `<li title="Illustration"> <img src="/arviz/images/${this.dashboard.app}/illustration-icon.svg" width="15px"></img> ${e} </li>`).join('')}
                    ${d.event.map(e => `<li title="Event"> <img src="/arviz/images/${this.dashboard.app}/event-icon.svg" width="15px"></img> ${e} </li>`).join('')}
                    ${d.location.map(e => `<li title="Location"> <img src="/arviz/images/${this.dashboard.app}/location-icon.svg" width="15px"></img> ${e} </li>`).join('')}
                    </ul>
                    </p>

                    Explore the archive metadata <a href="${docLink}"  target="_blank">here</a>
                    <hr>
                    </div>`
            })
        }else {
            content += '<center style="height: fit-content; text-align: center;">We could not load the associated images. <br>Please try again later!'
        }
        
        return content;
    }

    getLink(image_title) {
        if (image_title.includes("TF1")){
          return this.path + 'Atlas_TF1/' + image_title +".png";
        } else if (image_title.includes("FR2")){
          return this.path + 'Atlas_France2/' + image_title +".png";
        } else if (image_title.includes("FR3")){
          return this.path + 'Atlas_France3/' + image_title +".png";
        } else if (image_title.includes("ARTE")){
          return this.path + 'Atlas_Arte/' + image_title +".jpg";
        } else if (image_title.includes("TG1")){
          return this.path + 'Atlas_RaiUno/' + image_title +".png";
        } else if (image_title.includes("TG2")){
          return this.path + 'Atlas_RaiDue/'+ image_title +".png";
        } else {
          return this.path + 'Atlas_WebFR/'+ image_title +".PNG";
        }
      }
  
}