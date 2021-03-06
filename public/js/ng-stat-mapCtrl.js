"use strict";

ngApp.controller('ngStatMapCtrl', [ '$scope', function($scope) {

    //variable
    var project = window.PROJECT;
    var stat = null;
    var regions = null;
    var filteredRegions = null;
    var users = null;
    var terms = null;
    var datas = [];

    //control
    var $cmbSelectTerms =   $('#cmbTerms');
    var $radioData = $("#radioData");

    $scope.name = "ngStatMapCtrl";
    $scope.IsNormalizeBoudariesChecked = false;
    $scope.IsBoudariesChecked = false;
    $scope.resize = function() {
        setTimeout(function() {
            $(window).trigger('resize');
            if (mapCtrl && mapCtrl.mainMap)
                mapCtrl.mainMap.invalidateSize();
        }, 600);
    };

    //quando clicck sul menu devo disattivare sempre il timer dei dati
    $scope.onItemClick = function() {
        idOp = -1000;
    };

    //Form Controller
    var FormCtrl = function() {

        var _self = this;

        this.progressCount = new ProgressCount("progressCount");

        this.$spinnerHeatmap = $("#spinner-heatmap");
        this.$spinnerCluster = $("#spinner-cluster");
        this.$spinnerBoundaries = $("#spinner-boundaries");

        this.$cmbSelectTags =    $('#cmbTags');
        this.$cmbSelectNations = $('#cmbNations');
        this.$cmbSelectUsers =   $('#cmbUsers');
        this.$cmbTypeNormalization =   $("#cmbTypeNormalization");

        this.$chkHeatmap = $('#chk_heatmap');
        this.$chkMarkercluster = $('#chk_markerCluster');
        this.$chkBoudaries = $('#chk_boundaries');
        this.$chkNormalize = $("#chk_normalize");           //all'inizio è null

        this.$sliderTimer = $("#slider");

        this.$sliderTimer.dateRangeSlider({
            enabled : true,
            bounds: {
                min: new Date(1950, 1, 1 ) ,
                max: new Date(2050, 1, 1 )
            } ,
            defaultValues:{
                min: new Date(1950, 1, 1 ),
                max: new Date(2050, 1, 1 )
            }
        });

        this.enableForm = function(){
            console.log("CALL: enable form");
            btnCtrl.removeWaitFromAllCheck();
            btnCtrl.enableFilterButton();
            btnCtrl.enableAllCheck();
        };

        this.setIntervalSlider = function(min, max) {

            min = min.addDays(-1);
            max = max.addDays(+1);

            this.$sliderTimer.dateRangeSlider( {
                enabled : true ,
                bounds:{
                    min: min, max: max
                },
                defaultValues:{
                    min: min,
                    max: max
                }
            });
            this.$sliderTimer.dateRangeSlider("min", min - 1);
            this.$sliderTimer.dateRangeSlider("max", max + 1);
        };

        this.load = function() {

            console.log("CALL: form.load()");

            var test = stat.data;

            var min = new Date( stat.data.minDate );
            var max = new Date( stat.data.maxDate );

            this.setIntervalSlider(min, max);

            this.$cmbSelectTags.attr("title", "Select Tags");
            this.$cmbSelectNations.attr("title", "Select Nations");
            this.$cmbSelectUsers.attr("title", "Select Users");
            $cmbSelectTerms.attr("title", "Select Terms");

            //nations
            _.each(stat.data.nations, function(obj){
                DomUtil.addOptionValue(_self.$cmbSelectNations, obj.name);
            });

            //tags
            _.each(stat.data.allTags, function(obj){
                DomUtil.addOptionValue(_self.$cmbSelectTags, obj);
            });

            //users - attivo solo gli utenti che hanno tweet geolocalizzati
            var obj = null;
            var isDisable = true;
            for (var i = 0; i < 50 && i < users.length; i++ ){
                isDisable = true;
                obj = users[i];
                for(var j = 0; j < obj.counter.length; j++)
                    if(obj.counter[j].isGeo)
                        isDisable = false;
                DomUtil.addOptionValue(this.$cmbSelectUsers, obj.user, obj.sum, isDisable);
            }

            setComboTerms();

            $('.selectpicker').selectpicker('refresh');

            formCtrl.enableForm();
        };

        this.showSpinner = function($spinner){
            $spinner.removeClass("hidden");
            $spinner.removeClass("fa fa-spinner fa-spin spinner-datas");
            $spinner.addClass("fa fa-refresh fa-spin");
            $spinner.show();
        };

        this.hideSpinner = function($spinner){
            $spinner.removeClass("fa fa-refresh fa-spin");
            $spinner.addClass("fa fa-spinner fa-spin spinner-datas");
            $spinner.hide();
        };

        //click checkbox
        this.$chkHeatmap.click(function(){

            console.log( "CALL: $chkHeatmap.click (" + _self.$chkHeatmap.prop("checked") + ")" );

            if( _self.$chkHeatmap.prop("checked") )
                mapCtrl.heatmapCtrl.show();
            else
                mapCtrl.heatmapCtrl.hide();
        });

        this.$chkMarkercluster.click(function(){

            if( _self.$chkMarkercluster.prop("checked") )
                mapCtrl.markerCtrl.show();
            else
                mapCtrl.markerCtrl.hide();
        });

        this.$chkBoudaries.click(function(){

            var isChecked = _self.$chkBoudaries.prop("checked");

            $scope.$apply(function(){
                $scope.IsBoudariesChecked = isChecked;
            });

            if( isChecked )
                mapCtrl.boundariesCtrl.show();
            else
                mapCtrl.boundariesCtrl.hide();
        });

        this.reset = function() {
            this.$cmbSelectNations.attr("title", "Not available");
            this.$cmbSelectTags.attr("title", "Not available");
            this.$cmbSelectUsers.attr("title", "Not available");

            $cmbSelectTerms.attr("title", "Not available");

            $('.selectpicker').selectpicker('refresh');

            btnCtrl.removeWaitFromAllCheck();
            this.progressCount.$divProgress.hide();
        };

        this.$chkNormalize.change(function() {
            var value =  $(this).is(':checked');
            console.log("$chkNormalize: " + value);

            $scope.$apply(function(){
                $scope.IsNormalizeBoudariesChecked = value;
                _self.$cmbTypeNormalization.attr('disabled', !value);
                _self.$cmbTypeNormalization.selectpicker('refresh');
            });
            mapCtrl.boundariesCtrl.updateColorBoundaries();
        });

        this.$cmbTypeNormalization.change(function(){
            mapCtrl.boundariesCtrl.updateColorBoundaries();
        });

        this.getTypeNormalization = function() {
            if( !_self.$chkNormalize.is(':checked') )
                return -1;
            else
                return _self.$cmbTypeNormalization.val();
        }
    };

    // Button controller
    var BtnCtrl = function() {

        var _self = this;
        this.$imgFilterButton = $("#img-filter");
        this.$cmdFilter =        $('#cmdFilter');
        this.$cmdRestore =       $('#cmdRestore');

        this.removeWaitFromAllCheck = function() {
            $(".spinner-wait").addClass("hidden");
        };

        this.enableAllCheck = function () {
            $(".check-filter").removeAttr("disabled");
        };

        this.enableFilterButton = function(){
            this.$cmdFilter.removeAttr("disabled");
        };

        this.disableFilterButton = function(){
            this.$cmdFilter.prop("disabled", true);
        };

        this.addImgWaitFilterButton = function(){

            //this.$imgFilterButton.removeClass("hidden");
            this.$imgFilterButton.removeClass("glyphicon glyphicon-filter");
            this.$imgFilterButton.addClass("fa fa-spinner fa-spin");

        };

        this.removeImgWaitFilterButton = function()
        {
            this.$imgFilterButton.addClass("glyphicon glyphicon-filter");
            this.$imgFilterButton.removeClass("fa fa-spinner fa-spin");
        };

        this.$cmdFilter.click( function() {

            console.log("CALL: cmdFilter_click");

            _self.disableFilterButton();
            _self.addImgWaitFilterButton();

            var conditions = new ObjConditions( formCtrl.$cmbSelectNations,
                null, formCtrl.$cmbSelectTags,  formCtrl.$sliderTimer,
                formCtrl.$cmbSelectUsers,  $cmbSelectTerms
            );

            var queryString = conditions.getQueryString();

            async.waterfall([
                // chiedo il nuvo stat filtrato
                function(next){
                    DataCtrl.getFromUrl(DataCtrl.FIELD.STAT, queryString, function(docStat){
                        stat = docStat;
                        next(null);
                    });
                },
                //filtra le regioni selezionate
                function(next){
                    filteredRegions = _.filter(regions, function(obj){
                        return conditions.containNation(obj.properties.NAME_0);
                    });
                    next(null);
                },
                //chiedo i nuovi dati in maniera asincrona
                function(next){
                    getDataAsync(conditions);
                    next(null);
                }
            ], function()
            {
                mapCtrl.refreshLayers();
                btnCtrl.enableFilterButton();
                btnCtrl.removeImgWaitFilterButton();
            });

        });

        this.$cmdRestore.click( function(){ location.reload(); })
    };

    //Progress
    var ProgressCount = function(idProgress) {

        this.$divProgress = $('#' + idProgress + " > div");
        this.$divText = $( '#' + idProgress + " > div > div");

        this.setPercentage = function(){

            var tot = 0;
            var all = 0;
            if( stat && stat.data )
            {
                tot = stat.data.countGeo;
                all = stat.data.countTot;
            }else
            {
                tot = 0;
                all = 0;
            }

            if(tot>0)
            {
                var fatti = datas.length;
                var percentage = parseInt( (fatti / tot) * 100 ).toFixed(2);

                this.$divProgress.prop("aria-valuenow", percentage );
                this.$divProgress.css("width", percentage + "%");
                this.$divText.text(percentage + "% - " + fatti + " / " + tot + " of " + all);
            }
            else
            {
                this.$divText.text("No data available");
            }

        };

        this.stopProgress = function(){
            this.$divProgress.removeClass("active");
        };

        this.reset = function(){
            this.$divProgress.addClass("active");
            this.$divProgress.prop("aria-valuenow", 0 );
            this.$divProgress.css("width", 0 + "%");
            this.$divText.text("Loading...");
        };

    };

    //BoundariesCtrl
    var BoudariesCtrl = function(map) {

        var _self = this;
        this.map = map;
        this.layer = null;
        this.legend = null;

        this.activeLayerBoundaries = null;
        this.showInfoActiveLayer = false;

        this.refresh = function(){
            if(!formCtrl.$chkBoudaries.prop("checked")) return;
            this.show();
        };

        this.show = function() {

            console.log("CALL: boundaries.show()");

            formCtrl.showSpinner(formCtrl.$spinnerBoundaries);

            if (this.layer != null) this.hide();    //funziona anche da refresh

            this.layer = L.geoJson( filteredRegions, {
                style: _self.styleFeature,
                onEachFeature: _self.onEachFeature
            });

            this.layer.addTo( this.map );
            this.layer.bringToFront();

            this.insertLegend();

            formCtrl.hideSpinner(formCtrl.$spinnerBoundaries);

        };

        this.hide = function() {

            console.log("CALL: hideBoundaries.hide()");

            if ( this.layer != null)
            {
                this.map.removeLayer( this.layer );
                this.layer = null;
                this.removeLegend();
            }
        };

        this.insertLegend = function() {

            console.log("CALL: insertLegend");

            if ( this.legend == null) {
                this.legend = L.control( {position: 'bottomleft'});
                this.legend.onAdd = function () { //map
                    var div = L.DomUtil.create('div', 'info legend'),
                        grades = [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
                        labels = [],
                        from, to;
                    labels.push('<label style="margin: 0 0 10px;text-align: center"><b>Percentage of<br>total points</b></label>');
                    for (var i = 0; i < grades.length; i++) {
                        from = grades[i];
                        to = grades[i + 1];

                        labels.push(
                            '<i style="background:' + _self.getColorBoundaries(from + 0.01) + '"></i> ' +
                            from + (to ? '&ndash;' + to : '+'));
                    }
                    div.innerHTML = labels.join('<br>');
                    return div;
                };
                this.legend.addTo(this.map);
            }
        };

        this.removeLegend = function() {
            if( this.legend != null ) {
                this.map.removeControl( this.legend );
                this.legend = null;
            }
        };

        this.getColorBoundaries = function(percentage) {
            return percentage > 0.8 ? '#800026' :
                percentage > 0.7 ? '#BD0026' :
                    percentage > 0.6 ? '#E31A1C' :
                        percentage > 0.5 ? '#FC4E2A' :
                            percentage > 0.4 ? '#FD8D3C' :
                                percentage > 0.3 ? '#FEB24C' :
                                    percentage > 0.2 ? '#FED976' :
                                        '#FFEDA0';
        };

        this.getAvg = function(feature) {
            var nation = feature.properties.NAME_0;
            var region = feature.properties.NAME_1;
            var avg = 0;
            if(stat.data.nations && stat.data.nations[nation] != null) {

                var type = formCtrl.getTypeNormalization();

                /**
                 *  Nessuna normalizzazione
                 */
                if (type == -1)
                    avg = stat.data.nations[nation].regions[region].avg;
                else
                    avg = stat.data.nations[nation].regions[region].avgWeighed[type];
            }
            return avg;
        };

        this.styleFeature = function(feature){
            var avg = _self.getAvg( feature );
            return {
                fillColor: _self.getColorBoundaries( avg ),
                fillOpacity: 0.5,
                weight: 2,
                opacity: 0.5,
                color: 'white',
                dashArray: '3'
            }
        };

        this.onEachFeature = function(feature, layer){
            layer.on({
                mouseover: _self.onFeatureMouseover,
                mouseout: _self.onFeatureMouseout,
                click: _self.onFeatureClick
            });
        };

        this.onFeatureMouseover = function(e) {
            var layer = e.target;
            _self.map.dragging.disable();

            layer.setStyle({
                weight: 5, color: '#666',
                dashArray: '', fillOpacity: 0.7
            });

            if (!L.Browser.ie && !L.Browser.opera) { layer.bringToFront(); }
        };

        this.onFeatureMouseout = function(e) {

            if ( this.activeLayerBoundaries != null &&
                this.showInfoActiveLayer ) return;

            _self.map.dragging.enable();
            _self.layer.resetStyle(e.target);
        };

        this.onFeatureClick = function(e) {

            // lock map
            _self.activeLayerBoundaries = e.target;

            // chiudo altri popup aperti
            if ( _self.showInfoActiveLayer ) {
                _self.map.closePopup(); return;
            }

            var nation = e.target.feature.properties.NAME_0;
            var region = e.target.feature.properties.NAME_1;

            var avg = stat.data.nations[nation].regions[region].avg;
            var avgWeighed = stat.data.nations[nation].regions[region].avgWeighed;
            var baseNorm = stat.data.nations[nation].regions[region].baseNorm;

            var tot_tweet = 0;
            var counter = {};
            if( stat.data.nations[nation] != null &&
                stat.data.nations[nation].regions[region] != null)
            {
                var eNation = stat.data.nations[nation].regions[region];
                tot_tweet = eNation.count;
                counter = eNation.counter;
            }

            var pop = '<div class="popup">' +
                '<h3 class="title-popup" style="min-width: 100px">' +
                region +
                '</h3>';

            _.each(counter, function(obj, k){
                var tag = k.charAt(0).toUpperCase() + k.slice(1) + ': ';
                pop = pop +
                    '<div class="row-popup">' +
                    '<div class="label-popup-left">' + tag + '</div>' +
                    '<div class="label-popup-right">' + obj.count + '</div>' +
                    '</div>';
            });

            pop += "<hr class='separator'>";

            pop +=
                '<div class="row-popup">' +
                '<div class="label-popup-left">Tot:</div>' +
                '<div class="label-popup-right">' + tot_tweet + '</div>';

            pop += "<hr class='separator'>";

            pop += '<div class="row-popup">' +
                        '<div class="label-popup-left">Avg:</div>' +
                        '<div class="label-popup-right">' + avg.toFixed(2) +
                    '</div>';

            //potrebbero esserci delle nazioni che non compaiono nel dataset per la normalizzazione
            if( avgWeighed[0] != null && baseNorm )
            {
                pop += '<div class="row-popup">' +
                    '<div class="label-popup-left">BaseNorm:</div>' +
                    '<div class="label-popup-right">' + baseNorm +
                    '</div>';

                pop += '<div class="row-popup">' +
                    '<div class="label-popup-left">Simple:</div>' +
                    '<div class="label-popup-right">' + avgWeighed[0].toFixed(2) +
                    '</div>';

                pop += '<div class="row-popup">' +
                    '<div class="label-popup-left">Logarithmic:</div>' +
                    '<div class="label-popup-right">' + avgWeighed[1].toFixed(2) +
                    '</div>';
            }else{

                pop += '<div class="row-popup">' +
                    '<div class="label-popup-left">BaseNorm:</div>' +
                    '<div class="label-popup-right">' + 0 +
                    '</div>';

                pop += '<div class="row-popup">' +
                    '<div class="label-popup-left">Simple:</div>' +
                    '<div class="label-popup-right">-' +
                    '</div>';

                pop += '<div class="row-popup">' +
                    '<div class="label-popup-left">Logarithmic:</div>' +
                    '<div class="label-popup-right">-'
                    '</div>';
            }

            pop += "</div>";

            console.log("Popup " + e.target.feature.properties.NAME_1);
            e.target.bindPopup(pop).openPopup();
            //mainMap.fitBounds(e.target.getBounds());
        }

        this.updateColorBoundaries = function(){
            console.log("CALL: updateColorBoundaries");
            _.each( _self.layer.getLayers(), function(layer){
                _self.layer.resetStyle(layer);
            });
        };

    };

    //HeatMapController
    var HeatmapCtrl = function(map) {

        var _self = this;

        this.map = map;
        this.cfg = {
            // radius should be small ONLY if scaleRadius is true (or small radius is intended)
            // if scaleRadius is false it will be the constant radius used in pixels
            //"radius": 100,
            "radius": 100,
            //"maxOpacity": 0.6,
            "maxOpacity": 0.5,
            // scales the radius based on map zoom
            "scaleRadius": false,
            // if set to false the heatmap uses the global maximum for colorization
            // if activated: uses the data maximum within the current map boundaries
            //   (there will always be a red spot with useLocalExtremas true)
            "useLocalExtrema": false,
            // which field name in your data represents the latitude - default "lat"
            latField: 'latitude',
            // which field name in your data represents the longitude - default "lng"
            lngField: 'longitude',
            // which field name in your data represents the data value - default "value"
            valueField: 'count'
        };

        this.layer = new HeatmapOverlay( this.cfg );
        this.map.addLayer( this.layer );                //sembra un bug di leaflet

        this.show = function() {

            console.log("CALL: heatmap.show()");

            formCtrl.showSpinner(formCtrl.$spinnerHeatmap);

            //if ( !this.map.hasLayer(this.layer) && formCtrl.$chkHeatmap.prop("checked") )

            _self.map.addLayer(_self.layer);
            _self.setData();

            formCtrl.hideSpinner(formCtrl.$spinnerHeatmap);
        };

        this.hide = function(){
            console.log("CALL: heatmap.hide()");
            this.map.removeLayer( this.layer );
        };

        this.setData = function() {

            if(!formCtrl.$chkHeatmap.prop("checked")) return;   //bug di leaflet

            if(_self.map.hasLayer(_self.layer) == false ) _self.map.addLayer(_self.layer);

            console.log("CALL: heatmap.setData - data.lenght=" + datas.length);

            _self.layer.setData( { max: 1,  data: datas });
        };

        this.clear = function(){
            this.map.removeLayer( this.layer );
        }
    };

    //Marker cluster
    var MarkerClusterCtrl = function(map){

        var _self = this;
        this.map = map;
        this.layer = null;

        this.show = function(){
            console.log("CALL: markerCluster.show()");
            formCtrl.showSpinner(formCtrl.$spinnerCluster);

            //setTimeout(this.showAsync, 100);

            if(this.layer == null){
                this.layer = new L.markerClusterGroup({
                    animateAddingMarkers: true,
                    chunkedLoading: true
                });
            }

            setTimeout(function(){
                _self.setData();
                formCtrl.hideSpinner(formCtrl.$spinnerCluster);
            },100);

        };

        this.hide = function(){
            console.log("CALL: markerCluster.hide()");
            this.map.removeLayer( this.layer );
        };

        this.appendData = function(docs){

            if(!this.layer) return;
            if(!formCtrl.$chkMarkercluster.prop("checked")) return;   //bug di leaflet

            var markerList = [];
            async.each( docs,
                function(d, next) {
                    markerList.push(_self.createMarker(d)); next(null);
                } ,
                function() {
                    _self.layer.addLayers( markerList );
                }
            );
        };

        this.setData = function(){

            console.log("CALL: markerCluster.setData()");

            if(!this.layer) return;

            _self.layer.clearLayers();
            _self.appendData(datas);
            _self.map.addLayer( _self.layer );
        };

        this.createMarker = function(d) {
            var etichetta = d.tag;
            var text = d.text;
            var lat = d.latitude;
            var lng = d.longitude;
            var icon = this.getIcon(etichetta);

            var marker = new L.Marker(
                new L.LatLng(lat, lng),
                {
                    icon: icon,
                    title: text
                });
            marker.bindPopup(text +
                "<br><b>User: </b>" + d.user +
                "<br><b>Tag: </b>" + etichetta +
                "<br><b>Lon: </b>" + lng +
                "<br><b>Lat: </b>" + lat);
            return marker;
        };

        this.getIcon = function(etichetta) {
            switch (etichetta)
            {
                case "omofobia":    return this.getAwesomeMarker("blue");
                case "donne":       return this.getAwesomeMarker("red");
                case "razzismo":    return this.getAwesomeMarker("green");
                case "diversità":   return this.getAwesomeMarker("orange");
                default :           return this.getAwesomeMarker("purple");
            }
        };

        this.clear = function(){
            if(_self.layer)
                _self.layer.clearLayers();
        };

        this.getAwesomeMarker = function(color){
            return L.AwesomeMarkers.icon({
                icon: 'fa-twitter',
                prefix: 'fa',
                markerColor: color
            });
        }

    };

    //Map Ctrl
    var MapCtrl = function(IDMap) {

        var _self = this;

        this.IDMap = IDMap;
        this.mainMap = null;
        this.$map = $('#' + IDMap);

        function createMap() {
            var lat = 42.22;
            var long = 12.986;

            // set up the map
            _self.mainMap = new L.Map( _self.IDMap);

            // create the tile layer with correct attribution
            var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';

            var osm = new L.TileLayer( osmUrl, {
                minZoom: 2,
                maxZoom: 13,
                attribution: osmAttrib
            });

            // start the map in Italy
            _self.mainMap.setView( new L.LatLng(lat, long), 6 );
            _self.mainMap.addLayer(osm);
        }

        function resizeMap() {
            //_self.$map.css("height", $(window).height()); // -200
            //_self.$map.css("height", 400); // -200
            _self.$map.css("height", "100%"); // -200
        }

        resizeMap();
        createMap();

        this.heatmapCtrl = new HeatmapCtrl(this.mainMap);
        this.markerCtrl = new MarkerClusterCtrl(this.mainMap);
        this.boundariesCtrl = new BoudariesCtrl(this.mainMap);

        $(window).on("resize", function(){
            resizeMap();
        });

        $(document).ready(function() {
            _self.mainMap.invalidateSize();
        });

        this.refreshLayers = function()
        {
            mapCtrl.heatmapCtrl.clear();
            mapCtrl.markerCtrl.clear();
            mapCtrl.boundariesCtrl.refresh();
        }

    };
    var mapCtrl = new MapCtrl('map');
    var btnCtrl = new BtnCtrl();
    var formCtrl = new FormCtrl();

    function getAllData(){
        console.log("CALL: getAllData");
        async.parallel({
            stat: function(next){
                DataCtrl.getField( function(doc){
                    stat = doc;
                    next( null, doc );
                }, DataCtrl.FIELD.STAT );
            },
            regions: function (next) {
                DataCtrl.getField(
                    function(doc) {
                        regions = doc;
                        filteredRegions = doc;
                        next(null, doc);
                    },
                    DataCtrl.FIELD.REGIONSJSON
                );
            },
            users: function (next)      {
                DataCtrl.getField( function(doc){
                    users = doc;
                    next(null, doc);
                }, DataCtrl.FIELD.USERS, 50);
            },
            wordcount: function (next)  {
                DataCtrl.getField( function(doc)
                {
                    terms = doc;
                    next(null, doc);
                }, DataCtrl.FIELD.WORDCOUNT);
            }
        }, function() {

            if( stat.data.nations == null )
            {
                bootbox.dialog({
                    title: "Progetto non sincronizzato",
                    message: 'Il progetto non è sincronizzato.<br>' +
                             "Per poter vedere le statistiche complete è necessario effettuare la sincronizzazione tramite l'apposito pulsante<br>" +
                             '<a href="/view/app/#/project/editproject">Edit Project</a>'
                });
            }

            getDataAsync();
            formCtrl.load();
        });
    }

    var idOp = 0;
    var cont = 0;
    /**
     * Timer per la lettura dei dati
     */
    function getDataAsync(condictions){
        formCtrl.progressCount.reset();
        cont = 0;
        datas = [];

        if(condictions == null) condictions = new ObjConditions();

        var timeout = setTimeout( function(){
            idOp++;
            _getDataAsync(idOp-1, condictions, timeout, 1000, 0);
        } , 0 );
    }

    /**
     * funzione asincrona che viene richiamata dal timer
     */
    function _getDataAsync(_idOp, condictions, timeout, step, start) {

        if (_idOp != idOp - 1) return;

        condictions.setLimit(step);
        condictions.setSkip(start);
        condictions.setIsGeo(true);

        var queryString = condictions.getQueryString();
        cont++;

        DataCtrl.getFromUrl(DataCtrl.FIELD.DATA, queryString, function (doc) {

            if (_idOp != idOp - 1) return;

            datas = datas.concat(doc);
            formCtrl.progressCount.setPercentage();

            mapCtrl.heatmapCtrl.setData();
            mapCtrl.markerCtrl.appendData(doc);
            cont++;
            //&& cont < 1
            if (doc.length > 0) {
                start += step;
                var newTimeout = setTimeout(function () {
                    _getDataAsync(_idOp, condictions, newTimeout, step, start);
                }, 0);
            } else {
                clearTimeout(timeout);
                formCtrl.progressCount.stopProgress();
            }
        });
    }

    /**
     * Imposta la combobox dei termini
     */
    function setComboTerms(){

        DomUtil.clearSelectpicker($cmbSelectTerms);

        var key = $radioData.is(":checked")
            ? "syncDataTags" :
            "syncUserTags";
        var selectedVocabulary = terms[key];
        var tags = _.keys(selectedVocabulary);

        _.each(tags, function(tag){

            var result = {
                terms : [],
                count: []
            };

            _.each(terms[key][tag], function(obj){
                result.terms.push( obj.token );
                result.count.push( obj.count );
            });
            DomUtil.addOptionGroup($cmbSelectTerms, tag,
                                   result.terms, result.count );
        });

        $cmbSelectTerms.selectpicker('refresh');
    }

    /**
     * EVENT
     */
    $('.typeVoc').change( function(){
        console.log('typeVoc change');
        setComboTerms();
    });

    /**
     * ON LOAD
     */
    if(!window.PROJECT)
    {
        bootbox.alert("You must first select a project<br><a href='/view/app/#project/openproject'>Select project</a>");
        formCtrl.reset();
    }
    else
    {
        getAllData();
    }

}]);