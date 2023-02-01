//Global functions
var _wcs_mode = "prod"
_wcs_mode = window.location.host.includes("localhost") || window.location.host.includes("test") ? "dev" : "prod"

_wcs_mode = "prod"
var _wcs_instance = 'B0'; //B0, P2, ADAPTACE

var wcsIsInitMode = true;
var wcsIsInitModeReq = true;
var wcsIsInitModeRes = true;
var wcsInitMessageToWA, wcsInitCodeToWA;
var wcsIsServerErr = false;
var wcsConsole = {};
wcsConsole.log = function (msg) {
  if (_wcs_mode == "dev") {
    console.log(msg);
  } else {
    console.log(msg);
  }
};
wcsConsole.error = function (msg) {
  if (_wcs_mode == "dev") {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    console.log("")
    console.log(msg);
    console.log("")
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

  } else {
    console.log(msg);
  }
};



// The Common module is designed as an auxiliary module
// to hold functions that are used in multiple other modules
/* eslint no-unused-vars: "off" */

var Common = (function () {
  // Publicly accessible methods defined
  return {
    buildDomElement: buildDomElementFromJson,
    fireEvent: fireEvent,
    listForEach: listForEach,
    buildDomElementForButton: buildDomElementForButtonFromJson,
    getInstance: getInstance
  };

  // Take in JSON object and build a DOM element out of it
  // (Limited in scope, cannot necessarily create arbitrary DOM elements)
  // JSON Example:
  //  {
  //    "tagName": "div",
  //    "text": "Hello World!",
  //    "className": ["aClass", "bClass"],
  //    "attributes": [{
  //      "name": "onclick",
  //      "value": "alert("Hi there!")"
  //    }],
  //    "children: [{other similarly structured JSON objects...}, {...}]
  //  }

  function getInstance() {
    var custID = 'eyJpbnRlbnRzIjpbeEX24z034*yJpbnRlbnQiOiJDQ0hBVF9PVEhFUl9TVEFSVCIsImNvbmZ';
    var instance, custID

    instance = _wcs_instance;

    if (_wcs_mode == 'prod') {
      if (window.location.host.includes("brno")) {
        instance = "B0"
        custID += "_B0";

      } else if (window.location.host.includes("praha2")) {
        instance = "P2"
        custID += "_P2";

      } else if (window.location.host.includes("adaptace")) {
        instance = "ADAPTACE"
        custID += "_ADAPTACE";
      } else {
        instance = "B0"
        custID += "_B0";
      }
    } else {

      if (_wcs_instance == "B0") {
        custID += "_B0";

      } else if (_wcs_instance == "P2") {
        custID += "_P2";

      } else if (_wcs_instance = "ADAPTACE") {
        custID += "_ADAPTACE";
      }


    }

    return {
      "instance": instance,
      "custID": custID
    }
  }

  function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  function buildFeedbackButton(currentText, payload) {
    var element = document.createElement('button');
    var id = makeid()
    element.setAttribute("id", id);
    element.innerHTML = '<span class="glyphicon glyphicon-pencil"></span>';

    var classNames = ["btn", "btn-primary", "feedbackButton"]
    for (var i = 0; i < classNames.length; i++) {
      element.classList.add(classNames[i]);
    }
    element.onclick = function () { // Note this is a function

      ConversationPanel.feedbackButtonKeyDown({ textToFeedback: currentText, payload: payload, id: id });
    };
    wcsConsole.log("Adding button to allow feedback: " + currentText);



    return element;
  }


  function buildDomElementFromJson(domJson, isReviewMode, currentText, payload) {

    if (!isReviewMode) {
      // Create a DOM element with the given tag name
      var element = document.createElement(domJson.tagName);

      // Fill the "content" of the element
      if (domJson.text) {
        element.innerHTML = domJson.text;
      } else if (domJson.html) {
        element.insertAdjacentHTML('beforeend', domJson.html);
      }

      // Add classes to the element
      if (domJson.classNames) {
        for (var i = 0; i < domJson.classNames.length; i++) {
          element.classList.add(domJson.classNames[i]);
        }
      }
      // Add attributes to the element
      if (domJson.attributes) {
        for (var j = 0; j < domJson.attributes.length; j++) {
          var currentAttribute = domJson.attributes[j];
          element.setAttribute(currentAttribute.name, currentAttribute.value);
        }
      }
      // Add children elements to the element
      if (domJson.children) {
        for (var k = 0; k < domJson.children.length; k++) {
          var currentChild = domJson.children[k];
          element.appendChild(buildDomElementFromJson(currentChild, false));
        }
      }
      return element;
    } else {
      //review Mode
      wcsConsole.log("-----------------domJson")

      wcsConsole.log(JSON.stringify(domJson))

      // Create a DOM element with the given tag name
      var element = document.createElement(domJson.tagName);

      // Fill the "content" of the element
      if (domJson.text) {
        element.innerHTML = domJson.text;
      } else if (domJson.html) {
        element.insertAdjacentHTML('beforeend', domJson.html);
      }

      // Add classes to the element
      if (domJson.classNames) {
        for (var i = 0; i < domJson.classNames.length; i++) {
          wcsConsole.log("Adding class: " + domJson.classNames[i])
          if (isReviewMode && domJson.classNames[i] == 'top') {
            //misto cervene svisle cary -> f.button
            wcsConsole.log("Review mode: REplacing last answer red indicator with F.button")
            element.appendChild(buildFeedbackButton(currentText, payload));
          } else {
            element.classList.add(domJson.classNames[i]);
          }
        }
      }

      // Add attributes to the element
      if (domJson.attributes) {
        for (var j = 0; j < domJson.attributes.length; j++) {
          var currentAttribute = domJson.attributes[j];
          element.setAttribute(currentAttribute.name, currentAttribute.value);
        }
      }
      // Add children elements to the element
      if (domJson.children) {
        for (var k = 0; k < domJson.children.length; k++) {
          var currentChild = domJson.children[k];
          element.appendChild(buildDomElementFromJson(currentChild, isReviewMode, currentText, payload));
        }
      }


      return element;

    }
  }

  /*

  Varianta pro button
  */

  function buildDomElementForButtonFromJson(domJson, currentText) {
    // Create a DOM element with the given tag name
    var element = document.createElement(domJson.tagName);

    // Fill the "content" of the element
    if (domJson.text) {
      element.innerHTML = domJson.text;
    } else if (domJson.html) {
      element.insertAdjacentHTML('beforeend', domJson.html);
    }

    // Add classes to the element
    if (domJson.classNames) {
      for (var i = 0; i < domJson.classNames.length; i++) {
        element.classList.add(domJson.classNames[i]);
      }
    }
    // Add attributes to the element
    if (domJson.attributes) {
      for (var j = 0; j < domJson.attributes.length; j++) {
        var currentAttribute = domJson.attributes[j];
        element.setAttribute(currentAttribute.name, currentAttribute.value);
      }
    }
    // Add children elements to the element
    if (domJson.children) {
      for (var k = 0; k < domJson.children.length; k++) {
        var currentChild = domJson.children[k];
        element.appendChild(buildDomElementFromJson(currentChild));
      }
    }

    element.onclick = function () { // Note this is a function

      ConversationPanel.buttonKeyDown(currentText);
    };


    return element;
  }

  // Trigger an event to fire
  function fireEvent(element, event) {
    var evt;
    if (document.createEventObject) {
      // dispatch for IE
      evt = document.createEventObject();
      return element.fireEvent('on' + event, evt);
    }
    // otherwise, dispatch for Firefox, Chrome + others
    evt = document.createEvent('HTMLEvents');
    evt.initEvent(event, true, true); // event type,bubbling,cancelable
    return !element.dispatchEvent(evt);
  }

  // A function that runs a for each loop on a List, running the callback function for each one
  function listForEach(list, callback) {
    for (var i = 0; i < list.length; i++) {
      callback.call(null, list[i]);
    }
  }
}());
