function resultsCtrl($scope, $http, $location){
//     http://prep-test.cern.ch/search/?db_name=campaigns&query=%22%22&page=0
    $scope.defaults = [
        {text:'PrepId',select:true, db_name:'prepid'},
        {text:'Actions',select:true, db_name:''},
    ];
    $scope.update = [];
    $scope.show_well = false;
    $scope.chained_campaigns = [];
    $scope.dbName = $location.search()["db_name"];
    $scope.new = {};
//     $scope.update["value"] = false;
//     console.log($location);
    if($location.search()["page"] === undefined){
        page = 0;
        $location.search("page", 0);
        $scope.list_page = 0;
    }else{
        page = $location.search()["page"];
        $scope.list_page = parseInt(page);
    }
    
    $scope.delete_object = function(db, value){
        $http({method:'DELETE', url:'restapi/'+db+'/delete/'+value}).success(function(data,status){
            console.log(data,status);
            if (data["results"]){
                alert('Object was deleted successfully.');
            }else{
                alert('Could not save data to database.');
            }
        }).error(function(status){
            alert('Error no.' + status + '. Could not delete object.');
        });
    };
    
    $scope.submit_edit = function(){
        console.log("submit function");
        console.log($scope.result);
        $http({method:'PUT', url:'restapi/'+$location.search()["db_name"]+'/update/',data:JSON.stringify($scope.result[1])}).success(function(data,status){
            console.log(data,status);
            $scope.update["success"] = data["results"];
            $scope.update["fail"] = false;
            $scope.update["status_code"] = status;
        }).error(function(data,status){
            $scope.update["success"] = false;
            $scope.update["fail"] = true;
            $scope.update["status_code"] = status;
        });
    };
    $scope.delete_edit = function(id){
        console.log("delete some from edit");
        $scope.delete_object($location.search()["db_name"], id);
    };
    $scope.display_approvals = function(data){
        console.log(data);
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
            console.log("true");
            $scope.show_well = true;
        }
    };    

   $scope.$watch('list_page', function(){
      console.log("modified");
      var promise = $http.get("search/?"+ "db_name="+$location.search()["db_name"]+"&query="+$location.search()["query"]+"&page="+$scope.list_page)
       promise.then(function(data){
        console.log(data);
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
        console.log($scope.requests_defaults);
    }, function(){
       console.log("Error"); 
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
  $scope.submit_create = function(){
    console.log($scope.new);    
    alert('to be imporved');
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