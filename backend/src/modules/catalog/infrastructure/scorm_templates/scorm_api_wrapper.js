var apiHandle = null;
var findAPITries = 0;

function getAPI() {
   if (apiHandle == null) {
      apiHandle = findAPI(window);
   }
   return apiHandle;
}

function findAPI(win) {
   while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
      findAPITries++;
      if (findAPITries > 500) {
         return null;
      }
      win = win.parent;
   }
   return win.API;
}

function LMSInitialize() {
   var api = getAPI();
   if (api == null) {
      console.warn("SCORM API not found!");
      return "false";
   }
   return api.LMSInitialize("");
}

function LMSGetValue(name) {
   var api = getAPI();
   if (api == null) {
      return "";
   }
   return api.LMSGetValue(name);
}

function LMSSetValue(name, value) {
   var api = getAPI();
   if (api == null) {
      return "false";
   }
   return api.LMSSetValue(name, value);
}

function LMSCommit() {
   var api = getAPI();
   if (api == null) {
      return "false";
   }
   return api.LMSCommit("");
}

function LMSFinish() {
   var api = getAPI();
   if (api == null) {
      return "false";
   }
   return api.LMSFinish("");
}
