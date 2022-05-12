class TreeNode extends go.Node {
  constructor() {
    super();
    this.treeExpandedChanged = node => {
      if (node.containingGroup !== null) {
        node.containingGroup.findExternalLinksConnected().each(l => l.invalidateRoute());
      }
    };
  }

  findVisibleNode() {
    // redirect links to lowest visible "ancestor" in the tree
    var n = this;
    while (n !== null && !n.isVisible()) {
      n = n.findTreeParentNode();
    }
    return n;
  }
}
// end TreeNode

// Control how Mapping links are routed:
// - "Normal": normal routing with fixed fromEndSegmentLength & toEndSegmentLength
// - "ToGroup": so that the link routes stop at the edge of the group,
//     rather than going all the way to the connected nodes
// - "ToNode": so that they go all the way to the connected nodes
//     but only bend at the edge of the group
var ROUTINGSTYLE = "ToGroup";

// If you want the regular routing where the Link.[from/to]EndSegmentLength controls
// the length of the horizontal segment adjacent to the port, don't use this class.
// Replace MappingLink with a go.Link in the "Mapping" link template.
class MappingLink extends go.Link {
  getLinkPoint(node, port, spot, from, ortho, othernode, otherport) {
    if (ROUTINGSTYLE !== "ToGroup") {
      return super.getLinkPoint(node, port, spot, from, ortho, othernode, otherport);
    } else {
      var r = port.getDocumentBounds();
      var group = node.containingGroup;
      var b = (group !== null) ? group.actualBounds : node.actualBounds;
      var op = othernode.getDocumentPoint(go.Spot.Center);
      var x = (op.x > r.centerX) ? b.right : b.left;
      return new go.Point(x, r.centerY);
    }
  }

