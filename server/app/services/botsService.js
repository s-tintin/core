
/*
 Copyright [2016] [Relevance Lab]

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

var logger = require('_pr/logger')(module);
var bots = require('_pr/model/bots/bots.js');
var async = require("async");
var apiUtil = require('_pr/lib/utils/apiUtil.js');
var taskService =  require('_pr/services/taskService.js');
var auditTrailService =  require('_pr/services/auditTrailService.js');
var blueprintService =  require('_pr/services/blueprintService.js');

const errorType = 'botsService';

var botsService = module.exports = {};

botsService.createOrUpdateBots = function createOrUpdateBots(botsDetail,linkedCategory,linkedSubCategory,callback) {
    logger.debug("In createOrUpdateBots....");
    var botsObj = {
        botId: botsDetail._id,
        botName:botsDetail.name,
        botType: botsDetail.botType,
        botCategory: botsDetail.botCategory,
        botDesc: botsDetail.shortDesc,
        masterDetails:{
            orgId: botsDetail.orgId,
            orgName: botsDetail.orgName,
            bgId: botsDetail.bgId,
            bgName: botsDetail.bgName,
            projectId: botsDetail.projectId,
            projectName: botsDetail.projectName,
            envId: botsDetail.envId ? botsDetail.envId : null,
            envName: botsDetail.envName?botsDetail.envName: null
        },
        botLinkedCategory: linkedCategory,
        botLinkedSubCategory:linkedSubCategory,
        manualExecutionTime:botsDetail.manualExecutionTime,
        createdOn: new Date().getTime()
    };
    bots.getBotsById(botsDetail._id,function(err,data){
        if(err){
            callback(err,null);
            return;
        }else if(data.length === 0){
            bots.createNew(botsObj, function (err, saveBotsData) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, saveBotsData);
                return;
            })
        }else{
            botsObj.isDeleted = false;
            bots.updateBotsDetail(botsObj.botId,botsObj,function(err,updateBotsData){
                if(err){
                    logger.error(err);
                    callback(err,null);
                    return;
                }
                auditTrailService.updateSoftRemoveAuditTrailById(botsObj.botId,function(err,data){
                    if(err){
                        logger.error("Error in updating soft audit Trails");
                    }
                })
                callback(null,updateBotsData);
                return;
            });
        }
    });
}

botsService.updateBotsScheduler = function updateBotsScheduler(botId,botObj,callback) {
    if(botObj.botScheduler  && botObj.botScheduler !== null && Object.keys(botObj.botScheduler).length !== 0) {
        botObj.botScheduler = apiUtil.createCronJobPattern(botObj.botScheduler);
    }
    bots.updateBotsDetail(botId,botObj,function(err,data){
        if(err){
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null,data);
        return;
    });
}

botsService.getBotsList = function getBotsList(botsQuery,callback) {
    var reqData = {};
    async.waterfall([
        function(next) {
            apiUtil.paginationRequest(botsQuery, 'bots', next);
        },
        function(paginationReq, next) {
            paginationReq['searchColumns'] = ['botName', 'botType', 'botCategory', 'botLinkedCategory','botLinkedSubCategory', 'masterDetails.orgName', 'masterDetails.bgName', 'masterDetails.projectName', 'masterDetails.envName'];
            reqData = paginationReq;
            apiUtil.databaseUtil(paginationReq, next);
        },
        function(queryObj, next) {
            bots.getBotsList(queryObj, next);
        },
        function(auditTrailList, next) {
            apiUtil.paginationResponse(auditTrailList, reqData, next);
        }
    ],function(err, results) {
        if (err){
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null,results)
        return;
    });
}

botsService.removeSoftBotsById = function removeSoftBotsById(botId,callback){
    async.waterfall([
        function(next){
            bots.getBotsById(botId,next);
        },
        function(bots,next){
            if(bots.length > 0){
                async.parallel({
                    bots:function(callback){
                        if(bots[0].botLinkedCategory === 'Task'){
                            taskService.deleteServiceDeliveryTask(botId, callback);
                        }else{
                            blueprintService.deleteServiceDeliveryBlueprint(botId,callback)
                        }
                    },
                    services: function(callback){
                        bots.removeSoftBotsById(botId,callback);
                    }
                },function(err,results){
                    if(err){
                        next(err,null);
                    }else{
                        next(null,results);
                    }
                })
            }else{
                next({errCode:400, errMsg:"Bots is not exist in DB"})
            }
        }
    ],function(err,results){
        if(err){
            logger.error(err);
            callback(err,null);
            return;
        }else{
            callback(null,results);
            return;
        }
    });
}
botsService.removeBotsById = function removeBotsById(botId,callback){
    bots.removeBotsById(botId,function(err,data){
        if(err){
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null,data);
        return;
    });
}

botsService.getBotsHistory = function getBotsHistory(botId,callback){
    auditTrailService.getBotsAuditTrailHistory(botId,function(err,data){
        if(err){
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null,data);
        return;
    });
}


