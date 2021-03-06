function resultsCtrl($scope, $http, $location, $window){
  $scope.defaults = [
    {text:'PrepId',select:true, db_name:'prepid'},
    {text:'Actions',select:true, db_name:''},
    {text:'Approval',select:true, db_name:'approval'},
 	  {text:'Chain',select:true, db_name:'chain'},
  ];
  $scope.update = [];
  $scope.chained_campaigns = [];
  $scope.filt = {};
  if ($location.search()["db_name"] === undefined){
    $scope.dbName = "chained_requests";
  }else{
    $scope.dbName = $location.search()["db_name"];
  }
  
  $search_data = {};
  $scope.new = {};
  $scope.selectedAll = false;
  $scope.underscore = _;
  $scope.puce = {};
  $scope.r_status = {};
  $scope.selected_prepids = [];
  $scope.action_report = {};
  $scope.action_status = {};
  $scope.local_requests = {};
  $scope.tabsettings = {
    "view":{
      active:false
    },
    "search":{
      active:false
    },
    "navigation":{
      active:false
    },
    "navigation2":{
      active:false
    }
  };

  $scope.load_puce = function(prepid){
    for (i=0;i<$scope.result.length;i++){
	    if ($scope.result[i].prepid == prepid ){
		    chains = $scope.result[i].chain;
		     //console.log("Found chain",chains);
		    for (i=0; i<chains.length; i++){
		      prepid=chains[i];
		      // if already present. remove it to redisplay properly
		      if (_.keys($scope.puce).indexOf(prepid)!=-1 && $scope.puce [ prepid ]!= undefined ){
			      $scope.puce [ prepid ] = undefined;
			      $scope.r_status [ prepid ] = undefined;
		      }else{
			      $scope.puce[prepid] = 'processing-bg.gif';
			      $http({method:'GET', url: 'public/restapi/requests/get_status/'+prepid}).success(function(data,status){
				      r_prepid=_.keys(data)[0];
				      r_status = data[r_prepid];
				      $scope.r_status[ r_prepid ] = r_status;
				      status_map = { 'done' : 'led-green.gif',
						     'submitted' : 'led-blue.gif',
						     'approved' : 'led-orange.gif',
						     'defined' : 'led-orange.gif',
						     'validation' : 'led-red.gif',
						     'new' : 'led-red.gif'}
				      if (status_map[r_status]){
				        $scope.puce[ r_prepid ] = status_map[r_status];
              }else{
				        $scope.puce[ r_prepid ] = 'icon-question-sign';
				      }
				      //console.log("puce",$scope.puce);
			      }).error(function(status){
				      alert('cannot get status for '+r_prepid);
				    });
		      }
		    }
	    }
	  }
	//i = $scope.result.indexOf(prepid);
	//this_one=$scope.result[i];
	//console.log($scope.result)
	//	console.log(prepid,i,this_one);
	//["puce"] = ['icon-signal','icon-signal'];
  };

  $scope.delete_object = function(db, value){
    $http({method:'DELETE', url:'restapi/'+db+'/delete/'+value}).success(function(data,status){
      if (data["results"]){
        alert('Object was deleted successfully.');
      }else{
        alert('Could not delete because '+data['message']);
      }
    }).error(function(status){
      alert('Error no.' + status + '. Could not delete object.');
    });
  };

  $scope.single_step = function(step, prepid, extra){
    $http({method:'GET', url: 'restapi/'+$scope.dbName+'/'+step+'/'+prepid+extra}).success(function(data,status){
      $scope.parse_report([data],status);
    }).error(function(status){
      $scope.setFailure(status);
    });
  };

  $scope.delete_edit = function(id){
    $scope.delete_object($location.search()["db_name"], id);
  };

  $scope.sort = {
    column: 'prepid',
      descending: false
  };

  $scope.selectedCls = function(column) {
    return column == $scope.sort.column && 'sort-' + $scope.sort.descending;
  };

  $scope.changeSorting = function(column) {
    var sort = $scope.sort;
    if (sort.column == column) {
      sort.descending = !sort.descending;
    } else {
      sort.column = column;
      sort.descending = false;
    }
  };

  $scope.statusIcon = function(value){
    icons = {'new' :  'icon-edit',
	       'validation' : 'icon-eye-open',
	       'defined' : 'icon-check',
	       'approved' : 'icon-share',
	       'submitted' : 'icon-inbox',
	       'injected' : 'icon-envelope',
	       'done' : 'icon-ok'
    }
    if (icons[value]){
	    return icons[value] ;
    }else{
	    return "icon-question-sign" ;
    }
  };

  $scope.approvalIcon = function(value){
    icons = { 'none':'icon-off',
		//'validation' : 'icon-eye-open',
		//		'define' : 'icon-check',
		  'flow' : 'icon-share',
		  'submit' : 'icon-ok'}
    if (icons[value]){
      return icons[value] ;
    }else{
	    return "icon-question-sign";
    }
  };
  $scope.parseColumns = function()
  {
    if ($scope.result.length != 0){
      columns = _.keys($scope.result[0]);
      rejected = _.reject(columns, function(v){return v[0] == "_";}); //check if charat[0] is _ which is couchDB value to not be shown
//       $scope.columns = _.sortBy(rejected, function(v){return v;});  //sort array by ascending order
      _.each(rejected, function(v){
        add = true;
        _.each($scope.defaults, function(column){
          if (column.db_name == v){
            add = false;
          }
        });
        if (add){
          $scope.defaults.push({text:v[0].toUpperCase()+v.substring(1).replace(/\_/g,' '), select:false, db_name:v});
        }
      });
      if ( _.keys($location.search()).indexOf('fields') != -1)
      {
        _.each($scope.defaults, function(elem){
          elem.select = false;
        });
        _.each($location.search()['fields'].split(','), function(column){
          _.each($scope.defaults, function(elem){
            if ( elem.db_name == column )
            {
              elem.select = true;
            }
          });
        });
      }
    }
      $scope.selectionReady = true;
  };

  $scope.getData = function(){
    if ( $location.search()['searchByRequests'] )
    {
      $scope.superSearch();
    }else {
      var query = ""
      _.each($location.search(), function(value,key){
        if (key!= 'shown' && key != 'fields'){
          query += "&"+key+"="+value;
        }
      });
      $scope.got_results = false; //to display/hide the 'found n results' while reloading
      var promise = $http.get("search?"+ "db_name="+$scope.dbName+query+"&get_raw");
      promise.then(function(data){
        $scope.got_results = true;
        $scope.result = _.pluck(data.data.rows, 'doc');
        $scope.parseColumns();
      },function(){
         alert("Error getting information");
      });
    }
  };

    $scope.$watch(function () {
          var loc_dict = $location.search();
          return "page" + loc_dict["page"] + "limit" +  loc_dict["limit"];
        },
        function () {
            $scope.getData();
            $scope.selected_prepids = [];
        });

  $scope.flowChainedRequest = function(prepid, force){
    var promise = $http.get("restapi/"+$scope.dbName+"/flow/"+prepid+force);
    promise.then(function(data){
      $scope.parse_report([data.data],status);
    }, function(data){
      $scope.setFailure(data.status);
    });
  };

  $scope.add_to_selected_list = function(prepid){
    if (_.contains($scope.selected_prepids, prepid)){
        $scope.selected_prepids = _.without($scope.selected_prepids,prepid)
    }else
        $scope.selected_prepids.push(prepid);
  };

  $scope.multiple_step = function(step, extra){
    if ($scope.selected_prepids.length > 0){
      $http({method:'GET', url:'restapi/'+$scope.dbName+'/'+step+'/'+$scope.selected_prepids.join()+extra}).success(function(data,status){
        $scope.parse_report(data,status);
      }).error(function(status){
        $scope.setFailure(status);
      });
    }else{
      alert("No requests selected");
    };
  };

  $scope.multiple_flow = function(opt){
    if ($scope.selected_prepids.length > 0){
      $http({method:'GET', url:'restapi/'+$scope.dbName+'/flow/'+$scope.selected_prepids.join()+opt}).success(function(data,status){
        $scope.parse_report(data,status);
      }).error(function(status){
        $scope.setFailure(status);
      });
    }else{
      alert("No requests selected");
    };
  };
 
  $scope.multiple_load = function(){
    for (i_load=0; i_load< $scope.selected_prepids.length; i_load++){
	    $scope.load_puce( $scope.selected_prepids[i_load] );
    }
  };

  $scope.toggleAll = function(){
    if ($scope.selected_prepids.length != $scope.result.length){
      _.each($scope.result, function(v){
        $scope.selected_prepids.push(v.prepid);
      });
      $scope.selected_prepids = _.uniq($scope.selected_prepids);
    }else{
      $scope.selected_prepids = [];
    }
  };
  $scope.parse_report = function(data,status){
    to_reload=true;
    for (i=0;i<data.length;i++){
    $scope.action_status[data[i]['prepid']] = data[i]['results'];
    if ( data[i]['results'] == true)
        {
      $scope.action_report[data[i]['prepid']] = 'OK';
        }
    else
        {
      $scope.action_report[data[i]['prepid']] = data[i]['message'];
      to_reload=false;
        }
      }      
      if (to_reload == true)
    {
        $scope.setSuccess(status);
    }
      else
    {
        $scope.setFailure(status);
    }
  };

  $scope.setFailure = function(status){
    $scope.update["success"] = false;
    $scope.update["fail"] = true; 
    $scope.update["status_code"] = status; 
  };

  $scope.setSuccess = function(status){
    $scope.update["success"] = true;
    $scope.update["fail"] = false; 
    $scope.update["status_code"] = status; 
    $scope.getData();
  };

  $scope.superSearch = function(){
    var search_data={
        searches: [
            {
                db_name: 'requests',
                return_field: 'member_of_chain',
                search: {}
            },
            {
                db_name: $scope.dbName,
                use_previous_as: 'prepid',
                search: {}
            }
        ]
    };
    _.each($location.search(),function(elem,key){
      if (key != "shown" && key != "searchByRequests" && key != "fields")
      {
          if(key == 'page' || key == 'limit' || key == 'get_raw') {
            search_data[key] = elem;
          } else {
              search_data.searches[0].search[key] = elem;
          }
      }
    });
    /*submit method*/
    $http({method:'POST', url:'multi_search', data: search_data}).success(function(data,status){
      $scope.result = data.results;
      $scope.got_results = true;
      $scope.parseColumns();
    }).error(function(status){
      $scope.update["success"] = false;
      $scope.update["fail"] = true;
      $scope.update["status_code"] = status;
    }); 
   };
  $scope.upload = function(file){
    /*Upload a file to server*/
    $scope.got_results = false;
    $http({method:'PUT', url:'restapi/'+$scope.dbName+'/listwithfile', data: file}).success(function(data,status){
      $scope.result = data.results;
      $scope.got_results = true;
    }).error(function(status){
      $scope.update["success"] = false;
      $scope.update["fail"] = true;
      $scope.update["status_code"] = status;
    });
  };
  $scope.preloadRequest = function(chain, load_single)
  {
    var url = "restapi/requests/get/"+chain;
    if ( !_.has($scope.local_requests,chain) ){
      var promise = $http.get(url);
      promise.then( function(data){
        var local_data = data.data.results.reqmgr_name;
        $scope.local_requests[chain] = local_data;
        if (load_single != "")
        {
          // console.log($scope.local_requests[chain]);
          _.each($scope.local_requests[chain],function(element, index){
            // console.log("braodcast: ",element.name, index, load_single);
            $scope.$broadcast('loadDataSet', [element.name, index, load_single]);
          });
        }
      },function(data){
        console.log("error",data);
      });
    }  
  };
  $scope.multiple_inspect = function()
  {
    _.each($scope.selected_prepids, function(selected_id){
        _.each($scope.result, function(element){
          if( element.prepid == selected_id)
          {
            //works!
            _.each($scope.r_status, function(v,k){
              //also wroks
              if (element.chain.indexOf(k)!= -1)
              {
                if (v =="submitted")
                {
                  $scope.preloadRequest(k,element.prepid);
                }
              }
            });              
          }
        });
    });
  };
};