  computePoints() {
    var result = super.computePoints();
    if (result && ROUTINGSTYLE === "ToNode") {
      var fn = this.fromNode;
      var tn = this.toNode;
      if (fn && tn) {
        var fg = fn.containingGroup;
        var fb = fg ? fg.actualBounds : fn.actualBounds;
        var fpt = this.getPoint(0);
        var tg = tn.containingGroup;
        var tb = tg ? tg.actualBounds : tn.actualBounds;
        var tpt = this.getPoint(this.pointsCount-1);
        this.setPoint(1, new go.Point((fpt.x < tpt.x) ? fb.right : fb.left, fpt.y));
        this.setPoint(this.pointsCount-2, new go.Point((fpt.x < tpt.x) ? tb.left : tb.right, tpt.y));
      }
    }
    return result;
  }
}
// end MappingLink


  function init() {

    // Since 2.2 you can also author concise templates with method chaining instead of GraphObject.make
    // For details, see https://gojs.net/latest/intro/buildingObjects.html
    const _ = go.GraphObject.make;  // for conciseness in defining templates

    let myDiagram =
      _(go.Diagram, "treeMapperDiagram",
        {
          "commandHandler.copiesTree": true,
          "commandHandler.deletesTree": true,
          // newly drawn links always map a node in one tree to a node in another tree
          "linkingTool.archetypeLinkData": { category: "Mapping" },
          "linkingTool.linkValidation": checkLink,
          "relinkingTool.linkValidation": checkLink,
          "undoManager.isEnabled": true,
          "ModelChanged": e => {
            if (e.isTransactionFinished) {  // show the model data in the page's TextArea
              document.getElementById("mySavedModel").textContent = e.model.toJson();
            }
          }
        });

    // All links must go from a node inside the "Left Side" Group to a node inside the "Right Side" Group.
    function checkLink(fn, fp, tn, tp, link) {
      // make sure the nodes are inside different Groups
      if (fn.containingGroup === null || fn.containingGroup.data.key !== -1 && fn.containingGroup.data.key !== -3) return false;
      if (tn.containingGroup === null || tn.containingGroup.data.key !== -2) return false;
      //// optional limit to a single mapping link per node
      //if (fn.linksConnected.any(l => l.category === "Mapping")) return false;
      //if (tn.linksConnected.any(l => l.category === "Mapping")) return false;
      return true;
    }

    // Each node in a tree is defined using the default nodeTemplate.
    myDiagram.nodeTemplate =
      _(TreeNode,
        { movable: false, copyable: false, deletable: false },  // user cannot move an individual node
        { isTreeExpanded: false },  // by default collapsed
        // no Adornment: instead change panel background color by binding to Node.isSelected
        {
          selectionAdorned: false,
          background: "white",
          mouseEnter: (e, node) => node.background = "aquamarine",
          mouseLeave: (e, node) => node.background = node.isSelected ? "skyblue" : "white"
        },
        new go.Binding("background", "isSelected", s => s ? "skyblue" : "white").ofObject(),
        // whether the user can start drawing a link from or to this node depends on which group it's in
        new go.Binding("fromLinkable", "group", k => (k === -1) || (k === -3)),
        new go.Binding("toLinkable", "group", k => k === -2),
        _("TreeExpanderButton",  // support expanding/collapsing subtrees
          {
            width: 14, height: 14,
            "ButtonIcon.stroke": "white",
            "ButtonIcon.strokeWidth": 2,
            "ButtonBorder.fill": "goldenrod",
            "ButtonBorder.stroke": null,
            "ButtonBorder.figure": "Rectangle",
            "_buttonFillOver": "darkgoldenrod",
            "_buttonStrokeOver": null,
            "_buttonFillPressed": null
          }),
        _(go.Panel, "Horizontal",
          { position: new go.Point(16, 0) },
          //// optional icon for each tree node
          //_(go.Picture,
          //  { width: 14, height: 14,
          //    margin: new go.Margin(0, 4, 0, 0),
          //    imageStretch: go.GraphObject.Uniform,
          //    source: "images/defaultIcon.png" },
          //  new go.Binding("source", "src")),
          _(go.TextBlock,
            new go.Binding("text", "text"))
        )  // end Horizontal Panel
      );  // end Node

    // These are the links connecting tree nodes within each group.

    myDiagram.linkTemplate = _(go.Link);  // without lines

    myDiagram.linkTemplate =  // with lines
      _(go.Link,
        {
          selectable: true, 
          selectionAdorned: true,
          routing: go.Link.Orthogonal,
          fromEndSegmentLength: 4,
          toEndSegmentLength: 4,
          fromSpot: new go.Spot(0.001, 1, 7, 0),
          toSpot: go.Spot.Left,
        },
        _(go.Shape,
          { stroke: "lightgrey" })
          );

        /*myDiagram.nodeTemplate.contextMenu =
        _("ContextMenu",
          _("ContextMenuButton",
            _(go.TextBlock, "Remove node"),
            {
              click: (e, obj) => {
                var node = obj.part.adornedPart;
                if (node !== null) {
                  myDiagram.startTransaction("remove node");
                  myDiagram.model.removeNodeData(node.data)
                  myDiagram.commitTransaction("removed node");
                }
              }
            }
          ),
        );*/

      var contextMenu = 
      _("ContextMenu",
      _("ContextMenuButton",
        _(go.TextBlock, "Remove link"),
        {
          click: (e, obj) => {
            var link = obj.part.adornedPart;
            if (link !== null) {
              let node_from_group = myDiagram.findNodeForKey(link.data.from).part.data.group
              myDiagram.startTransaction("remove link");
              myDiagram.model.removeLinkData(link.data)
              deleteNeo4jEdge(link.data.from,link.data.to,node_from_group)
              myDiagram.commitTransaction("removed link");
            }
          }
        }
      ),
      _("ContextMenuButton",
      _(go.TextBlock, "Change statut"),
      {
        click: (e, obj) => {
          var link = obj.part.adornedPart;
          if (link !== null) {
            console.log(link.data)
          }
        }
      },
    ),
    )

    // These are the blue links connecting a tree node on the left side with one on the right side.
    myDiagram.linkTemplateMap.add("Mapping",
      _(MappingLink,
        { isTreeLink: false, isLayoutPositioned: false, layerName: "Foreground" },
        { fromSpot: go.Spot.Right, toSpot: go.Spot.Left},
        { relinkableFrom: true, relinkableTo: true },
        {selectable: true, selectionAdorned: true},
        {contextMenu: contextMenu},
        _(go.Shape, { stroke: "blue", strokeWidth: 2 })
      ));

    myDiagram.groupTemplate =
      _(go.Group, "Auto",
        { deletable: false, layout: makeGroupLayout() },
        new go.Binding("position", "xy", go.Point.parse).makeTwoWay(go.Point.stringify),
        new go.Binding("layout", "width", makeGroupLayout),
        _(go.Shape, { fill: "white", stroke: "lightgray" }),
        _(go.Panel, "Vertical",
          { defaultAlignment: go.Spot.Left },
          _(go.TextBlock,
            { font: "bold 14pt sans-serif", margin: new go.Margin(5, 5, 0, 5) },
            new go.Binding("text")),
          _(go.Placeholder, { padding: 5 })
        )
      );

    function makeGroupLayout() {
      return _(go.TreeLayout,  // taken from samples/treeView.html
        {
          alignment: go.TreeLayout.AlignmentStart,
          angle: 0,
          compaction: go.TreeLayout.CompactionNone,
          layerSpacing: 16,
          layerSpacingParentOverlap: 1,
          nodeIndentPastParent: 1.0,
          nodeSpacing: 0,
          setsPortSpot: false,
          setsChildPortSpot: false,
          // after the tree layout, change the width of each node so that all
          // of the nodes have widths such that the collection has a given width
          commitNodes: function() {  // overriding TreeLayout.commitNodes
            go.TreeLayout.prototype.commitNodes.call(this);
            if (ROUTINGSTYLE === "ToGroup") {
              updateNodeWidths(this.group, this.group.data.width || 100);
            }
          }
        });
    }

    changeColor = function() {  // define a function named "changeColor" callable by button.onclick
      diagram.model.commit(function(m) {
        // alternate between lightblue and lightgreen colors
        var oldcolor = m.modelData.color;
        var newcolor = (oldcolor === "blue" ? "lightgreen" : "blue");
        m.set(m.modelData, "color", newcolor);
      }, "changed shared color");
    }

    function deleteNeo4jEdge(from,to,from_group){
      let url = ""
      if (from_group === -1) {url = "./api/v0/hal/id/"} else {url = "./api/v0/bso/id/"}
      $.ajax({
        type: "DELETE",
        url: url+from,
        data: JSON.stringify({ "to": to }),
        dataType: "json",
        success: function(data){alert(data.msg);}
      });
    }

    myDiagram.addDiagramListener("LinkDrawn",
    function(e) {
      let url = ""
      var node_from_group = myDiagram.findNodeForKey(e.subject.part.data['from']).part.data.group
      if (node_from_group === -1){ url = "./api/v0/hal/id/"} else { url = "./api/v0/bso/id/"}
      console.log(myDiagram.findNodeForKey(e.subject.part.data['from']).part.data); 
      $.ajax({
        type: "POST",
        url: url+e.subject.part.data['from'],
        data: JSON.stringify({ "to": e.subject.part.data['to'] }),
        dataType: "json",
        success: function(data){alert(data.msg);}
      });
     /* $.post( "./api/v0/hal/id/"+e.subject.part.data['from'], JSON.stringify({ "to": e.subject.part.data['to'] }), function( data ) {
        alert(data);
      });*/
    
    });

    // Create some random trees in each group
    var nodeDataArray = [
      { isGroup: true, key: -1, text: "Hal", xy: "100 100", width: 200 },
      { isGroup: true, key: -2, text: "Dewey", xy: "500 100", width: 200 },
      { isGroup: true, key: -3, text: "BSO", xy: "900 100", width: 150 }
    ];
    var linkDataArray = []
    
    function getNeo4jNodes(url,nodeDataArray,linkDataArray,groupkey){
      return  $.getJSON( url, {
        format: "json"
      })
        .done(function( data ) {
          data.nodes.map(function(d) {
            let name = "";
            if (d.classe) {name += d.classe + " " + d.name} else {name += d.name}
            return  nodeDataArray.push({"key":d.meta_id,"text": name, "group": groupkey})})
          data.edges.map(function(d){return linkDataArray.push(d)})
        })
    }

    function getNeo4jEdges(url,linkDataArray,){
      return  $.getJSON( url, {
        format: "json"
      })
        .done(function( data ) {
          data.edges.map(function(d){return linkDataArray.push(d)})
        })
    }

    function graphModelling(nodeDataArray, linkDataArray) {
      $("#spinner").hide()
      $("#treeviz").show()
      myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
      return myDiagram.model
    }

    $("#spinner").show()
    $("#treeviz").hide()
getNeo4jNodes("./api/v0/hal_nodes_edges_sub",nodeDataArray,linkDataArray,-1)
.then(function() {
  return getNeo4jNodes("./api/v0/dewey_nodes_edges_sub",nodeDataArray,linkDataArray,-2);
})
.then(function() {
  return getNeo4jNodes("./api/v0/bso_nodes_edges_sub",nodeDataArray,linkDataArray,-3);
})
.then(function() {
  return getNeo4jEdges("./api/v0/hal_edges_same_as",linkDataArray);
})
.then(function() {
  return getNeo4jEdges("./api/v0/bso_edges_same_as",linkDataArray);
})
.then(function() {
  return graphModelling(nodeDataArray, linkDataArray);
})
//.catch(failureCallback);
  

  }

  window.addEventListener('DOMContentLoaded', init);


  function updateNodeWidths(group, width) {
    if (isNaN(width)) {
      group.memberParts.each(n => {
        if (n instanceof go.Node) n.width = NaN;  // back to natural width
      });
    } else {
      var minx = Infinity;  // figure out minimum group width
      group.memberParts.each(n => {
        if (n instanceof go.Node) {
          minx = Math.min(minx, n.actualBounds.x);
        }
      });
      if (minx === Infinity) return;
      var right = minx + width;
      group.memberParts.each(n => {
        if (n instanceof go.Node) n.width = Math.max(0, right - n.actualBounds.x);
      });
    }
  }

  // this function is only needed when changing the value of ROUTINGSTYLE dynamically
  function changeStyle() {
    // find user-chosen style name
    var stylename = "ToGroup";
    var radio = document.getElementsByName("MyRoutingStyle");
    for (var i = 0; i < radio.length; i++) {
      if (radio[i].checked) {
        stylename = radio[i].value; break;
      }
    }
    if (stylename !== ROUTINGSTYLE) {
      myDiagram.commit(diag => {
        ROUTINGSTYLE = stylename;
        diag.findTopLevelGroups().each(g => updateNodeWidths(g, NaN));
        diag.layoutDiagram(true);  // force layouts to happen again
        diag.links.each(l => l.invalidateRoute());
      });
    }
  }

  function dedup(arr) {
    let map = {};
    for (let list of arr) {
        map[Object.values(list).join('')] = list;
    }
    console.log(Object.values(map))
    return Object.values(map)
  }

 /*Resize the diagram with this button
   var button1 = document.getElementById('button1');
   button1.addEventListener('click', function() {
     var div = diagram.div;
     div.style.width = '200px';
   });*/
  