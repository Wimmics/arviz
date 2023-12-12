class ImagesPanel extends DetailsPanel {
    constructor() {
        super()

        this.path = "https://crobora.huma-num.fr/crobora-api/login/images/" 

        this.width = 500;
        this.height = 500;
    }

    async set(d, event){

        this.setTitle(d)
        this.setPosition(event.pageX, event.pageY)
        this.setContentDiv()

        this.labels = this.dashboard.getLabels(d.source.concat(d.target))
    
        let content = '<b id="waiting-message">Associated Images: </b>' +
            '<div id="loading" style="text-align: center; margin:auto;" ><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i><br>Loading Images...</div>';
        
        this.initContent(d, content)
        
        this.fetchData()
    }

    async fetchData() { 

      let params = {
        keywords: this.labels.map(d => d.value),
        categories: this.labels.map(d => d.type),
        options: ["illustration", "location", "celebrity", "event"]
      }

      let response = await fetch(`/arviz/api/${this.dashboard.app}/images`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(params) 
      })

      let data = await response.json()

      this.setContent(await this.getContent(data))
    }

    async getContent(result){
      
        let content = '';

       
        if (result.length > 0) {
            result = result.map(d => d.records).flat()
  
            content = '<b>' + result.length + ' associated images </b><br><br>'

            result.sort( (a,b) => a.document_title.localeCompare(b.document_title))

            result.forEach((d) => {
                let docLink = d.ID_document ? `https://crobora.huma-num.fr/crobora/document/${d.ID_document}` : '#'
                
                content += `<div class="image-content" >
                    <hr>
                    <p>Document: <b>${d.document_title}</b><br>
                      Date: <b>${d.day_airing}</b><br>
                      Broadcaster: <b>${d.channel}</b> 
                    </p>

                    <div class="image-keywords">
                      <div style="width: 50%;">
                        <a href="${docLink}" target="_blank" style="pointer-events: ${d.ID_document ? 'auto' : 'none'};">
                            <img class="main-image" src=${this.getImage(d.image_title)} width="100%" title="Click to explore the archive metadata in the CROBORA platform" ></img> </a>
                        <br>
                      </div>
                      <div style="width: 50%;">
                      <b style="margin-left: 10px;">Keywords:</b>
                        <ul>
                        ${d.celebrity ? d.celebrity.map(e => `<li title="Celebrity"> <img src="/arviz/images/${this.dashboard.app}/celebrity-icon.svg" width="15px"></img> ${e} </li>`).join('') : ''}
                        ${d.illustration ? d.illustration.map(e => `<li title="Illustration"> <img src="/arviz/images/${this.dashboard.app}/illustration-icon.svg" width="15px"></img> ${e} </li>`).join('') : ''}
                        ${d.event ? d.event.map(e => `<li title="Event"> <img src="/arviz/images/${this.dashboard.app}/event-icon.svg" width="15px"></img> ${e} </li>`).join('') : ''}
                        ${d.location ? d.location.map(e => `<li title="Location"> <img src="/arviz/images/${this.dashboard.app}/location-icon.svg" width="15px"></img> ${e} </li>`).join('') : ''}
                        </ul>
                      </div>
                    </div>
                    
                    <p style="display: ${d.ID_document ? 'block' : 'none'};">Explore the archive metadata <a href="${docLink}"  target="_blank">here</a></p>
                    
                    </div>`
            })
        } else {
            let forReason = () => result.statusText ? `Reason: ${result.statusText} (${result.status}) <br>` : ''
            content += `<center style="height: fit-content; text-align: center;">We could not retrieve the associated images. <br>
            ${forReason()}
            Please try again later!`
        }
        
        return content;
    }

    getImage(image_title) {
      image_title = encodeURIComponent(image_title)
      return this.path + image_title + "?token=" + this.dashboard.token 
    }
  
}