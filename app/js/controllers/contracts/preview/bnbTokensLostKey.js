angular.module('app').controller('bnbTokensLostKeyPreviewController', function($timeout, $rootScope, contractService, $state, $q,
                                                                          openedContract, $scope, $http, web3Service, $location) {

    $scope.contract = openedContract.data;

    $scope.iniContract($scope.contract);

    var contractDetails = $scope.contract.contract_details;

    var tabs = ['tokens', 'info', 'code'];

    $scope.maximumTokens = $scope.contract.maxTokensLimit;

    $scope.showedTab = $location.hash().replace('#', '');

    web3Service.setProviderByNumber($scope.contract.network);

    if (tabs.indexOf($scope.showedTab) === -1) {
        $scope.showedTab = tabs[1];
    }

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

    contractDetails.check_interval = {
        period: contractDetails.check_interval / (checkInterval.value * 24 * 3600),
        periodUnit: checkInterval.name
    };

    var checkLostKeyContract = function() {
        web3Service.getEthTokensForAddress(
            contractDetails.user_address,
            $scope.contract.network
        ).then(function(result) {
            var tokens = result.data;
            lostKeyContract.methods.getTokenAddresses().call().then(function(addedTokens) {
                tokens.forEach(function(token) {
                    var tokenInfo = token.token_info || token.tokenInfo;
                    tokenInfo.balanceOf = token.balance;
                    var tokenIsConfirmed = !!addedTokens.filter(function(t) {
                        return t.toLowerCase() === tokenInfo.address;
                    }).length;
                    addedTokens = addedTokens.filter(function(t) {
                        return t.toLowerCase() !== tokenInfo.address;
                    });
                    checkTokenInfo(tokenInfo.address).then(function(tokenResult) {
                        tokenResult.confirmed = tokenIsConfirmed;
                        $scope.visibleTokensList.push(tokenResult);
                    });
                });
                addedTokens.forEach(function(tokenAddress) {
                    var confirmedTokenAddress = tokenAddress.toLowerCase();
                    checkTokenInfo(confirmedTokenAddress).then(function(tokenInfo) {
                        tokenInfo.confirmed = true;
                        $scope.visibleTokensList.push(tokenInfo);
                    });
                });
            });
        });
    };

    $scope.tokenAddressReady = false;

    $scope.customAddressCheck = {
        isProgressAddresses: []
    };

    var lostKeyContract;


    $scope.showTokensTab = false;
    if ($scope.contract.contract_details.eth_contract && $scope.contract.contract_details.eth_contract.address) {
        $scope.showTokensTab = true;
        $scope.visibleTokensList = [];
        lostKeyContract = web3Service.createContractFromAbi(
            contractDetails.eth_contract.address,
            contractDetails.eth_contract.abi
        );
        checkLostKeyContract();
    }


    var checkTokenInfo = function(address, customInfo, advTokenData) {
        var tokenData = customInfo || ['decimals', 'symbol', 'balanceOf', 'name', 'allowance'];
        var defer = $q.defer();
        var web3TokenContract = web3Service.createContractFromAbi(
            address, window.abi
        );
        var checkedTokenData = {};
        var sch = tokenData.length;
        var currMethod;

        tokenData.map(function(method) {
            var methodFn = web3TokenContract.methods[method];

            switch(method) {
                case 'balanceOf':
                    currMethod = methodFn(contractDetails.user_address);
                    break;
                case 'allowance':
                    currMethod = methodFn(
                        contractDetails.user_address,
                        $scope.contract.contract_details.eth_contract.address);
                    break;
                default:
                    currMethod = methodFn();
                    break;
            }
            currMethod.call(function(err, result) {
                if (err === null) {
                    checkedTokenData[method] = result;
                    sch--;
                    if (!sch) {
                        checkedTokenData.address = address;
                        checkedTokenData = advTokenData ? angular.merge(advTokenData, checkedTokenData) : checkedTokenData;
                        checkedTokenData.balance = new BigNumber(checkedTokenData.balanceOf).div(Math.pow(10, checkedTokenData.decimals)).toString(10);
                        checkedTokenData.checked = true;
                        checkedTokenData.allowed = new BigNumber(checkedTokenData.allowance) > 0;
                        defer.resolve(checkedTokenData);
                    }
                } else {
                    defer.reject();
                }
            });
        });
        return defer.promise;
    };

    var checkTokenAddress = function(token_address) {
        var defer = $q.defer();
        var address = token_address.$viewValue.toLowerCase();
        checkTokenInfo(address).then(function(result) {
            defer.resolve(result);
            token_address.$setValidity('contract-address', true);
        }, function() {
            defer.reject();
            token_address.$setValidity('contract-address', false);
        });
        return defer.promise;
    };

    $scope.resetTokenAddress = function(tokenAddress) {
        tokenAddress.$error['contract-address'] ?
            tokenAddress.$setValidity('contract-address', true) : false;

        tokenAddress.$error['allowance-address'] ?
            tokenAddress.$setValidity('allowance-address', true) : false;
    };

    $scope.closeAllowTokenPopup = function() {
        $scope.tokenAddressReady = false;
    };

    $scope.closeConfirmTokenPopup = function() {
        $scope.tokenConfirmAddressReady = false;
    };

    $scope.closeAllConfirmTokenPopup = function() {
        $scope.allTokenConfirmAddressReady = false;
    };

    $scope.confirmToken = function(token) {
        $scope.tokenConfirmAddressReady = {
            token: token,
            contract: $scope.contract
        };
    };

    $scope.allowToken = function(token) {
        $scope.tokenAddressReady = {
            token: token,
            customField: $scope.customAddressCheck,
            lostKeyContract: {
                address: $scope.contract.contract_details.eth_contract.address
            },
            contract: {
                address: token.address,
                network: $scope.contract.network,
                admin_address: $scope.contract.contract_details.user_address,
                blockchain: $scope.contract.blockchain
            }
        };
    };

    $scope.allowCustomToken = function(tokenAddress) {
        var address = tokenAddress.$viewValue.toLowerCase();
        var currentToken = $scope.visibleTokensList.filter(function(existsToken) {
            return existsToken.address === address;
        })[0];
        if (currentToken) {
            if (!currentToken.allowed) {
                $scope.allowToken(currentToken, tokenAddress);
            } else {
                tokenAddress.$setValidity('allowance-address', false);
            }
            return;
        }

        checkTokenAddress(tokenAddress).then(function(web3TokenContract) {
            tokenAddress.$setValidity('allowance-address', !web3TokenContract.allowed);
            web3TokenContract.confirmed = false;
            $scope.visibleTokensList.push(web3TokenContract);
            if (!currentToken) {
                tokenAddress.$setViewValue('');
                tokenAddress.$$setModelValue('');
                tokenAddress.$setUntouched();
                tokenAddress.$$parentForm.$setUntouched();
            }
            if (!web3TokenContract.allowed) {
                $scope.allowToken(web3TokenContract);
            }
        }, function() {
            console.log('Not token');
        });
    };

    $scope.callAddTokens = function() {
        var notConfirmedTokens = $scope.visibleTokensList.filter(function(token) {
            return !token.confirmed && token.allowed;
        });

        $scope.allTokenConfirmAddressReady = {
            tokens_addresses: notConfirmedTokens,
            contract: $scope.contract
        };
    };

});
