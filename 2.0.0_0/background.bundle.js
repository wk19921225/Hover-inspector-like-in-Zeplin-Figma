var debug = true;
var tabs = {};

// var PATH_TO_CSS_FILE = 'webpage.chrome.css';
var PATH_TO_JS_FILE = 'inject.bundle.js';
var PATH_TO_ZTOOL_16LOGO_FILE = 'images/new_logo2/zTool-16.png';
var PATH_TO_ZTOOL_16LOGO_ACTIVE_FILE = 'images/new_logo2/zTool-16-active.png';
var PATH_TO_ZTOOL_32LOGO_FILE = 'images/new_logo2/zTool-32.png';
var PATH_TO_ZTOOL_32LOGO_ACTIVE_FILE = 'images/new_logo2/zTool-32-active.png';

function toggle(tab) {
  if (!tabs[tab.id])
    addTab(tab);
  else
    deactivateTab(tab.id);
}

function addTab(tab) {
  tabs[tab.id] = Object.create(dimensions);
  tabs[tab.id].activate(tab);
}

function deactivateTab(id) {
  tabs[id].deactivate();
}

function removeTab(id) {
  for (var tabId in tabs) {
    if (tabId == id)
      delete tabs[tabId];
  }
}

var lastBrowserAction = null;

chrome.browserAction.onClicked.addListener(function (tab) {
  if (lastBrowserAction && Date.now() - lastBrowserAction < 10) {
    // fix bug in Chrome Version 49.0.2623.87
    // that triggers browserAction.onClicked twice
    // when called from shortcut _execute_browser_action
    return;
  }
  toggle(tab);
  lastBrowserAction = Date.now();
});

chrome.runtime.onConnect.addListener(function (port) {
  tabs[port.sender.tab.id].initialize(port);
});

chrome.runtime.onSuspend.addListener(function () {
  for (var tabId in tabs) {
    tabs[tabId].deactivate(true);
  }
});


var dimensions = {
  alive: true,

  activate: function (tab) {
    this.tab = tab;

    this.onBrowserDisconnectClosure = this.onBrowserDisconnect.bind(this);


    var extensionVersion = chrome.app.getDetails().version;

    // chrome.tabs.executeScript({
    //     code: `console.log(hover inspector v:'${extensionVersion}');`
    // });

    chrome.tabs.executeScript({
      code: `window.extension = {hoverInspector: {version : '${extensionVersion}'} };`
    });

    // chrome.tabs.insertCSS(this.tab.id, {file: PATH_TO_CSS_FILE});
    chrome.tabs.executeScript(this.tab.id, {file: PATH_TO_JS_FILE});


    // chrome.debugger.attach({tabId: this.tab.id}, "1.0");
    chrome.browserAction.setIcon({
      tabId: this.tab.id,
      path: {
        16: PATH_TO_ZTOOL_16LOGO_ACTIVE_FILE,
        32: PATH_TO_ZTOOL_32LOGO_ACTIVE_FILE
      }
    });
  },

  deactivate: function (silent) {
    if (!this.port) {
      // not yet initialized
      this.alive = false;
      return;
    }

    if (!silent)
      this.port.postMessage({actionType: 'destroy'});

    this.port.onDisconnect.removeListener(this.onBrowserDisconnectClosure);

    chrome.browserAction.setIcon({
      tabId: this.tab.id,
      path: {
        16: PATH_TO_ZTOOL_16LOGO_FILE,
        32: PATH_TO_ZTOOL_32LOGO_FILE
      }
    });
    // chrome.debugger.detach({tabId: this.tab.id}, "Debugger");
    window.removeTab(this.tab.id);
  },

  onBrowserDisconnect: function () {
    this.deactivate(true);
  },

  initialize: function (port) {
    this.port = port;

    if (!this.alive) {
      // was deactivated whilest still booting up
      this.deactivate();
      return;
    }


    this.port.onDisconnect.addListener(this.onBrowserDisconnectClosure);
    this.port.postMessage({
      actionType: 'init',
      debug: debug
    });


    const self = this;
    this.port.onMessage.addListener(function (event, data) {
      if (event.actionType === "destroy") {
        self.deactivate();
        return;
      }
      // if (event.actionType === "highlightNode") {
      //     var highlightConfig = {
      //         showInfo: false,
      //         contentColor: {r: 68, g: 143, b: 218},
      //         paddingColor: {r: 28, g: 118, b: 175},
      //         borderColor: {r: 255, g: 255, b: 255},
      //         marginColor: {r: 232, g: 192, b: 29},
      //     };
      //     const getBodyDOM = function(responsedDOM){
      //         for(var i = 0 ; i < responsedDOM.root.childNodeCount; i ++ ){
      //             var firstRootChildren = responsedDOM.root.children[i];
      //             for(var j = 0 ; j < firstRootChildren.childNodeCount; j ++){
      //                 var secondChildren = firstRootChildren.children[j];
      //                 if(secondChildren.localName == "body"){
      //                     return secondChildren;
      //                 }
      //             }
      //         }
      //
      //         return "";
      //     }
      //
      //
      //
      //     var debuggee = {tabId: self.tab.id};
      //
      //
      //
      //     chrome.debugger.sendCommand(debuggee, "DOM.getDocument", function (response) {
      //         debugger
      //
      //         var body = getBodyDOM(response);
      //         var target = {nodeId: body.nodeId, selector: event.data}
      //
      //
      //         console.log(target);
      //
      //         chrome.debugger.sendCommand(debuggee, "DOM.querySelector", target, function (response) {
      //
      //             if (!response) {
      //                 debugger
      //                 return
      //             }
      //
      //             chrome.debugger.sendCommand(debuggee,"DOM.highlightNode", {
      //                 "nodeId": response.nodeId,
      //                 "highlightConfig": highlightConfig
      //             }, function (response) {
      //                 debugger
      //                 console.log(response)
      //             });
      //         })
      //     })
      //     return;
      // }
    });

  }
};
