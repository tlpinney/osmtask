    var map, vectors, f;
    var expiredays = 7;
    var cookiename = "osmdefaultlocation";
    var ll, ur;
    var epsg4326, epsg900913;
    var selectControl;


    // debug variables 
    var debug1;



    // selection of checkout adapted from openlayers/examples/custom-control.html


 var control = new OpenLayers.Control();
                OpenLayers.Util.extend(control, {
                    draw: function () {
                        // this Handler.Box will intercept the shift-mousedown
                        // before Control.MouseDefault gets to see it
                        this.box = new OpenLayers.Handler.Box( control,
                            {"done": this.notice},
                            {keyMask: OpenLayers.Handler.MOD_SHIFT});
                        this.box.activate();
                    },

                    notice: function (bounds) {
                        ll = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.left, bounds.bottom)); 
                        ur = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.right, bounds.top)); 
                       // convert to 4326 bounds
                       ll.transform(epsg900913, epsg4326);
                       ur.transform(epsg900913, epsg4326);

                       bbox =  ll.lon.toFixed(4) + ", ";   
                       bbox += ll.lat.toFixed(4) + ", "; 
                       bbox += ur.lon.toFixed(4) + ", "; 
                       bbox += ur.lat.toFixed(4);

                       $('id_checkout').value = bbox;

                       
                       
                    }
                });



    // cookie functionality adapted  from 
    // http://openlayers.org/pipermail/users/2010-February/016446.html
    // permalink should supersede the cookie


     // === Set the cookie before exiting ===
      function setCookie() {
    mapcenter = new OpenLayers.LonLat(map.getCenter().lon,
map.getCenter().lat);
        var cookietext =
cookiename+"="+mapcenter.lat+"|"+mapcenter.lon+"|"+map.getZoom();
        if (expiredays) {
          var exdate=new Date();
          exdate.setDate(exdate.getDate()+expiredays);
          cookietext += ";expires="+exdate.toGMTString();
        }
      document.cookie = cookietext;    
      // show the user that the cookie was set 
      $('id_status').value = 'Cookie set successfully';

      }

    function checkCookie() {
//      console.log('checking cookie');
      
      if (document.cookie.length>0) {
        var c_list = document.cookie.split(';');

        for (var i = 0; i < c_list.length; i++) {
         //console.log(c_list); 
         var c = c_list[i].trim().split("=");
         //console.log(c);
         if ( c[0] == 'osmdefaultlocation') {
            //console.log("found default location");
           bits = c[1].split("|");
           lat = parseFloat(bits[0]);
           lon = parseFloat(bits[1]);
           zoom = parseInt(bits[2]);
  
           //console.log(lat + " " +  lon + " " + zoom );
           //console.log('trying to set the center');
           map.setCenter(new OpenLayers.LonLat(lon, lat), zoom);
         }
        }
      }
  }
     


    function init() {
           epsg900913 = new OpenLayers.Projection("EPSG:900913");
           epsg4326 = new OpenLayers.Projection("EPSG:4326");


              map = new OpenLayers.Map ("map", {
                controls:[
			  //new OpenLayers.Control.Graticule(),
                    new OpenLayers.Control.Navigation(),
                    new OpenLayers.Control.PanZoomBar(),
                    new OpenLayers.Control.Attribution(),
                    new OpenLayers.Control.LayerSwitcher(),
                    new OpenLayers.Control.ScaleLine(),
                    new OpenLayers.Control.Permalink('permalink'),
                    new OpenLayers.Control.MousePosition(),
                    new OpenLayers.Control.OverviewMap(),
                    // new OpenLayers.Control.NavToolbar(),
//                    new OpenLayers.Control.ZoomIn()
],
                   
                maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
                maxResolution: 156543.0399,
                numZoomLevels: 19,
                units: 'm',
                projection: new OpenLayers.Projection("EPSG:900913"),
                displayProjection: new OpenLayers.Projection("EPSG:4326")
            } );

      osm_mapnik = new OpenLayers.Layer.OSM.Mapnik("Mapnik");
      vectors = new OpenLayers.Layer.Vector("Checkout", { projection: new OpenLayers.Projection("EPSG:900913") }); 
      density = new OpenLayers.Layer.Vector("Density", { projection: new OpenLayers.Projection("EPSG:900913") }); 
     
      v_completed = new OpenLayers.Layer.Vector("Completed", { projection: new OpenLayers.Projection("EPSG:900913") });
      
      cSelect = function(feature) { 
          // alert('selected feature');
          //$('id_selected').value = feature 
	  // debug1 = feature;
	  var fc = feature.geometry.clone();
	  fc.transform(epsg900913, epsg4326);
	  // console.log(fc.getBounds());
	  // debug1 = fc;
	  var bbox = fc.getBounds().toBBOX()
	  $('id_selected').value = "Owner:" + feature.data.user + " ID:" + feature.data.id + " BBOX: " + bbox; 	    
      }

      cOut = function(feature) {
         // clear out the selected feature box 
         $('id_selected').value = "";
      }

    

      selectControl = new OpenLayers.Control.SelectFeature([vectors], {'toggle' : true, 'clickout' : true, onSelect: cSelect, onUnselect: cOut });


      map.addControl(selectControl);
      map.addControl(control);
      map.addLayer(osm_mapnik);
      map.addLayer(vectors);
      map.addLayer(v_completed);
      map.addLayer(density);
      map.zoomToMaxExtent();

      // see if there is a cookie that has the default location
      checkCookie();

      selectControl.activate();


    OpenLayers.loadURL("api/0.1/tasks.json", {}, null, function(r) {
        var p = new OpenLayers.Format.GeoJSON();
        f = p.read(r.responseText);
        vectors.addFeatures(f);
      });

    OpenLayers.loadURL("api/0.1/densities.json", {}, null, function(r) {
        var p = new OpenLayers.Format.GeoJSON();
        f = p.read(r.responseText);
        density.addFeatures(f);
      });

        

    }

    function checkout() {
      //alert("checkout");

     if ($('id_checkout').value == "") { 
       alert('You need to select a bounding box to checkout');
     }
     else {
       // send the bounding box to the server 
       // this should make sure the bounding box is valid 
       // create an ajax call to get the bounding box
       // if it has been successful add the checkout to the 
       // vector layer 
   
      
      var url = "/api/0.1/checkout";

      var params = {'bbox': $('id_checkout').value}

      function handler(request) {
        // alert(request.responseText);
        //alert(request.status);
        
        if (request.status == 200) {
          // the request was succesfull
          var id = parseInt(request.responseText.split(":")[1].trim()); 
	  // pull the vector back from the id and add it to the map 	
			    
     OpenLayers.loadURL("api/0.1/task/" + id + ".json", {}, null, function(r) {
        //alert(r.responseText);
        // debug1 = r;
        var p = new OpenLayers.Format.GeoJSON();
        var f2 = p.read(r.responseText);
        //debug1 = f2;
        vectors.addFeatures(f2);
      });

         }
      }
      OpenLayers.Request.GET({ url: url, params: params, callback: handler });
     }
    }

    function deleteFeature() {
      // get the selected feature and delete it 
      var f = vectors.selectedFeatures[0]
      
     // make a call to delete teh featuer id 
     // needs to use the DELETE part of ReST
  
     url = "/api/0.1/task/" + f.data.id 
			    
     var handler = function(request) { 
        // alert('deleted feature')
        if (request.status == 200) {
           // it was deleted successfully 
           // remove it from the vector layer 
           // alert(f.data.id);
	   vectors.removeFeatures([vectors.selectedFeatures[0]]);
           return;
        }
        
        if (request.status == 401) {
           alert('You are not authorized to delete, try canceling your checkin');
	   return;
        }
         
        alert('Unknown error occured. Please contact administrator');       
         
     }

     OpenLayers.Request.DELETE({ url: url, callback: handler } );
    
     }
