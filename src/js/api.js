// The Api module is designed to handle all interactions with the server

var Api = (function () {
  var requestPayload;
  var responsePayload;
  var intentExamplesCache = {};
  var mode = _wcs_mode; //dev,prod
  var instance = _wcs_instance;
  var cacheStorage = Storages.localStorage
  var cacheStorageVersion = "";
  var wsVersion = "";



  // Publicly accessible methods defined
  return {
    sendRequest: sendRequest,

    getAllIntents: getAllIntents,

    getRequestPayload: function () {
      return requestPayload;
    },
    setRequestPayload: function (newPayload) {
      requestPayload = newPayload;
    },
    getResponsePayload: function () {
      return responsePayload;
    },
    setResponsePayload: function (newPayload) {

      responsePayload = newPayload;
    },


    getIntentDescriptionForName: getIntentDescriptionForName,




    getExamplesForUnrecognizedInputFromCache: function (inputText) {
      var intentTextExamples = [];
      var selectedCache = {};
      wcsConsole.log("Searching intentExamplesCache for examples matching: " + inputText);
      for (var name in intentExamplesCache) {
        var b2 = intentExamplesCache[name].filter(function (obj) {
          if (obj.includes(inputText)) {
            return true;
          }
          return false
        });
        if (!!b2 && b2.length > 0) {
          selectedCache[name] = b2;
        }
      }
      return selectedCache;
    }

  };

  // Send a message request to the server
  function sendRequest(text, context) {
    /*
      zasadni je /web/ nesmi byt  actions jinak problem s CORS
    */

    /* - nema cenu delat:
        headers: {
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        "Access-Control-Allow-Credentials": "true",
        'Access-Control-Allow-Methods':'GET, POST, OPTIONS, PUT, PATCH, DELETE',
        'Access-Control-Allow-Headers': 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers'
      },
      */
    var isInitialReq = false;
    var messageEndpoint

    var instanceObj = Common.getInstance()

    wcsConsole.log("Running instance " + instanceObj.instance)
    
   // mode = 'dev'

    if (mode == 'dev') {
      wcsConsole.log("Running in development mode ")
      messageEndpoint = 'http://localhost:7071/api/chatbot-actions'


    } else {
      wcsConsole.log("Running in production mode ")
      messageEndpoint = 'https://brno-chatbot-actions.apps-unitx-cloud.com/api/chatbot-actions'


    }

    if (text == 'init_init_init') {
      isInitialReq = true;
      text = '';
    }

    var payloadToWatson = {};
    if (text) {
      payloadToWatson.text = text

    }
    if (context) {
      payloadToWatson.context = context;
    }

    payloadToWatson.custID = instanceObj.custID;

    var params = JSON.stringify(payloadToWatson);
    // Stored in variable (publicly visible through Api.getRequestPayload)
    // to be used throughout the application
    if (Object.getOwnPropertyNames(payloadToWatson).length !== 0) {
      Api.setRequestPayload(params);
    }


    $.ajax({
      type: "POST",
      url: messageEndpoint,
      data: JSON.stringify(payloadToWatson),
      dataType: "json",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "accept": "application/json",
        "content-type": "application/json"
      }
    })
      .done(function (res) {
        if (res.intents && res.intents.length > 0) {
          
            if (isInitialReq) {
              //getting context of new WA session and sending again real question from wcsInitMessageToWA
              
              if (!!res.context) {
                wcsIsInitMode = false;
                Api.sendRequest(wcsInitMessageToWA, res.context)
              } else {
                wcsIsServerErr = true;
              }
            } else {
              Api.setResponsePayload(res);
              return
            }
          } else {
            wcsConsole.error("ERROR: with action ...No body !!! ");
            wcsIsServerErr = true;
          }
        

        if (wcsIsServerErr) {
          //Final handling of all server errors
          wcsConsole.error("Undefined ERROR: with action !!! " + JSON.stringify(res));

        }

      });


  }

  // Get intents for disambiguation handling on client
  function getAllIntents() {
    /*
      zasadni je /web/ nesmi byt  actions jinak problem s CORS
    */

    /* - nema cenu delat:
        headers: {
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        "Access-Control-Allow-Credentials": "true",
        'Access-Control-Allow-Methods':'GET, POST, OPTIONS, PUT, PATCH, DELETE',
        'Access-Control-Allow-Headers': 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers'
      },
      */

    var instanceObj = Common.getInstance()

    wcsConsole.log("Running instance " + instanceObj.instance)

    var isInitialReq = false;
    var messageEndpoint

    //mode = 'dev'


    wcsConsole.log("Calling get all intents on start in mode: " + mode)
    if (mode == 'dev') {
      messageEndpoint = 'http://localhost:7071/api/intent-actions'

    } else {
      messageEndpoint = 'https://brno-chatbot-actions.apps-unitx-cloud.com/api/intent-actions'


    }



    var payloadToWatson = {};


    payloadToWatson.custID = instanceObj.custID;

    var params = JSON.stringify(payloadToWatson);


    $.ajax({
      type: "POST",
      url: messageEndpoint,
      data: JSON.stringify(payloadToWatson),
      dataType: "json",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "accept": "application/json",
        "content-type": "application/json"
      }
    })
      .done(function (res) {
        console.log(JSON.stringify(res))
        if (res.total_rows > 0) {
        
          if (res.rows) {

            intentsListForDisambig = res.rows;
            if (intentsListForDisambig.length > 0) {
              wcsConsole.log("Intents fetched from Cloudant, number of recs.: " + intentsListForDisambig.length);

            } else {
              wcsConsole.log("Intents NOT fetched from Cloudant");
            }


          } else {
            wcsConsole.log("ERROR: with action ...No rows array/object !!! ");
            wcsIsServerErr = true;
          }
        } else {
          wcsConsole.log("ERROR: with action ...no rows returned");
          wcsIsServerErr = true;
        }

        return;

      });


  }



  function getIntentDescriptionForName(name) {
    var tempAR = intentsListForDisambig.filter(function (item) {
      if (item.doc.intent == name) {
        return true;
      }
      return false;
    });

    if (tempAR.length == 1) {
      return tempAR[0]
    } else {
      wcsConsole.log("ERR in getIntentDescriptionForName logic: should return exact one result")
      return null
    }



  }


}());
