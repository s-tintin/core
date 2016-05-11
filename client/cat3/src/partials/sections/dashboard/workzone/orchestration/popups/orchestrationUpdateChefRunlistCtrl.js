/* Copyright (C) Relevance Lab Private Limited- All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Relevance UI Team,
 * Aug 2015
 */

(function (angular) {
	"use strict";
	angular.module('workzone.orchestration').
	controller('orchestrationUpdateChefRunlistCtrl', ['$scope', '$q', '$modalInstance',
	'responseFormatter', 'cookbookRunlistAttr','chefSelectorComponent', '$timeout', '$http', 'workzoneServices',
	function ($scope, $q, $modalInstance, responseFormatter, cookbookRunlistAttr, chefSelectorComponent, $timeout, $http, workzoneServices) {
		/*Open only One Accordian-Group at a time*/
		$scope.oneAtATime = true;
		/*Initialising First Accordian-group open on load*/
		$scope.isFirstOpen = true;
		$scope.isOrchestrationUpdateChefRunLoading = true;
		var totalElements, selectedElements, factory, compositeSelector;
		$scope.allCBAttributes = [];
		$scope.editRunListAttributes = [];
		//promise contain list of cookbooks and roles list
        var c = workzoneServices.getCookBookListForOrg();
        //promise contains template list
        var t = workzoneServices.getSoftwareTemplatesForOrg();
        //promise contains selected runlist for edit.
        var s = cookbookRunlistAttr.chefrunlist;
        //promise contains edited cookbook attributes list
        var a = cookbookRunlistAttr.attributes;
        var e = $scope.editRunListAttributes;
        //var allPromise = $q.all([c, t, s, a, e]);
        $q.all([c, t, s, a, e]).then(function(allPromise) {
			$scope.chefServerID = allPromise[0].data.serverId;
			var list = responseFormatter.formatDataForChefClientRun(allPromise[0].data);
			var template = responseFormatter.formatTemplateDataForChefClient(allPromise[1].data);
			totalElements = responseFormatter.merge(list, template);
			selectedElements = allPromise[2];
			factory = chefSelectorComponent.getComponent;
			$scope.allCBAttributes = allPromise[3];
			$scope.editRunListAttributes = allPromise[4];
			$scope.isOrchestrationUpdateChefRunLoading = false;
			$scope.init();
        });

		function registerUpdateEvent(obj) {
			obj.addListUpdateListener('updateList', $scope.updateAttributeList);
		}

		$scope.init = function() {
			$timeout(function () {
				//DOM has finished rendering after that initializing the component
				compositeSelector = new factory({
					scopeElement: '#chefClientForOrchestration',
					optionList: totalElements,
					selectorList: selectedElements,
					isSortList: true,
					isSearchBoxEnable: true,
					isPriorityEnable: true,
					isExcludeDataFromOption: true,
					isOverrideHtmlTemplate: false,
					idList: {
						selectorList: '#selector',
						optionSelector: '#option',
						upBtn: '#btnRunlistItemUp',
						downBtn: '#btnRunlistItemDown',
						addToSelector: '#btnaddToRunlist',
						removeFromSelector: '#btnremoveFromRunlist',
						searchBox: '#searchBox'
					}
				});
				registerUpdateEvent(compositeSelector);
			}, 10);
			if (selectedElements && selectedElements.length > 0 && $scope.editRunListAttributes) {
				$scope.updateAttributeList(selectedElements, selectedElements, 'add');
			}
		};

		angular.extend($scope, {
			cancel: function () {
				$modalInstance.dismiss('cancel');
			},
			changeSelection: function (className) {
				//compositeSelector.
				if (className === "all") {
					compositeSelector.resetFilters();
				} else {
					compositeSelector.applyFilterThroughClass(className);
				}
			},
			updateAttributeList: function () {
				var nodesList = arguments[0];
				var updatedList = arguments[1];
				var operationType = arguments[2];
				if (operationType === 'add') {
					var data = [];
					for (var i = 0; i < nodesList.length; i++) {
						data.push(nodesList[i].value);
					}
					workzoneServices.getcookBookAttributes(data, $scope.chefServerID).then(function (response) {
						var data;
						if (response.data) {
							data = response.data;
						} else {
							data = response;
						}
						/*Scope apply done to force refresh screen after receiving the AJAX response*/
						$scope.$apply(function () {
							if ($scope.editRunListAttributes) {
								for (var j = 0; j < data.length; j++) {
                                    for(var attrItem in data[j].attributes){
                                        if ($scope.allCBAttributes  && $scope.allCBAttributes[attrItem]) {
                                            data[j].attributes[attrItem].default = $scope.allCBAttributes[attrItem];
                                        }
                                    }
                                }
								$scope.allCBAttributes = data;
								$scope.editRunListAttributes = false;
							} else {
								$scope.allCBAttributes = $scope.allCBAttributes.concat(data);
							}

							if (updatedList.length > 1) {
								var tmp = [];
								for (var i = 0; i < updatedList.length; i++) {
									for (var k = 0; k < $scope.allCBAttributes.length; k++) {
										if (updatedList[i].value === $scope.allCBAttributes[k].cookbookName) {
											tmp.push($scope.allCBAttributes[k]);
											break;
										}
									}
								}
								$scope.allCBAttributes = tmp;
							}
						});
					});
				} else if(operationType ==='up' || operationType ==='down'){
					$scope.$apply(function() {
						var tmp = [];
						//reorder attribute list as per chaged runlist order.
						for (var i = 0; i < updatedList.length; i++) {
							for (var k = 0; k < $scope.allCBAttributes.length; k++) {
								if (updatedList[i].value === $scope.allCBAttributes[k].cookbookName) {
									tmp.push($scope.allCBAttributes[k]);
									break;
								}
							}
						}
						$scope.allCBAttributes = tmp;
					});
				} else {
					for (var j = 0; j < nodesList.length; j++) {
						var nodeVal = nodesList[j].value;
						for (var k = 0; k < $scope.allCBAttributes.length; k++) {
							if (nodeVal === $scope.allCBAttributes[k].cookbookName) {
								$scope.allCBAttributes.splice(k, 1);
								break;
							}
						}
					}
				}
			},
			ok: function () {
				var selectedCookBooks = compositeSelector.getSelectorList();
				$modalInstance.close({list: selectedCookBooks, cbAttributes: $scope.allCBAttributes});
			}
		});
	}]);
})(angular);