function resultsCtrl($scope, $http, $location, $window){
  $scope.defaults = [
    {text:'PrepId',select:true, db_name:'prepid'},
    {text:'Actions',select:true, db_name:''},
    {text:'Approval',select:true, db_name:'approval'},
 	  {text:'Chain',select:true, db_name:'chain'},
  ];
  $scope.update = [];
  $scope.show_well = false;
  $scope.chained_campaigns = [];
  $scope.filt = {};
  if ($location.search()["db_name"] === undefined){
    $scope.dbName = "chained_requests";
  }else{
    $scope.dbName = $location.search()["db_name"];
  }

  $scope.new = {};
  $scope.selectedAll = false;
  $scope.underscore = _;
  $scope.puce= {};
  $scope.r_status = {};
  $scope.selected_prepids = [];

  if($location.search()["page"] === undefined){
    page = 0;
    $location.search("page", 0);
    $scope.list_page = 0;
  }else{
    page = $location.search()["page"];
    $scope.list_page = parseInt(page);
  }

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
					       'submitted' : 'led-orange.gif',
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
        alert('Could not save data to database.');
      }
    }).error(function(status){
      alert('Error no.' + status + '. Could not delete object.');
    });
  };

  $scope.single_step = function(step, prepid, extra){
    $http({method:'GET', url: 'restapi/'+$scope.dbName+'/'+step+'/'+prepid+extra}).success(function(data,status){
      $scope.update["success"] = data["results"];
      $scope.update["fail"] = false;
      $scope.update["status_code"] = status;
	    $window.location.reload();
    }).error(function(status){
      $scope.update["success"] = false;
      $scope.update["fail"] = true;
      $scope.update["status_code"] = status;
    });
  };

  $scope.select_all_well = function(){
    $scope.selectedCount = true;
    var selectedCount = 0
    _.each($scope.defaults, function(elem){
      if (elem.select){
        selectedCount +=1;
      }
      elem.select = true;
    });
    if (selectedCount == _.size($scope.defaults)){
      _.each($scope.defaults, function(elem){
        elem.select = false;
      });
      $scope.defaults[0].select = true; //set prepid to be enabled by default
      $scope.defaults[1].select = true; // set actions to be enabled
      $scope.defaults[2].select = true; // set actions to be enabled
      $scope.defaults[3].select = true; // set actions to be enabled
      $scope.selectedCount = false;
    }
  };
    
  $scope.submit_edit = function(){
    $http({method:'PUT', url:'restapi/'+$scope.dbName+'/update/',data:JSON.stringify($scope.result[1])}).success(function(data,status){
      $scope.update["success"] = data["results"];
      $scope.update["fail"] = false;
      $scope.update["status_code"] = status;
      $window.location.reload();
    }).error(function(data,status){
      $scope.update["success"] = false;
      $scope.update["fail"] = true;
      $scope.update["status_code"] = status;
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

  $scope.showing_well = function(){
    if ($scope.show_well){
      $scope.show_well = false;
    }
    else{
      $scope.show_well = true;
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

  $scope.$watch('list_page', function(){
    var query = ""
      _.each($location.search(), function(value,key){
        query += "&"+key+"="+value
    });
    $scope.got_results = false; //to display/hide the 'found n results' while reloading
    var promise = $http.get("search/?"+ "db_name="+$scope.dbName+query);
    promise.then(function(data){
      $scope.got_results = true;
      $scope.result = data.data.results; 
      if ($scope.result.length != 0){
        columns = _.keys($scope.result[0]);
        rejected = _.reject(columns, function(v){return v[0] == "_";}); //check if charat[0] is _ which is couchDB value to not be shown
//         $scope.columns = _.sortBy(rejected, function(v){return v;});  //sort array by ascending order
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
      }
    }, function(){
       alert("Error getting information");
    });
  });
  
  $scope.previous_page = function(current_page){
    if (current_page >-1){
      $location.search("page", current_page-1);
      $scope.list_page = current_page-1;
    }
  };

  $scope.next_page = function(current_page){
    if ($scope.result.length !=0){
      $location.search("page", current_page+1);
      $scope.list_page = current_page+1;
    }
  };

  $scope.flowChainedRequest = function(prepid){
    var promise = $http.get("restapi/"+$scope.dbName+"/flow/"+prepid);
    promise.then(function(data){
      switch(data.data.results){
        case true:
          alert("Chained Request flow was successful!");
          break;
        case false:
          alert("Could not save data to database.");
          break;
        default:
          alert(data.data.results);
      };
      $window.location.reload();
    }, function(data){
      alert("Error. Status: "+data.status);
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
        $scope.update["success"] = true;
        $scope.update["result"] = data;
        $scope.update["fail"] = false;
        $scope.update["status_code"] = status;
        $window.location.reload();
      }).error(function(status){
        $scope.update["success"] = false;
        $scope.update["fail"] = true;
        $scope.update["result"] = data;
        $scope.update["status_code"] = status;
      });
    }else{
      alert("No requests selected");
    };
  };

  $scope.multiple_flow = function(){
    if ($scope.selected_prepids.length > 0){
      $http({method:'GET', url:'restapi/'+$scope.dbName+'/flow/'+$scope.selected_prepids.join()}).success(function(data,status){
        $scope.update["success"] = true;
        $scope.update["result"] = data;
        $scope.update["fail"] = false;
        $scope.update["status_code"] = status;
        $window.location.reload();
      }).error(function(status){
        $scope.update["success"] = false;
        $scope.update["fail"] = true;
        $scope.update["result"] = data;
        $scope.update["status_code"] = status;
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
};

// NEW for directive
var testApp = angular.module('testApp', []).config(function($locationProvider){$locationProvider.html5Mode(true);});
testApp.directive("inlineEditable", function(){
  return{
      require: 'ngModel',
      template: 
      '<textarea ng-model="whatever_value" ng-change="update()" style="width: 390px; height: 152px;">'+
      '</textarea>',
      link: function(scope, element, attrs, ctrl){
       
       ctrl.$render = function () {
            scope.whatever_value = JSON.stringify(ctrl.$viewValue, null, 4);
       }
       
       scope.update = function () {
           var object = null;
           try {
               object = JSON.parse(scope.whatever_value);
               ctrl.$setViewValue(scope.whatever_value);
               ctrl.$setValidity("bad_json", true);
           } catch (err) {
               ctrl.$setValidity("bad_json", false);
           }
       }
    }
  }
});
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
//     '          <th style="padding: 0px;">Message</th>'+
    '          <th style="padding: 0px;">Date</th>'+
    '          <th style="padding: 0px;">User</th>'+
    '        </tr>'+
    '      </thead>'+
    '      <tbody>'+
    '        <tr ng-repeat="elem in show_info">'+
    '          <td style="padding: 0px;">{{elem.action}}</td>'+
//     '          <td style="padding: 0px;"><a rel="tooltip" title={{elem.message}}><i class="icon-info-sign"></i></a></td>'+
    '          <td style="padding: 0px;">{{elem.updater.submission_date}}</td>'+
    '          <td style="padding: 0px;">'+
    '              <div ng-switch="elem.updater.author_name">'+
    '                <div ng-switch-when="">{{elem.updater.author_username}}</div>'+
    '                <div ng-switch-default>{{elem.updater.author_name}}</div>'+
    '              </div>'+
    '          </td>'+
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