// Client ID and API key from the Developer Console
var CLIENT_ID = '600705290428-u7vknaddutd0kbqrjr88ecsa6jdoutfm.apps.googleusercontent.com';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

// donor spreadsheet settings
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
var donorConfirmedSheet = {
    name: 'Confirmed',
    id: 4
}
var donorCancelledSheet = {
    name: 'Cancelled',
    id: 5
}

//Indexes where values can be found in the Sept 2017 donor spreadsheet
var donorAddressIndex = 7;
var donorCityIndex = 8;
var donorStateIndex = 9;
var donorZipIndex = 10;
var donorFirstNameIndex = 2;
var donorLastNameIndex = 3;
var donorEmailIndex = 4;
var donorPhoneIndex = 5;
var donorBackupPhoneIndex = 6;
var donorFurnitureStart = 18;
var donorFurnitureEnd = 54;
var donorMustBePickedUpByDateIndex = 16;
var donorPickupLocationNotes = 17;
var donorAdditionalComments = 55

/**
* Initialization and Authentication
*/

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
 * Data Initialization Section
 */

/**
 * Basic data type for OTF scheduling 
 * @param type - A description of the workflow state of the item
 * @param rowId -  The google sheet row id. The first row of data in the
 *                  sheet is rowid 2.
 * @param rowData: ['value1', 'value2', ...] // The raw values for the data
                                         // in this row
 * @param sheet - A reference to the google sheet associated with this item
 */
function Item(type, rowId, rowData, sheet) {
    this.type = type;
    this.rowId = rowId;
    this.rowData = rowData;
    this.name = rowData[donorFirstNameIndex] + ' ' + rowData[donorLastNameIndex];
    this.phone = rowData[donorPhoneIndex];
    this.backupPhone = rowData[donorBackupPhoneIndex];
    this.address = rowData[donorAddressIndex];
    this.city = rowData[donorCityIndex];
    this.state = rowData[donorStateIndex];
    this.zip = rowData[donorZipIndex];
    this.sheet = sheet;
    this.marker = null;
    this.listElement = null;
    this.whatFurniture = GetFurnitureList(type, rowData);
}

function GetFurnitureList(type, row) {
    return "TODO Generate Furniture List";
}



/**
* Initialize OTF Data from spreadsheets
*/
function initData() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: '1JNFSq8cxu1euM19om7--48upRRXguR2Hzfxd4I4Q7oc',
        range: 'In Progress!A1:BE99',
    }).then(function (response) {
        var itemListData = convertResponseToItems(response.result.values);
        initMap(itemListData);
        initList(itemListData);

    }, function (response) {
        appendPre('Error: ' + response.result.error.message);
    });
}

function convertResponseToItems(responseValues) {
    var newArray = [];

    for (var i = 1; i < responseValues.length; i++) {
        var newObj = new Item("InProgress", i, responseValues[i], donorSpreadsheetId); 

        //for (var val = 0; val < responseValues[0].length; val++) {
        //    newObj[responseValues[0][val]] = responseValues[i][val];
        //}

        newArray.push(newObj);
    }

    return newArray;
}


/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
    if (!isSignedIn) {
        gapi.auth2.getAuthInstance().signIn();
    }
    else {
        initData();
    }
}




/**
 * Workflow Section
 */

function Confirm(item) {
    moveToConfirmSheet(item);
    updateMarker(item);
    updateInfoWindow(item);
}

function InProgress(item) {
    moveToInProgressSheet(item);
    updateInfoWindow(item);
    addToList(item);
}

function CancelPickupOrDelivery(item) {
    moveToConfirmSheet(item);
    updateInfoWindow(item);
    removeFromList(item);
}

function Complete(item) {
    moveToCompleteSheet(item);
    removeMarker(item);
    removeFromList(item);
}

function OrderItem(item, newindex) {
    orderItemOnSheet(item, newindex);
}

/**
 * Sheet Management Section
 *
 */
function moveToInProgressSheet(item) {
    moveItem(item, donorSpreadsheetId, donorNewSheet, donorInProgressSheet);
}

function moveToConfirmSheet(item) {
    moveItem(item, donorSpreadsheetId, donorNewSheet, donorInProgressSheet);
}

function moveToCompleteSheet(item) {
    moveItem(item, donorSpreadsheetId, donorNewSheet, donorInProgressSheet);
}

function orderItemOnSheet(item, newindex) {
    console.log("TODO: Write the orderItemOnSheet function");
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

    request.then(function (response) {
        console.log("Moved: ", response.result);
        var updatedRange = response.result.updates.updatedRange;
        var newrowid = updatedRange.match(/\d+$/)[0];
        console.log("New row id: ", newrowid);

        console.log("deleting: ", item.rowid);
        var request = gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
        }, {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: fromSheet.id,
                            dimension: 'ROWS',
                            startIndex: item.rowid - 1,
                            endIndex: item.rowid,
                        }
                    }
                }]
            });
        request.then(function (response) {
            console.log("Deleted: ", response.result);
            item.rowid = newrowid;
        }, function (reason) {
            console.error('error: ' + reason.result.error.message);
        });
    }, function (reason) {
        console.error('error: ' + reason.result.error.message);
    });
}


/**
 * Map Section 
 * 
 */

function initMap(itemData) {
    console.log('Testing!');
    for (var i = 1; i < itemData.length; i++) {
        console.log(itemData[i].address);
    }
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

function updateMarker(item) {
}

function updateInfoWindow(item) {
}

function removeMarker(item) {
}

/**
 * List Section 
 * 
 */

function initList(itemData) {
    console.log('TODO Generate init List!');
    for (var i = 1; i < itemData.length; i++) {
        console.log(itemData[i].name);
    }


    for (var i = 1; i < itemData.length; i++) {
        console.log(itemData[i].address);
        $('#list').html($('#list').html() + itemData[i].name + "<br />")
    }
}

function addToList(item) {
}

function removeFromList(item) {
}
