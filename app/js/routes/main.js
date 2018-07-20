'use strict';
var module = angular.module('app');
module.config(function($stateProvider, $locationProvider, $urlRouterProvider) {

    var templatesPath = '/templates/pages/';

    $stateProvider.state('main', {
        abstract: true,
        templateUrl: '/templates/common/main.html',
        resolve: {
            currentUser: function($rootScope) {
                return $rootScope.currentUserDefer.promise;
            },
            translateReady: ['$translate', function($translate) {
                return $translate.onReady();
            }]
        }
    }).state('anonymous', {
        url: '/anonymous?:go?',
        template: '',
        title: '',
        resolve: {
            currentUser: function ($rootScope) {
                return $rootScope.currentUserDefer.promise;
            }
        },
        controller: function(currentUser, $state, authService, $stateParams, $location, $window) {
            if (currentUser) {
                if (!$stateParams.go) {
                    currentUser.data.contracts ? $state.go('main.contracts.list') : $state.go('main.createcontract.types');
                } else {
                    $location.url(decodeURIComponent($stateParams.go));
                }
            }
        }

    }).state('reset', {
        url: '/reset/:uid/:token/',
        template: '',
        title: ' ',
        controller: function($stateParams) {
            window.location.href = '/auth/reset-password/' + $stateParams.uid + '/' + $stateParams.token;
        }
    }).state('exit', {
        url: '/logout',
        template: '',
        controller: function(authService) {
            authService.logout().then(function() {
                window.location.href = '/auth/';
            });
        }
    }).state('first_entry', {
        url: '/first_entry',
        resolve: {
            currentUser: function($rootScope) {
                return $rootScope.currentUserDefer.promise;
            }
        },
        controller: function(currentUser, $state, contractService, CONTRACT_TYPES_NAMES_CONSTANTS) {
            var localStorage = window.localStorage || {};
            if (localStorage.draftContract) {
                var data = JSON.parse(localStorage.draftContract);
                $state.go('main.createcontract.form', {
                    selectedType: CONTRACT_TYPES_NAMES_CONSTANTS[data.contract_type], network: data.network
                });
            } else {
                $state.go('main.base');
            }
        },
        title: 'start'

    }).state('main.base', {
        url: '/',
        controller: function(currentUser, $state) {
            currentUser.data.contracts ? $state.go('main.contracts.list') : $state.go('main.createcontract.types');
        },
        title: 'start'
    }).state('main.profile', {
        url: '/profile',
        controller: 'profileController',
        templateUrl: templatesPath + 'profile.html',
        title: 'Profile',
        resolve: {
        }
    }).state('main.settings', {
        url: '/settings',
        controller: 'settingsController',
        templateUrl: templatesPath + 'settings.html',
        title: 'Settings',
        resolve: {
        }
    }).state('main.messages', {
        url: '/messages',
        controller: 'messagesController',
        templateUrl: templatesPath + 'messages.html',
        resolve: {
        }
    }).state('main.extdevs', {
        url: '/ext-devs',
        controller: 'extDevsController',
        templateUrl: templatesPath + 'ext-devs.html'
    }).state('main.contacts', {
        url: '/contacts',
        controller: 'contactsController',
        templateUrl: templatesPath + 'contacts.html'
    }).state('main.faq', {
        url: '/faq',
        controller: 'faqController',
        templateUrl: templatesPath + 'faq.html',
        resolve: {
        }
    }).state('main.buytokens', {
        url: '/buy',
        controller: 'buytokensController',
        templateUrl: templatesPath + 'buytokens.html',
        data: {
            notAccess: 'is_ghost'
        },
        resolve: {
            currentUser: function(usersService, $rootScope) {
                return $rootScope.currentUserDefer.promise;
            },
            exRate: function(contractService) {
                return contractService.getCurrencyRate({fsym: 'WISH', tsyms: 'ETH,BTC'});
            }
        }
    }).state('main.contracts', {
        abstract: true,
        template: '<div ui-view></div>',
        controller: 'baseContractsController'
    }).state('main.contracts.list', {
        url: '/contracts',
        controller: 'contractsController',
        templateUrl: templatesPath + 'contracts.html',
        resolve: {
            contractsList: function(contractService, $rootScope, currentUser) {
                return !$rootScope.currentUser.is_ghost ? contractService.getContractsList({
                    limit: 8
                }) : [];
            }
        }
    }).state('main.contracts.preview', {
        abstract: true,
        controller: 'contractsPreviewController',
        templateUrl: templatesPath + 'contracts/preview.html',
        title: 'Contract preview',
        parent: 'main.contracts'
    }).state('main.contracts.preview.byId', {
        controllerProvider: function(openedContract, CONTRACT_TYPES_NAMES_CONSTANTS) {
            var contractTpl = CONTRACT_TYPES_NAMES_CONSTANTS[openedContract.data.contract_type];
            return contractTpl + 'PreviewController';
        },
        templateProvider: function ($templateCache, openedContract, CONTRACT_TYPES_NAMES_CONSTANTS) {
            var contractTpl = CONTRACT_TYPES_NAMES_CONSTANTS[openedContract.data.contract_type];
            return $templateCache.get(templatesPath + 'contracts/preview/' + contractTpl + '.html');
        },
        url: '/contracts/:id',
        resolve: {
            openedContract: function(contractService, $stateParams) {
                if (!$stateParams.id) return false;
                return contractService.getContract($stateParams.id);
            }
        },
        data: {
            top: 'main.contracts.list'
        }
    }).state('main.contracts.preview.public', {
        controllerProvider: function(openedContract, CONTRACT_TYPES_NAMES_CONSTANTS) {
            var contractTpl = CONTRACT_TYPES_NAMES_CONSTANTS[openedContract.data.contract_type];
            return contractTpl + 'PreviewController';
        },
        templateProvider: function ($templateCache, openedContract, CONTRACT_TYPES_NAMES_CONSTANTS) {
            var contractTpl = CONTRACT_TYPES_NAMES_CONSTANTS[openedContract.data.contract_type];
            return $templateCache.get(templatesPath + 'contracts/preview/' + contractTpl + '.html');
        },
        url: '/contracts/public/:key',
        resolve: {
            openedContract: function(contractService, $stateParams) {
                if (!$stateParams.key) return false;
                return contractService.getContractForLink($stateParams.key);
            }
        },
        data: {
            top: 'main.contracts.list'
        }
    }).state('main.createcontract', {
        abstract: true,
        templateUrl: templatesPath + 'createcontract.html',
        controller: function($scope, $rootScope, $window, $q, authService) {

            $scope.checkUserIsGhost = function() {
                if ($rootScope.currentUser.is_ghost) {

                    var defer = $q.defer();

                    /* Open authorisation window */
                    $rootScope.commonOpenedPopup = 'login';
                    $rootScope.commonOpenedPopupParams = {
                        'class': 'login-form',
                        'page': 'registration',
                        'onClose': function() {
                            destroyFocusEvent();
                            $rootScope.closeCommonPopup();
                        },
                        'onLogin': {
                            callback: defer.resolve
                        }
                    };

                    /* Destroy watchers */
                    var destroyFocusEvent = function() {
                        angular.element($window).off('focus', checkWindowFocus);
                    };

                    /* Check profile for window focus */
                    var checkWindowFocus = function() {
                        $rootScope.checkProfile(false, {
                            callback: defer.resolve
                        });
                    };

                    angular.element($window).on('focus', checkWindowFocus);
                    $scope.$on('$destroy', destroyFocusEvent);
                    return defer.promise;
                }
                return false;
            };
        }
    }).state('main.createcontract.types', {
        url: '/create',
        resolve: {
            allCosts: function(contractService) {
                return contractService.getAllCosts();
            }
        },
        controller: function($scope, allCosts) {
            $scope.blockChainNetwork = {
                type: 'ethereum'
            };
            for (var key in allCosts.data) {
                allCosts.data[key] = new BigNumber(allCosts.data[key]).round(3).toString(10);
            }
            $scope.allCosts = allCosts.data;
        },
        templateUrl: templatesPath + 'createcontract/contract-types.html'

    }).state('main.createcontract.form', {
        url: '/create/:selectedType?:options?:network?',
        params: {
            network: '1'
        },
        controllerProvider: function($stateParams) {
            return $stateParams.selectedType + 'CreateController';
        },
        templateProvider: function ($templateCache, $stateParams) {
            return $templateCache.get(templatesPath + 'createcontract/' + $stateParams.selectedType + '.html');
        },
        resolve: {
            currencyRate: function(contractService, $stateParams) {
                var curencyValue;
                switch($stateParams.network) {
                    case 5:
                    case '5':
                    case 6:
                    case '6':
                        curencyValue = 'NEO';
                        break;
                    default:
                        curencyValue = 'ETH';
                        break;
                }
                return contractService.getCurrencyRate({fsym: curencyValue, tsyms: 'USD'});
            },
            openedContract: function() {
                return false;
            },
            tokensList: function($stateParams, contractService) {
                if ($stateParams.selectedType === 'crowdSale') {
                    return contractService.getTokenContracts($stateParams.network || 1);
                }
                return undefined;
            }
        },
        parent: 'main.createcontract'
    }).state('main.createcontract.edit', {
        url: '/contracts/edit/:id',
        controllerProvider: function(openedContract, CONTRACT_TYPES_NAMES_CONSTANTS) {
            openedContract.data.contract_details.eth_contract = undefined;
            var contractType = CONTRACT_TYPES_NAMES_CONSTANTS[openedContract.data.contract_type];
            return contractType + 'CreateController';
        },
        templateProvider: function ($templateCache, openedContract, CONTRACT_TYPES_NAMES_CONSTANTS) {
            var contractType = CONTRACT_TYPES_NAMES_CONSTANTS[openedContract.data.contract_type];
            return $templateCache.get(templatesPath + 'createcontract/' + contractType + '.html');
        },
        resolve: {
            openedContract: function(contractService, $stateParams) {
                if (!$stateParams.id) return false;
                return contractService.getContract($stateParams.id);
            },
            currencyRate: function(contractService, openedContract, CONTRACT_TYPES_NAMES_CONSTANTS) {
                if (CONTRACT_TYPES_NAMES_CONSTANTS[openedContract.data.contract_type] === 'crowdSale') {
                    return contractService.getCurrencyRate({fsym: 'ETH', tsyms: 'USD'});
                }
                return undefined;
            },
            tokensList: function($stateParams, contractService, CONTRACT_TYPES_NAMES_CONSTANTS, openedContract) {
                if (CONTRACT_TYPES_NAMES_CONSTANTS[openedContract.data.contract_type] === 'crowdSale') {
                    return contractService.getTokenContracts(openedContract.data.network || 1);
                }
                return undefined;
            }
        },
        onEnter: function(openedContract, CONTRACT_STATUSES_CONSTANTS, $state) {
            if (CONTRACT_STATUSES_CONSTANTS[openedContract.data.state]['value'] > 1) {
                $state.go('main.contracts.preview.byId', {id: openedContract.data.id});
                return;
            }
        },
        data: {
            top: 'main.contracts.list'
        }
    });



    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
    $urlRouterProvider.otherwise('/');

});
