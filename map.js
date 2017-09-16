// Client ID and API key from the Developer Console
var CLIENT_ID = '600705290428-u7vknaddutd0kbqrjr88ecsa6jdoutfm.apps.googleusercontent.com';

// The id of the spreadsheet
var donorSpreadsheetId = '1JNFSq8cxu1euM19om7--48upRRXguR2Hzfxd4I4Q7oc';
var donorNewItemSheet = {
  name: 'Form Responses',
  id: 0
}
var donorInProgressSheet = {
  name: 'In Progress',
  id: 2
}
var donorHistorySheet = {
  name: 'History',
  id: 3
}

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets";

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
  // TODO: Load initial data here
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
    clientId: CLIENT_ID,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (!isSignedIn) {
      gapi.auth2.getAuthInstance().signIn();
  }
}

/**
 *  Move an item from one sheet to another sheet
 */
function moveItem(item, spreadsheetId, fromSheet, toSheet) {
  console.log("moving: ", item.rowid);
  var request = gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: toSheet.name,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS'
  }, {
    range: toSheet.name,
    values: [item.rowdata],
  });

  request.then(function(response) {
    console.log("Moved: ", response.result);
    var updatedRange = response.result.updates.updatedRange;
    var newrowid = updatedRange.match(/\d+$/)[0];
    console.log("New row id: ", newrowid);

    console.log("deleting: ", item.rowid);
    var request = gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
    }, {
      requests: [{ deleteDimension: {
        range: {
          sheetId: fromSheet.id,
          dimension: 'ROWS',
          startIndex: item.rowid - 1,
          endIndex: item.rowid,
        }
      }}]
    });
    request.then(function(response) {
      console.log("Deleted: ", response.result);
      item.rowid = newrowid;
    }, function(reason) {
      console.error('error: ' + reason.result.error.message);
    });
  }, function(reason) {
    console.error('error: ' + reason.result.error.message);
  });
}

/*
  item is any javascript object that contains the following properties:
    {
      rowid: N,     // The google sheet row id. The first row of data in the
                    //sheet is rowid 2.

      rowdata: ['value1', 'value2', ...] // The raw values for the data
                                         // in this row
    } 

  The response to this call is the item object with the new row id set
*/
function moveToInProgress(item) {
  moveItem(item, donorSpreadsheetId, donorNewSheet, donorInProgressSheet);
}

function initMap() {
  console.log('Testing!');
  var uluru = {lat: -25.363, lng: 131.044};
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 4,
    center: uluru
  });
  var marker = new google.maps.Marker({
    position: uluru,
    map: map
  });
}
