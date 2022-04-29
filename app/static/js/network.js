$(function(){ 
var viz;
            var config = {
                container_id: "networkviz",
                server_url: "bolt://localhost:7687",
                server_user: "neo4j",
                server_password: "admin",
                labels: {
                    "DeweyDomain": {
                        "caption": "name",
                        "size": 1,
                        //"community": "group",
                        "image": './static/img/dewey_icon.png',
                        "font": {
                          "size":26,
                          "color":"#000000"
                       },
                        "title_properties": [
                            "name"
                        ]
                    },
                    "HalDomain": {
                      "caption": "code",
                      "size": 1,
                      "image": './static/img/hal_icon.png',
                      //"community": "group",
                      "title_properties": [
                          "name"
                      ]
                  },
                  "BsoDomain": {
                    "caption": "name",
                    "size": 1,
                    "image": './static/img/bso_icon.png',
                    //"community": "group",
                    "title_properties": [
                        "name"
                    ]
                },
                },
                relationships: {
                    "HAS_SUBCLASS": {
                        "thickness": 1,
                        "caption": false
                    },
                    "SAME_AS": {
                      "thickness": 1,
                      "caption": false
                  }
                },
                start: {
                  zoomMin: 3
              },
                initial_cypher: "MATCH (n)-[r]->(m) RETURN *"
            };

viz = new NeoVis.default(config);
viz.render();
$( "#network-reload" ).click(function() {
  viz.reload()
})
$( "#network-stabilize" ).click(function() {
  viz.stabilize()
})
$( "#network-filter" ).click(function() {
  viz.renderWithCypher("MATCH (n)-[r]->(m) WHERE n.name CONTAINS '"+$( "#filter-string" ).val()+"' RETURN * UNION MATCH (n)-[r]->(m) WHERE m.name CONTAINS '"+$( "#filter-string" ).val()+"' RETURN *")
})
          })