// NEW for directive
// var testApp = angular.module('testApp', []).config(function($locationProvider){$locationProvider.html5Mode(true);});
testApp.directive("customHistory", function(){
  return {
    require: 'ngModel',
    template: 
    '<div>'+
    '  <div ng-hide="show_history">'+
    '    <input type="button" value="Show" ng-click="show_history=true;">'+
    '  </div>'+
    '  <div ng-show="show_history">'+
    '    <input type="button" value="Hide" ng-click="show_history=false;">'+
    '    <table class="table table-bordered" style="margin-bottom: 0px;">'+
    '      <thead>'+
    '        <tr>'+
    '          <th style="padding: 0px;">Action</th>'+
    '          <th style="padding: 0px;">Date</th>'+
    '          <th style="padding: 0px;">User</th>'+
    '          <th style="padding: 0px;">Step</th>'+
    '        </tr>'+
    '      </thead>'+
    '      <tbody>'+
    '        <tr ng-repeat="elem in show_info">'+
    '          <td style="padding: 0px;">{{elem.action}}</td>'+
    '          <td style="padding: 0px;">{{elem.updater.submission_date}}</td>'+
    '          <td style="padding: 0px;">'+
    '              <div ng-switch="elem.updater.author_name">'+
    '                <div ng-switch-when="">{{elem.updater.author_username}}</div>'+
    '                <div ng-switch-default>{{elem.updater.author_name}}</div>'+
    '              </div>'+
    '          </td>'+
   '          <td style="padding: 0px;">{{elem.step}}</td>'+  
    '        </tr>'+
    '      </tbody>'+
    '    </table>'+
    '  </div>'+
    '</div>'+
    '',
    link: function(scope, element, attrs, ctrl){
      ctrl.$render = function(){
        scope.show_history = false;
        scope.show_info = ctrl.$viewValue;
      };
    }
  }
});
testApp.directive("loadFields", function($http, $location){
  return {
    replace: true,
    restrict: 'E',
    template:
    '<div>'+
    '  <form class="form-inline">'+
    '    <span class="control-group navigation-form" ng-repeat="(key,value) in searchable">'+
    '      <label style="width:140px;">{{key}}</label>'+
    //'      <select ng-model="listfields[key]">'+
    //'        <option ng-repeat="elem in value">{{elem}}</option>'+
    //'      </select>'+
    '      <input class="input-medium" type="text" ng-hide="showOption[key]" ng-model="listfields[key]" typeahead="state for state in value | filter: $viewValue | limitTo: 10" style="width: 185px;">'+
    //'      <a class="btn btn-mini" ng-href="#" ng-click="toggleSelectOption(key)"><i class="icon-arrow-down"></i></a>'+
    '    </span>'+
    '  </form>'+
    '  <button type="button" class="btn btn-small" ng-click="getUrl();">Search</button>'+
    '  <button type="button" class="btn btn-small" ng-click="getSearch();">Reload menus</button>'+
    '  <img ng-show="loadingData" ng-src="https://twiki.cern.ch/twiki/pub/TWiki/TWikiDocGraphics/processing-bg.gif"/>'+
    '   <a ng-href="https://twiki.cern.ch/twiki/bin/view/CMS/PdmVMcM#Browsing" rel="tooltip" title="Help on navigation"><i class="icon-question-sign"></i></a>'+
    '</div>'
    ,
    link: function(scope, element, attr){
      scope.listfields = {};
      scope.showUrl = false;
      scope.showOption = {};

      scope.getSearch = function () {
        scope.listfields = {};
        scope.showUrl = false;
        var promise = $http.get("restapi/"+scope.dbName+"/searchable/do");
        scope.loadingData = true;
        promise.then(function(data){
          scope.loadingData = false;
          scope.searchable = data.data;
          _.each(scope.searchable, function(element,key){
            element.unshift("------"); //lets insert into begining of array an default value to not include in search
            scope.listfields[key] = "------";
          });
        }, function(data){
          scope.loadingData = false;
          alert("Error getting searchable fields: "+data.status);
        });
      };
      scope.cleanSearchUrl = function () {
        _.each($location.search(),function(elem,key){
          $location.search(key,null);
        });
        $location.search("page",0);
      };
      scope.getUrl = function () {
        scope.cleanSearchUrl();
         //var url = "?";
        _.each(scope.listfields, function(value, key){
          if (value != ""){
            //url += key +"=" +value+"&";
            $location.search(key,String(value));
          }else{
            $location.search(key,null);//.remove(key);
          }
        });
        scope.getData();
      };
      scope.$watch('tabsettings.navigation.active', function(){
        if (scope.tabsettings.navigation.active)
        {
          if (!scope.searchable) //get searchable fields only if undefined -> save time for 2nd time open of pane
          {
            var promise = $http.get("restapi/"+scope.dbName+"/searchable");
            scope.loadingData = true;
            promise.then(function(data){
              scope.loadingData = false;
              scope.searchable = data.data;
            }, function(data){
              scope.loadingData = false;
              alert("Error getting searchable fields: "+data.status);
            });
          }
        }
      },true);
    }
  }
});
testApp.directive("loadRequestsFields", function($http, $location){
  return {
    replace: true,
    restrict: 'E',
    template:
    '<div>'+
    '  <form class="form-inline">'+
    '    <span class="control-group navigation-form" ng-repeat="(key,value) in searchable">'+
    '      <label style="width:140px;">{{key}}</label>'+
    //'      <select bindonce ng-options="elem for elem in value" ng-model="listfields[key]" ng-show="showOption[key]" style="width: 164px;">'+
    //'      </select>'+
    '      <input class="input-medium" type="text" ng-hide="showOption[key]" ng-model="listfields[key]" ng-click="search_change(key)" typeahead="state for state in value | filter: $viewValue | limitTo: 10" style="width: 185px;">'+
    //'      <a class="btn btn-mini" ng-href="#" ng-click="toggleSelectOption(key)"><i class="icon-arrow-down"></i></a>'+
    '    </span>'+
    '  </form>'+
    '  <button type="button" class="btn btn-small" ng-click="getUrl();">Search</button>'+
    // '  <button type="button" class="btn btn-small" ng-click="getSearch();">Reload menus</button>'+
    '  <img ng-show="loadingData" ng-src="https://twiki.cern.ch/twiki/pub/TWiki/TWikiDocGraphics/processing-bg.gif"/>'+
    '  <a ng-href="https://twiki.cern.ch/twiki/bin/view/CMS/PdmVMcM#Browsing" rel="tooltip" title="Help on navigation"><i class="icon-question-sign"></i></a>'+
    '</div>',
    link: function (scope, element, attr) {
      scope.listfields = {};
      scope.showUrl = false;
      scope.showOption = {};

      // scope.getSearch = function () {
      //   scope.listfields = {};
      //   scope.showUrl = false;
      //   var promise = $http.get("restapi/requests/searchable/do");
      //   scope.loadingData = true;
      //   promise.then(function(data){
      //     scope.loadingData = false;
      //     scope.searchable = data.data;
      //     _.each(scope.searchable, function(element,key){
      //       element.unshift("------"); //lets insert into begining of array an default value to not include in search
      //       scope.listfields[key] = "------";
      //     });
      //   }, function(data){
      //     scope.loadingData = false;
      //     alert("Error getting searchable fields: "+data.status);
      //   });
      // };
      scope.cleanSearchUrl = function () {
        _.each($location.search(),function(elem,key){
          $location.search(key,null);
        });
        $location.search("page",0);
      };
      scope.getUrl = function () {
        scope.cleanSearchUrl();
        _.each(scope.listfields, function(value, key){
          if (value != ""){
            $location.search(key, String(value));
          }else{
            $location.search(key, null);//.remove(key);
          }
        });
        $location.search("searchByRequests", true);
        scope.getData();
      };
      scope.toggleSelectOption = function(option){
        if (scope.showOption[option])
        {
          scope.showOption[option] = false;
        }else
        {
          scope.showOption[option] = true;
        }
      };
      scope.search_change = function(field_name )
      {
        if (scope.searchable[field_name].length == 0)
        {
          var promise = $http.get("restapi/requests/unique_values/"+field_name);
          scope.loadingData = true;
          promise.then(function(data){
              scope.loadingData = false;
              _.each(data.data.results, function(elem)
                {
                  scope.searchable[field_name].push(elem);
                });
            }, function(data){
              scope.loadingData = false;
              alert("Error getting searchable fields: "+data.status);
            });
        }
      };
      scope.$watch('tabsettings.navigation2.active', function(){
        if (scope.tabsettings.navigation2.active)
        {
          if (!scope.searchable) //get searchable fields only if undefined -> save time for 2nd time open of pane
          {
            var promise = $http.get("restapi/requests/searchable");
            scope.loadingData = true;
            promise.then(function(data){
              scope.loadingData = false;
              scope.searchable = data.data;
            }, function(data){
              scope.loadingData = false;
              alert("Error getting searchable fields: "+data.status);
            });
          }
        }
      },true);
    }
  }
});