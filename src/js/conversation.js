



// The ConversationPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true*/

var ConversationPanel = (function () {
  var settings = {
    selectors: {
      chatBox: '#scrollingChat',
      fromUser: '.from-user',
      fromWatson: '.from-watson',
      latest: '.latest',
      wcsButton: '.wcsButton'
    },
    authorTypes: {
      user: 'user',
      watson: 'watson'
    },
    magicWord: "sez", //"Sezame testuj", 
    testIntroMsg: "Kouzelné slovo zadáno: zahajuji testovací režim",
    disambigText: "Bohužel si nejsem jistý, zda dobře rozumím. Vyberte prosím jednu z možností co jsem našel, nebo se zkuste zeptat jiným způsobem."
  };

  var dialogCodes = {

    welcomeP2: {
      text: "Dobrý den, jsem e-bot Arian a rád zodpovím Vaše otázky týkající se agend ÚMČ Praha 2.",
      inputFieldPlaceholder: "Napište prosím svůj dotaz"
    },
    welcomeB0: {
      text: "Dobrý den, jsem chatbot Radim a rád zodpovím Vaše otázky týkající se městské části Brno-střed.",
      inputFieldPlaceholder: "Napište prosím svůj dotaz"
    },
    welcomeADAPTACE: {
      text: "Ahoj, jsem e-bot Arian, tvůj elektronický pomocník. Napiš mi, co tě zajímá a já se ti pokusím odpovědět. Vím například, jaká je pracovní doba nebo kde najdeš tiskárnu.",
      inputFieldPlaceholder: "Napište prosím svůj dotaz"
    },
    unknown_error: {
      text: "Bohužel došlo k nepředpokládané chybě. Moji lidští kolegové ale již celou situaci řeší. Vydržte....",
      inputFieldPlaceholder: "Napište prosím svůj dotaz"
    }


  }

  var inputPlaceholder = "Napište otázku...";
  var activeInputPlaceholder = "Napište otázku...";
  var isReviewMode = false;
  var shouldDisplayTestIntroMsg = false;

  // Publicly accessible methods defined
  return {
    init: init,
    inputKeyDown: inputKeyDown,
    buttonKeyDown: buttonKeyDown,
    feedbackButtonKeyDown: feedbackButtonKeyDown
  };

  // Initialize the module
  function init() {

    chatUpdateSetup();
    setupLocalWelcome()
    setupInputBox();

    //DEV displayMessageWithButtons({output: {text: ["Bohužel se nepodařilo najít jednoznačnou odpověď na Vaší otázku. Zkuste prosím použít jedno z tlačítek níže."]}},["test1","test2"], settings.authorTypes.watson);

    //DEV
    Api.getAllIntents();

  }

  function mapDisambiguationRequestFromWA(msg) {
    var response = null;
    var intentsToLookup = [];

    function compareConfidence(a, b) {
      if (a.confidence < b.confidence)
        return 1;
      if (a.confidence > b.confidence)
        return -1;
      return 0;
    }

    //od 8.10.20, zrejme zmena v api WA, "Nic z výše uvedeného"

    if (!!msg && msg.output && msg.output.text && msg.output.text.length == 0 && msg.output.generic && msg.output.generic[0] && msg.output.generic[0] && msg.output.generic[0].response_type == 'suggestion') {
      if (msg.output.generic[0].suggestions && msg.output.generic[0].suggestions.length > 1) {
        wcsConsole.log("HANDLING suggestion type response for nr. alternatives " + msg.output.generic[0].suggestions.length)
      }
      let toButtonsTemp = msg.output.generic[0].suggestions.filter((item) => {
        if (item.label != "Nic z výše uvedeného") {
          return true
        } else {
          return false
        }
      })

      //vyfiltrovani nejvyssich pravdepodobnosti
      //value.intents[0].confidence
      let toButtonsFinal = []
      let tempF1, tempF2, tempF3, tempF4
      if (toButtonsTemp.length > 1) {
        //sort

        tempF1 = toButtonsTemp.filter((item) => {
          if (item.value.intents[0].confidence > 0.9) {
            return true

          } else {
            return false
          }
        })
        if (tempF1.length > 1) {
          //staci mi to
          toButtonsFinal = tempF1
        } else {
          //musim filtrovat i nizssi pravdepodobnosti
          tempF2 = toButtonsTemp.filter((item) => {
            if (item.value.intents[0].confidence > 0.7 && item.value.intents[0].confidence <= 0.9 ) {
              return true

            } else {
              return false
            }
          })
          if ((tempF1.length + tempF2.length) > 1) {
            //staci mi to
            toButtonsFinal = tempF1.concat(tempF2)
          } else {
            //musim filtrovat i nizssi pravdepodobnosti
            tempF3 = toButtonsTemp.filter((item) => {
              if (item.value.intents[0].confidence > 0.5 && item.value.intents[0].confidence <= 0.7) {
                return true

              } else {
                return false
              }
            })
            if ((tempF1.length + tempF2.length + tempF3.length) > 1) {
              //staci mi to

              toButtonsFinal = tempF1.concat(tempF2).concat(tempF3)
            } else {
              //musim filtrovat i nizssi pravdepodobnosti
              tempF4 = toButtonsTemp.filter((item) => {
                if (item.value.intents[0].confidence > 0.3 && item.value.intents[0].confidence <= 0.5) {
                  return true

                } else {
                  return false
                }
              })
              if ((tempF1.length + tempF2.length + tempF3.length + tempF4.length) > 1) {
                //staci mi to

                toButtonsFinal = tempF1.concat(tempF2).concat(tempF3).concat(tempF4)
              } else {
                //musim filtrovat i nizssi pravdepodobnosti ale uz to je jedno
                toButtonsFinal = toButtonsTemp
              }
            }
          }
        }

      }

      console.log(JSON.stringify(toButtonsFinal))
      //zmena formatu na pouze labels pro API dotaz
      if (toButtonsFinal.length > 0) {
        let intentsToLookup = toButtonsFinal.map((item) => {
          return item.dialog_node
        })

        if (intentsToLookup.length > 1) {
          var response = { output: { buttons: [], codes: [] } };
          for (let intent of intentsToLookup) {
            var option = Api.getIntentDescriptionForName(intent)
            if (!!option.doc) {
              response.output.buttons.push(option.doc.description)
              response.output.codes.push(option.doc.text)
            }
          }
          if (!!response.output.buttons && response.output.buttons.length > 0) {
            response.output.text = settings.disambigText;
            return response;
          } else {
            return null
          }
        } else {
          //Pokud se nepodari vytvorit pole buttons s > 1 prvkem, tak se musi pouzit msg.outpout.text[1], nebo default hlaska
          return null;
        }
      }

    } else if (msg.output.generic && msg.output.generic[0] && msg.output.generic[0] && msg.output.generic[0].response_type == 'text') {

      //Checking for testing message

      if (!!msg && msg.output && msg.output.text && msg.output.text.length > 1) {
        if (msg.output.text[0].startsWith('DISAMBIG')) {
          wcsConsole.log("HANDLING: ...." + msg.output.text[0])

          //Removing
          var textTempAR = msg.output.text.length
          msg.output.text.shift()
          if (textTempAR != (msg.output.text.length + 1)) {
            wcsConsole.error("ERROR on removing disambig text from output")
          }
        }

      }



      //Anyway checking number of intents > 0.2 with P2
      if (!!msg && msg.intents && msg.intents.length > 1) {
        var codeTmpAR = msg.intents.filter(function (item) {
          if ((item.intent.startsWith("P2") || item.intent.startsWith("B0")) && item.confidence > 0.2) {
            return true;
          }
          return false;
        });

        var codeTmp2AR = msg.intents.filter(function (item) {
          if (!item.intent.startsWith("P2") && !item.intent.startsWith("B0") && item.confidence > 0.2) {
            return true;
          }
          return false;
        });

        if (codeTmpAR.length > 1) {
          //sort
          codeTmpAR.sort(compareConfidence);

          if (codeTmpAR[0].confidence > 0.9) {
            intentsToLookup.push(codeTmpAR[0])
            if (codeTmpAR[1].confidence > 0.7) {
              intentsToLookup.push(codeTmpAR[1])
              if (!!codeTmpAR[1] && codeTmpAR[2].confidence > 0.7) {
                intentsToLookup.push(codeTmpAR[2])
              } else {
                //nepridavat
              }

            } else {
              //nepridavat
              //pokud ostatni pod 0.7, tak -> 1 vysledek
            }
          } else if (codeTmpAR[0].confidence <= 0.9 && codeTmpAR[0].confidence > 0.5) {
            //porad nejaka pravdepodobnost
            intentsToLookup.push(codeTmpAR[0])
            if (codeTmpAR[1].confidence > 0.6) {
              intentsToLookup.push(codeTmpAR[1])
              if (!!codeTmpAR[1] && codeTmpAR[2].confidence > 0.5) {
                intentsToLookup.push(codeTmpAR[2])
              } else {
                //nepridavat
              }

            } else {
              //nepridavat
              //pokud ostatni pod 0.7, tak -> 1 vysledek
            }
          } else if (codeTmpAR[0].confidence <= 0.5) {
            //prvni 3 - ale je to asi uplne jedno (jeste pomerim s chitchat topics)
            if (codeTmp2AR.length > 0 && codeTmp2AR[0].confidence > 0.7) {
              if (codeTmp2AR[0].intent == "CONTROL_THANKYOU" && msg.input.text && msg.input.text.length < 15) {
                //vybrat standardni thank you odpoved
                return null
              }
            }

            if (codeTmpAR.length <= 3) {
              intentsToLookup = codeTmpAR;
            } else {
              codeTmpAR.splice(-(codeTmpAR.length - 3), codeTmpAR.length)
              intentsToLookup = codeTmpAR
            }
          }


        } else {
          return null;
        }
      } else {
        return null;
      }
      /*
                      wcsConsole.log(codeTmpAR)
                      var confidenceAR = codeTmpAR.map(function(item){
                          return item.confidence
                      });
                      wcsConsole.log("Std dev: " + math.std(confidenceAR));
                      wcsConsole.log("VAriance: " + math.var(confidenceAR));
                      wcsConsole.log("max: " + confidenceAR[0]);
                      wcsConsole.log("min: " + confidenceAR[confidenceAR.length - 1]);
                      wcsConsole.log("median: " + math.median(confidenceAR));
                      wcsConsole.log("mean: " + math.mean(confidenceAR));
                  } else  {
                      return null;
                  */

      /*
      if (buttonsTemp.length > 0){
                         response.output.buttons = buttonsTemp;
                         response.output.text = msg.output.text;
     */

      //dohledani jmen intentu a sestaveni odpovedi
      if (intentsToLookup.length > 1) {
        var response = { output: { buttons: [], codes: [] } };
        for (intent in intentsToLookup) {
          var option = Api.getIntentDescriptionForName(intentsToLookup[intent].intent)
          if (!!option.doc) {
            response.output.buttons.push(option.doc.description)
            response.output.codes.push(option.doc.text)
          }
        }
        if (!!response.output.buttons && response.output.buttons.length > 0) {
          response.output.text = settings.disambigText;
          return response;
        } else {
          return null
        }
      } else {
        //Pokud se nepodari vytvorit pole buttons s > 1 prvkem, tak se musi pouzit msg.outpout.text[1], nebo default hlaska
        return null;
      }
    }
  }


  function mapButtonsFromWAtoResponse(msg) {

    var response = {
      output: {}
    };

    if (!!msg && msg.output && msg.output.text && msg.output.text.length > 1 && msg.output.text[msg.output.text.length - 1] == 'buttons') {

      wcsConsole.log("Getting buttons output -> converting to buttons following text")

      if (msg.output.text[msg.output.text.length - 2].length > 0) {
        //odstrani posledni buttons control element
        msg.output.text.pop();

        var shouldContinue = true;
        var buttonsTemp = []
        while (shouldContinue) {
          if (msg.output.text[msg.output.text.length - 1] == 'buttons') {
            msg.output.text.pop();
            shouldContinue = false
          } else {
            buttonsTemp.splice(0, 0, msg.output.text.pop());
          }

        }
        //odstrani element, ktery se ma stat bundleRenderer.renderToStream

        if (msg.output.text.length > 0) {
          //ok
          if (buttonsTemp.length > 0) {
            response.output.buttons = buttonsTemp;
            response.output.text = msg.output.text;
          } else {
            wcsConsole.log("error in output text handling logici")
          }
          return response;

        } else {
          wcsConsole.log("error in output text handling logic")
        }
      }


    } else {
      var codeTmpAR = msg.output.text.filter(function (item) {
        if (item.indexOf("code:") !== -1) {
          return true;
        }
        return false;
      });

      if (codeTmpAR.length == 1) {
        var codeTmp = codeTmpAR[0];
        var codeAR = codeTmp.split(":")
        var code = codeAR[1]
        if (!!code && code.length > 0) {
          if (dialogCodes.hasOwnProperty(code) && !!dialogCodes[code]) {
            wcsConsole.log("Code@Text Mapping found for: " + code);

            wcsIsServerErr = false;
            response.output = dialogCodes[code]

            if (!!dialogCodes[code]["inputFieldPlaceholder"] && dialogCodes[code]["inputFieldPlaceholder"].length > 0) {
              activeInputPlaceholder = dialogCodes[code]["inputFieldPlaceholder"];
            } else {
              activeInputPlaceholder = inputPlaceholder;
            }

            return response;
          }
        }

      }
    }

    if (!!msg && msg.output && msg.output.text && msg.output.text.length > 0) {
      activeInputPlaceholder = inputPlaceholder;
      return msg;
    }

    //chyba na serveru - nevalidni/prazdna zprava
    wcsIsServerErr = true;
    wcsConsole.error("No mapping found for WA response: " + JSON.stringify(msg))
    response.output = dialogCodes["unknown_error"];
    return response;
  }



  // Set up callbacks on payload setters in Api module
  // This causes the displayMessage function to be called when messages are sent / received
  function chatUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function (newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.user);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function (newPayload) {
      currentResponsePayloadSetter.call(Api, newPayload);

      //Tka 5.1.18 - kontrola na confidence < 0.2 a pripadne zobrazeni navodnych otazek
      wcsConsole.log("######################  kontrola na confidence < 0.2");
      wcsConsole.log(newPayload)
      wcsConsole.log(JSON.stringify(newPayload));
      let resTemp = {}
      if (typeof(newPayload) === 'object'){
        resTemp = newPayload
      
      }else if (typeof(newPayload) === 'string'){
        resTemp = JSON.parse(newPayload)
      } else {
        wcsConsole.error(`Unsupported payload type: ${typeof(newPayload)}`)
      }
      

      //pokus o disambiguaci, pokud nic tak dalsi standardni zpracovani
      let finalPayload = mapDisambiguationRequestFromWA(resTemp)

      if (finalPayload == null) {
        //Ostatni lide se ptaji, atd kdyz WA primo generuje button TAG
        finalPayload = mapButtonsFromWAtoResponse(resTemp)
      } else {
        wcsConsole.log("Running with disambiguation message (text + button selection for potential matching topics): " + JSON.stringify(finalPayload))
      }



      if (!!finalPayload) {
        if (finalPayload.output && finalPayload.output.buttons && finalPayload.output.buttons.length > 0) {
          wcsConsole.log("################# going to display TEXt&BUTTON message");
          displayMessageWithTextAndButtons(finalPayload, settings.authorTypes.watson);
          //Deactivate input field
          updateInputBoxPlaceholder(true);
        } else {
          wcsConsole.log("################# continue to display standard TEXT message");
          displayMessage(finalPayload, settings.authorTypes.watson);
          //reactivate input Field
          updateInputBoxPlaceholder(true);
        }



      } else {
        //display ERROR message and stop
        wcsConsole.log("################# FATAL ERROR: no mapping for WA code -> display error msg");
      }
    };
  }

  function setupLocalWelcome() {
    /* response string
    "{"intents":[
      {"intent":"nespokojenost","confidence":0.3271039705869351}
      ],
      "entities":[],
      "input":{"text":"tes"},
      "output":{"text":["code:welcome"],
      "nodes_visited":["WELCOME"],"log_messages":[]},
      "context":{
          "conversation_id":"737449bb-4f7b-4c33-9cd5-cae27bfe887f",
          "system":{"dialog_stack":[{"dialog_node":"root"}],"dialog_turn_counter":1,"dialog_request_counter":1,
          "_node_output_map":{"WELCOME":[0]},"branch_exited":true,"branch_exited_reason":"completed"},
          "nova_zadost":true,
          "zadost_ukoncena":false,
          "podminky_splneny":null,
          "dokumenty_vyplneny":null,
          "wrongAnswerCounter":0
        }
      }"
  
    */
    if (Common.getInstance().instance == 'P2') {

      Api.setResponsePayload('{"output":{"text":["code:welcomeP2"]}}')

    } else if (Common.getInstance().instance == 'B0') {
      Api.setResponsePayload('{"output":{"text":["code:welcomeB0"]}}')

    } else if (Common.getInstance().instance == 'ADAPTACE') {
      Api.setResponsePayload('{"output":{"text":["code:welcomeADAPTACE"]}}')

    }
  }

  function updateInputBoxPlaceholder(shouldBeActive) {
    var inputField = $('#textInput');
    inputField.attr("placeholder", activeInputPlaceholder).val("").focus().blur();
    if (shouldBeActive) {
      inputField.prop('disabled', false);
      inputField.focus()
    } else {
      inputField.prop('disabled', true);
    }
  }

  // Set up the input box to underline text as it is typed
  // This is done by creating a hidden dummy version of the input box that
  // is used to determine what the width of the input text should be.
  // This value is then used to set the new width of the visible input box.
  function setupInputBox() {
    var input = document.getElementById('textInput');
    var dummy = document.getElementById('textInputDummy');
    var minFontSize = 14;
    var maxFontSize = 16;
    var minPadding = 4;
    var maxPadding = 6;

    // If no dummy input box exists, create one
    if (dummy === null) {
      var dummyJson = {
        'tagName': 'div',
        'attributes': [{
          'name': 'id',
          'value': 'textInputDummy'
        }]
      };

      dummy = Common.buildDomElement(dummyJson);
      document.body.appendChild(dummy);
    }


    function adjustInput() {
      if (input.value === '') {
        // If the input box is empty, remove the underline
        input.classList.remove('underline');
        input.setAttribute('style', 'width:' + '100%');
        input.style.width = '100%';
      } else {
        // otherwise, adjust the dummy text to match, and then set the width of
        // the visible input box to match it (thus extending the underline)
        input.classList.add('underline');
        var txtNode = document.createTextNode(input.value);
        ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height',
          'text-transform', 'letter-spacing'].forEach(function (index) {
            dummy.style[index] = window.getComputedStyle(input, null).getPropertyValue(index);
          });
        dummy.textContent = txtNode.textContent;

        var padding = 0;
        var htmlElem = document.getElementsByTagName('html')[0];
        var currentFontSize = parseInt(window.getComputedStyle(htmlElem, null).getPropertyValue('font-size'), 10);
        if (currentFontSize) {
          padding = Math.floor((currentFontSize - minFontSize) / (maxFontSize - minFontSize)
            * (maxPadding - minPadding) + minPadding);
        } else {
          padding = maxPadding;
        }

        var widthValue = (dummy.offsetWidth + padding) + 'px';
        input.setAttribute('style', 'width:' + widthValue);
        input.style.width = widthValue;
      }
    }

    // Any time the input changes, or the window resizes, adjust the size of the input box
    input.addEventListener('input', adjustInput);
    window.addEventListener('resize', adjustInput);

    // Trigger the input event once to set up the input box and dummy element
    Common.fireEvent(input, 'input');
  }

  // Display a user or Watson message that has just been sent/received
  //also displays local messages - like testing mode intro
  function displayMessage(newPayload, typeValue, mode) {
    var isUser = isUserMessage(typeValue);
    var messageDivs = []

    if (!newPayload && !!mode && mode == "REV") {
      wcsConsole.log("Going to render rev mode initial message...")

      newPayload = settings.testIntroMsg
      messageDivs = buildMessageDomElements(newPayload, isUser);
    } else {
      //bezne zpracovani
      var textExists = (newPayload && newPayload.text)
        || (newPayload.output && newPayload.output.text);
      if (isUser !== null && textExists) {
        // Create new message DOM element
        messageDivs = buildMessageDomElements(newPayload, isUser);
      }
    }

    var chatBoxElement = document.querySelector(settings.selectors.chatBox);
    var previousLatest = chatBoxElement.querySelectorAll((isUser
      ? settings.selectors.fromUser : settings.selectors.fromWatson)
      + settings.selectors.latest);
    // Previous "latest" message is no longer the most recent
    if (previousLatest) {
      Common.listForEach(previousLatest, function (element) {
        element.classList.remove('latest');
      });
    }

    //disable previous buttons
    var previousButtons = $(settings.selectors.wcsButton);
    if (previousButtons) {
      Common.listForEach(previousButtons, function (element) {
        wcsConsole.log(element.classList);
        //  element.setAttribute('disabled','disabled');
      });
    }

    messageDivs.forEach(function (currentDiv) {
      chatBoxElement.appendChild(currentDiv);
      // Class to start fade in animation
      currentDiv.classList.add('load');
    });
    // Move chat to the most recent messages when new messages are added
    scrollToChatBottom();

  }

  // Display buttons with examples text to compensate for user single word low confidence inputs
  function displayMessageWithButtons(newPayload, buttonsText, typeValue) {
    var isUser = isUserMessage(typeValue);
    var textExists = (newPayload && newPayload.text)
      || (newPayload.output && newPayload.output.text);
    if (isUser !== null && textExists) {
      // Create new message DOM element
      var messageDivs = buildMessageDomElements(newPayload, isUser);
      var chatBoxElement = document.querySelector(settings.selectors.chatBox);
      var previousLatest = chatBoxElement.querySelectorAll((isUser
        ? settings.selectors.fromUser : settings.selectors.fromWatson)
        + settings.selectors.latest);
      // Previous "latest" message is no longer the most recent
      if (previousLatest) {
        Common.listForEach(previousLatest, function (element) {
          element.classList.remove('latest');
        });
      }

      //disable previous buttons
      var previousButtons = $(settings.selectors.wcsButton);
      if (previousButtons) {
        Common.listForEach(previousButtons, function (element) {
          wcsConsole.log(element.classList);
          //   element.setAttribute('disabled','disabled');
        });
      }

      messageDivs.forEach(function (currentDiv) {
        chatBoxElement.appendChild(currentDiv);
        // Class to start fade in animation
        currentDiv.classList.add('load');
      });


      //Vytvorit otazky pod oknem
      var buttonDivs = buildButtonsDomElements(buttonsText, isUser);
      buttonDivs.forEach(function (currentDiv) {
        chatBoxElement.appendChild(currentDiv);
        // Class to start fade in animation
        currentDiv.classList.add('load');
      });

      // Move chat to the most recent messages when new messages are added

      scrollToChatBottom();
    }
  }

  //Display Text&Buttons based on buttons element of output
  function displayMessageWithTextAndButtons(newPayload, typeValue) {
    var isUser = isUserMessage(typeValue);
    var textExists = (newPayload && newPayload.text)
      || (newPayload.output && newPayload.output.text);
    if (isUser !== null && textExists) {
      // Create new message DOM element
      var messageDivs = buildMessageDomElements(newPayload, isUser);
      var chatBoxElement = document.querySelector(settings.selectors.chatBox);
      var previousLatest = chatBoxElement.querySelectorAll((isUser
        ? settings.selectors.fromUser : settings.selectors.fromWatson)
        + settings.selectors.latest);
      // Previous "latest" message is no longer the most recent

      if (previousLatest) {
        Common.listForEach(previousLatest, function (element) {
          element.classList.remove('latest');
        });
      }

      messageDivs.forEach(function (currentDiv) {
        chatBoxElement.appendChild(currentDiv);
        // Class to start fade in animation
        currentDiv.classList.add('load');
      });

      //disable previous buttons
      var previousButtons = $(settings.selectors.wcsButton);
      if (previousButtons) {
        Common.listForEach(previousButtons, function (element) {
          wcsConsole.log(element.classList);
          element.setAttribute('disabled', 'disabled');
        });
      }

      if (newPayload.output.buttons) {
        //vykreslit tlacitka
        var labels = [];
        for (var button in newPayload.output.buttons) {
          labels.push(newPayload.output.buttons[button]);
        }

        if (labels.length == 1) {
          /*
           //Vytvorit otazky pod oknem - 1 je pouze zivnost na zacatku
          var buttonDivs = buildButtonsDomElements(labels, isUser);
          buttonDivs.forEach(function(currentDiv) {
            chatBoxElement.appendChild(currentDiv);
            // Class to start fade in animation
            currentDiv.classList.add('load');
          });
          */
          var buttonDivs = buildButtonsDomElements2(labels, isUser);

          $(settings.selectors.chatBox).append(buttonDivs)
        } else {
          //Vytvorit otazky pod oknem - using Jquery
          var buttonDivs = buildButtonsDomElements2(labels, isUser);

          $(settings.selectors.chatBox).append(buttonDivs)


        }
      }


      // Move chat to the most recent messages when new messages are added
      scrollToChatBottom();
    }

    // Move chat to the most recent messages when new messages are added

    scrollToChatBottom();

  }

  // Checks if the given typeValue matches with the user "name", the Watson "name", or neither
  // Returns true if user, false if Watson, and null if neither
  // Used to keep track of whether a message was from the user or Watson
  function isUserMessage(typeValue) {
    if (typeValue === settings.authorTypes.user) {
      return true;
    } else if (typeValue === settings.authorTypes.watson) {
      return false;
    }
    return null;
  }

  // Constructs new DOM element from a message payload
  function buildMessageDomElements(newPayload, isUser) {
    var messageArray = [];
    var textArray;
    var isReviewMode2 = isReviewMode;

    if (!isReviewMode) {
      wcsConsole.log("running in standard mode - processing payload from context")
      textArray = isUser ? newPayload.text : newPayload.output.text;
      if (Object.prototype.toString.call(textArray) !== '[object Array]') {
        textArray = [textArray];
      }

    } else {
      wcsConsole.log("running in review mode - rendering local message and feedback button")

      wcsConsole.log("-----------------payload")

      wcsConsole.log(JSON.stringify(newPayload))
      if (isUser) {
        isReviewMode = false; //user msg. chci zobrazit jako standardni message
        //uvodni zprava do testovani
        if (shouldDisplayTestIntroMsg) {
          textArray = [settings.testIntroMsg]

          shouldDisplayTestIntroMsg = false;
        } else {
          //user msg. jsou zobrazeny take standardne
          textArray = [newPayload.text];
        }
      } else {
        //Watson messages -> tam chci zobrazit button pro feedback
        textArray = isUser ? newPayload.text : newPayload.output.text;
        if (Object.prototype.toString.call(textArray) !== '[object Array]') {
          textArray = [textArray];
        }
      }
    }

    textArray.forEach(function (currentText) {
      if (currentText) {
        var messageJson = {
          // <div class='segments'>
          'tagName': 'div',
          'classNames': ['segments'],
          'children': [{
            // <div class='from-user/from-watson latest'>
            'tagName': 'div',
            'classNames': [(isUser ? 'from-user' : 'from-watson'), 'latest', ((messageArray.length === 0) ? 'top' : 'sub')],
            'children': [{
              // <div class='message-inner'>
              'tagName': 'div',
              'classNames': ['message-inner'],
              'children': [{
                // <p>{messageText}</p>
                'tagName': 'p',
                'text': currentText
              }]
            }]
          }]
        };

        messageArray.push(Common.buildDomElement(messageJson, isReviewMode, currentText, newPayload));
      }
    });

    //nastaveni puvodniho nastaveni
    isReviewMode = isReviewMode2

    return messageArray;
  }

  // Constructs new DOM element for buttons using JQuery
  function buildButtonsDomElements2(buttonsIn, isUser) {

    //vytvorit parent div

    var button_group_div_container = $("<div>", { class: "container-fluid" });
    var button_group_div_container_row = $("<div>", { class: "row" });
    var button_group_div_container_row_margin1 = $("<div>", { class: "col-md-1" });
    var button_group_div_container_row_margin2 = $("<div>", { class: "col-md-1" });
    var button_group_div_container_row_margin3 = $("<div>", { class: "col-md-1" });
    var button_group_div_container_row_margin4 = $("<div>", { class: "col-md-1" });
    var button_group_div_container_row_content = $("<div>", { class: "col-md-8" });

    //  button_group_div_container_row.append(button_group_div_container_row_margin1,button_group_div_container_row_margin2,button_group_div_container_row_content,button_group_div_container_row_margin3,button_group_div_container_row_margin4);
    // button_group_div_container.append(button_group_div_container_row)

    button_group_div_container.append($("<div>", { class: "form-group" }));
    //for each button child div, attributes, click
    buttonsIn.forEach(function (currentText) {
      var btn_grp = $("<div>", { class: "form-group" });
      var btn_button = $("<button>", { class: "btn btn-danger wcsButton" });
      btn_button.text(currentText);
      btn_button.click(function () { // Note this is a function

        ConversationPanel.buttonKeyDown(currentText);
      });

      btn_grp.append(btn_button);
      button_group_div_container.append(btn_grp);
    })
    //vratit parent div

    return button_group_div_container;
  }


  // Constructs new DOM element for buttons
  function buildButtonsDomElements(newPayload, isUser) {
    var textArray = newPayload;
    if (Object.prototype.toString.call(textArray) !== '[object Array]') {
      textArray = [textArray];
    }

    var messageArray = [];

    textArray.forEach(function (currentText) {
      if (currentText) {
        var messageJson = {
          // <div class='segments'>
          'tagName': 'div',
          'classNames': ['segments-button'],
          'children': [{
            // <div class='from-user/from-watson latest'>
            'tagName': 'button',
            'classNames': ['btn', 'btn-danger', 'wcsButton', ((messageArray.length === 0) ? 'top' : 'sub')],
            'children': [{
              // <div class='message-inner'>
              'tagName': 'div',
              'classNames': ['message-inner'],
              'children': [{
                // <p>{messageText}</p>
                'tagName': 'p',
                'text': currentText
              }]
            }]
          }]
        };

        messageArray.push(Common.buildDomElementForButton(messageJson, currentText, newPayload));
      }
    });

    return messageArray;
  }

  // Scroll to the bottom of the chat window (to the most recent messages)
  // Note: this method will bring the most recent user message into view,
  //   even if the most recent message is from Watson.
  //   This is done so that the "context" of the conversation is maintained in the view,
  //   even if the Watson message is long.
  function scrollToChatBottom() {
    var scrollingChat = document.querySelector('#scrollingChat');

    // Scroll to the latest message sent by the user
    var scrollEl = scrollingChat.querySelector(settings.selectors.fromUser
      + settings.selectors.latest);
    if (scrollEl) {
      scrollingChat.scrollTop = scrollEl.offsetTop;
    }
  }



  // Handles the submission of input
  function inputKeyDown(event, inputBox) {
    // Submit on enter key, dis-allowing blank messages
    if (event.keyCode === 13 && inputBox.value) {
      // Retrieve the context from the previous server response
      var context;
      var currentText = inputBox.value;
      var latestResponse = Api.getResponsePayload();
      if (latestResponse) {
        context = latestResponse.context;
      }

      if (!!currentText && currentText.length > 0) {
        if (wcsIsInitMode) {
          wcsInitMessageToWA = currentText;
          Api.sendRequest('init_init_init', null);

        } else {

          // Send the user message
          Api.sendRequest(inputBox.value, context);
        }

        // Clear input box for further messages
        inputBox.value = '';
        Common.fireEvent(inputBox, 'input');
      }
    }
  }

  // Handles the submission of BUTTON on WA responses
  function buttonKeyDown(currentText) {
    // Submit on enter key, dis-allowing blank messages
    wcsConsole.log("running buttonKeyDown with value: " + currentText);

    if (!!currentText && currentText.length > 0) {
      if (wcsIsInitMode) {
        wcsInitMessageToWA = currentText;
        Api.sendRequest('init_init_init', null);
      } else {
        // Retrieve the context from the previous server response
        var context;
        var latestResponse = Api.getResponsePayload();
        if (latestResponse) {
          context = latestResponse.context;
        }



        // Send the user message
        Api.sendRequest(currentText, context);
      }

    }
  }

  function getPosition(el) {
    var xPos = 0;
    var yPos = 0;

    while (el) {
      if (el.tagName == "BODY") {
        // deal with browser quirks with body/window/document and page scroll
        var xScroll = el.scrollLeft || document.documentElement.scrollLeft;
        var yScroll = el.scrollTop || document.documentElement.scrollTop;

        xPos += (el.offsetLeft - xScroll + el.clientLeft);
        yPos += (el.offsetTop - yScroll + el.clientTop);
      } else {
        // for all other non-BODY elements
        xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
        yPos += (el.offsetTop - el.scrollTop + el.clientTop);
      }

      el = el.offsetParent;
    }
    return {
      x: xPos,
      y: yPos
    };
  }

  /* Handles the submission of FEEDBACK BUTTON on WA responses
  https://nakupanda.github.io/bootstrap3-dialog/
  
  */
  function feedbackButtonKeyDown(feedbackObject) {
    // Submit on enter key, dis-allowing blank messages
    wcsConsole.log("running feedback buttonKeyDown with id: " + feedbackObject.id + " with value: " + JSON.stringify(feedbackObject));


    // Get the modal
    var modal = document.getElementById('watson-modal');

    // Get the dialog element that closes the modal
    var dialog = document.getElementById("watson-modal-dialog");

    // Get the close element that closes the modal
    var close1 = document.getElementById("watson-modal-dialog-cancel1");
    // Get the close element that closes the modal
    var close2 = document.getElementById("watson-modal-dialog-cancel2");

    var positiveSave = document.getElementById("watson-modal-dialog-positive");
    // Get the close element that closes the modal
    var negativeSave = document.getElementById("watson-modal-dialog-negative");


    //Setup position close to feedback object
    var buttonSource = document.getElementById(feedbackObject.id);
    var position = getPosition(buttonSource);
    wcsConsole.log("Source button position: " + JSON.stringify(position))
    dialog.style.top = (position.y + 50)
    //open dialog
    modal.style.display = "block";


    // When the user clicks on <span> (x), close the modal
    close1.onclick = function () {
      modal.style.display = "none";
    }
    close2.onclick = function () {
      modal.style.display = "none";
    }

    positiveSave.onclick = function () {
      var comments = document.getElementById("watson-modal-dialog-comment").value
      wcsConsole.log("Saving negative feedback on the server.............." + comments)

      wcsConsole.log(JSON.stringify(feedbackObject))
      modal.style.display = "none";
    }

    negativeSave.onclick = function () {

      var comments = document.getElementById("watson-modal-dialog-comment").value
      wcsConsole.log("Saving negative feedback on the server.............." + comments)
      wcsConsole.log(JSON.stringify(feedbackObject))
      modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }


    return

    if (!!currentText && currentText.length > 0) {
      // Retrieve the context from the previous server response
      var context;
      var latestResponse = Api.getResponsePayload();
      if (latestResponse) {
        context = latestResponse.context;
      }

      // Send the user message
      // Api.sendRequest(currentText, context);


    }
  }
}());
