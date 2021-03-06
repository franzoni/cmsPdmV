function resultsCtrl($scope, $http, $location, $window){
    //test
    $scope.allRequestData=[];
    $scope.requests = {};
    $scope.requests.selections=['prepid', 'priority', 'pwg'];
    $scope.requests.options={grouping:['member_of_campaign'], value:"total_events", stacking:[], coloring:"status" };
    $scope.requests.settings={duration:1000, legend:true, sort:true};
    $scope.requests.radio={'scale':["log", "linear"], 'operation':["sum", "count"]};
    $scope.piecharts = {};
    $scope.piecharts.sum = "total_events";
    $scope.piecharts.fullTerms = ["new", "validation", "defined", "approved", "submitted", "done"];
    $scope.piecharts.compactTerms = ["done", "to do"];
    $scope.piecharts.nestBy = ["member_of_campaign", "status"];
    $scope.piecharts.domain = ["new", "validation", "done" , "approved", "submitted", "nothing", "defined", "to do"];
    //endtest
    $scope.update = [];
    $scope.bjobsOptions = {bjobsOutput:"", bjobsGroup: groupName()};
    $scope.turn_off_button_clicked = false;
    $scope.clear_rest_button_clicked = false;
    $scope.tabsettings={
        batch:{
            active:true
        },
        stats:{
            active:false
        },
        logs:{
            active:false
        }
    };
    $scope.logs = {
        lines : 10,
        list: [{name: 'error', modified: ''}, {name: 'inject', modified: ''}, {name: 'access', modified: ''}]
    };
    $scope.selectedLog = $scope.logs.list[0];
    $scope.fontSize = 12;
    $scope.items = [];
    for(var i = 9;i<18;i++){
        $scope.items.push(i)
    }
    if ($location.search()["db_name"] === undefined){
      $scope.dbName = "dashboard";
    }else{
      $scope.dbName = $location.search()["db_name"];
    }
    function groupName(){
        if($scope.isDevMachine())
            return " -g dev";
        else
            return " -g prod"
    }

    function removeEmptyString(dict){
        var output_array = [];
        var arr = Object.keys(dict).map(function(key){
            return dict[key];
        });
        arr.forEach(function(elem) {
            if (elem) {
                output_array.push(elem)
            }
        });
        return output_array
    }
    
    $scope.dashboard_stats = "<html><body><Please load the stats.</body></html>";
    $scope.get_stats = function(query, add){
        $scope.loadingData = true;
	var promise = $http.get("search/?db_name=requests&page=-1&"+query);
      promise.then(function(data){
          if(query!='' && add) {
            data.data.results.push.apply(data.data.results, $scope.allRequestData);
          }
        $scope.loadingData = false;
        $scope.allRequestData = data.data.results;
      }, function(){
        alert("Error getting requests");
        $scope.loadingData = false;

    });

	// var promise = $http.get("/mcm/restapi/dashboard/get_stats/all");
	// promise.then(function(data, status){
	// 	$scope.dashboard_stats = data.data;
	//     }, function(data, status){
	// 	alert("Error getting stats "+status);
	//     });
    };
    $scope.resetRestCounter = function() {
        $scope.clear_rest_button_clicked = true;
      var promise = $http.get("restapi/control/reset_rest_counter");
      promise.then(function(){
        alert("REST counters reset");
        $scope.clear_rest_button_clicked = false;
      }, function(){
        alert("Error resetting REST counters");
        $scope.clear_rest_button_clicked = false;
    });
    };

    $scope.turnOffServer = function() {
        $scope.turn_off_button_clicked = true;
      var promise = $http.get("restapi/control/turn_off");
      promise.then(function(){
        alert("Server turned off");
          setTimeout(function(){$window.location.reload()}, 5000);
      }, function(){
        alert("Couldn't turn off server");
            $scope.turn_off_button_clicked = false;
          setTimeout(function(){$window.location.reload()}, 1000);
    });
    };

    $scope.openPage = function(address) {
        $window.open(address);
    };

    $scope.getBjobsData = function(){
        var bjobs_options_array = removeEmptyString($scope.bjobsOptions);
        var bjobs_options = bjobs_options_array.join("/");
        var promise = $http.get("restapi/dashboard/get_bjobs/" + bjobs_options.toString());
        promise.then(function(data, status){
            $scope.update["success"] = true;
            $scope.update["fail"] = false;
            $scope.update["status_code"] = data.status;
            $scope.results = data.data.results
        }, function(data, status){
            $scope.update["success"] = false;
            $scope.update["fail"] = true;
            $scope.update["status_code"] = data.status;
    })};

    $scope.getLogData = function(log_name){
        var lines = $scope.logs.lines>100?-1:$scope.logs.lines;
        var promise = $http.get("restapi/dashboard/get_log_feed/" + log_name + "/" + lines);
        promise.then(function(data, status){
            $scope.update["success"] = true;
            $scope.update["fail"] = false;
            $scope.update["status_code"] = data.status;
            $scope.logs.results = data.data.results
        }, function(data, status){
            $scope.update["success"] = false;
            $scope.update["fail"] = true;
            $scope.update["status_code"] = data.status;
    })};

    $scope.getLines = function(line_number){
     return line_number>100?"All":line_number
    };

    $scope.$watch('tabsettings.batch.active', function(){
        if($scope.tabsettings.batch.active) {
            $scope.getBjobsData();
            //$scope.batch_int_id = setInterval($scope.getBjobsData, 60000);
        } else {
            clearInterval($scope.batch_int_id);
        }
    }, true);

//    $scope.$watch('tabsettings.stats.active', function(){
//    });

    function getLog() {
        if($scope.tabsettings.logs.active) {
            clearInterval($scope.logs.int_id);
            $scope.getLogData(($scope.logs.list[$scope.getLogIndex()]).name);
            $scope.logs.int_id = setInterval(function() { $scope.getLogData(($scope.logs.list[$scope.getLogIndex()]).name); }, 60000);
        } else {
            clearInterval($scope.logs.int_id);
        }
    }

    $scope.getLogs = function(){
        var promise = $http.get("restapi/dashboard/get_logs");
        promise.then(function(data){
                $scope.logs.list =  data.data.results;
                $scope.selectedLog = $scope.logs.list[0];
            }, function(data){
                alert("Error getting logs list: " +data.status);
            }
        )
    };

    $scope.getLogIndex = function() {
        return document.getElementById('selectLog').selectedIndex==undefined?0:document.getElementById('selectLog').selectedIndex;
    }

    $scope.$watch('logs.type', function(){
        getLog();
    });

    $scope.$watch('tabsettings.logs.active', function(){
        getLog();
        $scope.getVerbosity()
        $scope.getLogs();
    });

    $scope.$watch('bjobsOptions', function(){
        $scope.getBjobsData();
    }, true);

    $scope.$watch('logs.sliding', function() {
        if(!$scope.logs.sliding)
            if(!(($scope.logs.list[$scope.getLogIndex()])==undefined))
                $scope.getLogData(($scope.logs.list[$scope.getLogIndex()]).name);
    });

    $scope.selectValue = function() {
        return document.getElementById("selectFont").value;
    };

    $scope.getVerbosity = function() {
        var promise = $http.get("restapi/dashboard/get_verbosities");
        promise.then(function(data){
                var verbosities = data.data.results[0];
                var selected_verb = data.data.results[1];
                var max = Math.max.apply(null, Object.keys(verbosities));
                var min = Math.min.apply(null, Object.keys(verbosities));
                if(selected_verb > max)
                    selected_verb = max;
                else if (selected_verb < min)
                    selected_verb = min;
                $scope.logs.verbosities = verbosities;
                $scope.logs.verbosity =  verbosities[selected_verb];
            }, function(data){
                alert("Error getting verbosity information: " +data.status);
            }
        )
    };

    $scope.verbositySelected = function(verbosity) {
        $scope.logs.verbosity = $scope.logs.verbosities[verbosity];
        var promise = $http.get("restapi/control/set_verbosity/" + verbosity);
        promise.then(function(data){
            }, function(data){
                alert("Error setting verbosity: " +data.status);
            }
        )
    };

    function checkDisplayLog() {
        if (document.getElementById('selectLog')!=null)
            return document.getElementById('selectLog').selectedIndex;
        else
            return -2
    };

    $scope.$watch(checkDisplayLog(), function() {
       console.log(document.getElementById('selectLog').selectedIndex);
    });

    $scope.$watch("fontSize", function() {
        var pres = Array.prototype.slice.call(document.getElementsByClassName("fontPre"));
        pres.forEach(function(elem) {
            elem.style.fontSize = $scope.fontSize + "px";
        });
    });


}

