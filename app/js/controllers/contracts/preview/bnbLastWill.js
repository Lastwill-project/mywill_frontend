angular.module('app').controller('bnbLastWillPreviewController', function($timeout, $rootScope, contractService, openedContract, $scope) {
    $scope.contract = openedContract.data;

    $scope.iniContract($scope.contract);

    var contractDetails = $scope.contract.contract_details;
    var durationList = [
        {
            value: 365,
            name: 'YEARS'
        }, {
            value: 30,
            name: 'MONTHS'
        }, {
            value: 1,
            name: 'DAYS'
        }
    ];
    var checkInterval = durationList.filter(function(check) {
        return !(contractDetails.check_interval % (check.value * 24 * 3600));
    })[0];

    if (checkInterval) {
        contractDetails.check_interval = {
            period: contractDetails.check_interval / (checkInterval.value * 24 * 3600),
            periodUnit: checkInterval.name
        };
    } else {
        contractDetails.check_interval = {};
    }

});