// Client ID and API key from the Developer Console
var CLIENT_ID = '600705290428-u7vknaddutd0kbqrjr88ecsa6jdoutfm.apps.googleusercontent.com';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

// client spreadsheet settings
var clientSpreadsheetId = '14AFKDSVe2Xz3PpARKDC5xIHE4zVyNXmN81_m4Fdhks8';

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

var clientName = 8;

var clientAddressNumberIndex = 12;
var clientAddressNameIndex = 13;
var clientCityIndex = 8;
var clientStateIndex = 9;
var clientZipIndex = 14; //none
var clientEmailIndex = 13;
var clientPhoneIndex = 9;
var clientBackupPhoneIndex = 11;
var clientFurnitureDescription = 29;

var donorHeaders = [];

var clientPinColor = 'fff838';
var donorConfirmedPinColor = '46f91d';
var donorNotConfirmedPinColor = 'f91b1b';

var donorType = "DONOR";
var clientType = "CLIENT";
var notConfirmedStatus = "NotConfirmed";
var confirmedStatus = "Confirmed";
var inProgressStatus = "InProgress";


var allData = [];

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
function Item(type, status, rowId, rowData, sheet) {
    this.type = type;
    this.status = status;
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

function ClientItem(type, status, rowId, rowData, sheet) {
    this.type = type;
    this.status = status;
    this.rowId = rowId;
    this.rowData = rowData;
    this.name = rowData[clientName];
    this.phone = rowData[clientPhoneIndex];
    this.backupPhone = rowData[clientBackupPhoneIndex];
    this.address = rowData[clientAddressNumberIndex] + " " + rowData[clientAddressNameIndex];
    this.city = ""; //Not on form
    this.state = "PA";
    this.zip = rowData[clientZipIndex];
    this.sheet = sheet;
    this.marker = null;
    this.listElement = null;
    this.whatFurniture = rowData[clientFurnitureDescription];
}

function GetFurnitureList(type, row) {
    var furniture = [];
    for(var i = donorFurnitureStart; i <= donorFurnitureEnd; i++) {
        if(row[i]) {
            furniture.push(donorHeaders[i] + " (" + row[i] + ")");
        }
    }
    return furniture.join(", ");
}

/**
* Initialize OTF Data from spreadsheets
*/
function initData() {
    gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: donorSpreadsheetId,
        ranges: ['Form Responses', 'In Progress', 'Confirmed'],
    }).then(function (donorResponse) {
        convertDonorResponseToItems(donorResponse.result.valueRanges, donorSpreadsheetId);
        gapi.client.sheets.spreadsheets.values.batchGet({
            spreadsheetId: clientSpreadsheetId,
            ranges: ['Form Responses 1', 'In Progress'],
        }).then(function (clientResponse) {
            convertClientResponseToItems(clientResponse.result.valueRanges, clientSpreadsheetId);
            initMap(allData);
            initList(allData);
        }, function (clientResponse) {
            alert('Error: ' + clientResponse.result.error.message);
        });
    }, function (donorResponse) {
        alert('Error: ' + donorResponse.result.error.message);
    });
}

function convertDonorResponseToItems(responseValues, sheetId) {
    allData = [];

    //Init data loads this range: 'Form Responses','In Progress'
    var formResponseValues = responseValues[0].values;
    var inProgressValues = responseValues[1].values;
    var confirmedValues = responseValues[2].values;
    //Process Each value range

    donorHeaders = formResponseValues[0];

    for (var i = 1; i < formResponseValues.length; i++) {
        var newObj = new Item(donorType, notConfirmedStatus, formResponseValues[i], donorSpreadsheetId); 
        allData.push(newObj);
    }

    for (var i = 1; i < inProgressValues.length; i++) {
        var newObj = new Item(donorType, inProgressStatus, i, inProgressValues[i], donorSpreadsheetId);
        allData.push(newObj);
    }

    for (var i = 1; i < inProgressValues.length; i++) {
        var newObj = new Item(donorType, confirmedStatus, i, inProgressValues[i], donorSpreadsheetId);
        allData.push(newObj);
    }


}

function convertClientResponseToItems(responseValues, sheetId) {

    //Init data loads this range: 'Form Responses','In Progress'
    var formResponseValues = responseValues[0].values;
    var inProgressValues = responseValues[1].values;

    //Process Each value range

    donorHeaders = responseValues[0].values[0];

    for (var i = 1; i < formResponseValues.length; i++) {
        var newObj = new ClientItem(clientType, notConfirmedStatus, i, formResponseValues[i], clientSpreadsheetId); 
        allData.push(newObj);
    }

    for (var i = 1; i < inProgressValues.length; i++) {
        var newObj = new ClientItem(clientType, inProgressStatus, i, inProgressValues[i], clientSpreadsheetId);
        allData.push(newObj);
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

function CancelPickupOrDelivery(i) {
	item = allData[i];
	
    moveToConfirmSheet(item);
    updateInfoWindow(item);
    removeFromList(item);
}

function Complete(i) {
	item = allData[i];
	
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
var map;

function initMap() {
    var pittsburgh = {lat: 40.45, lng:-79.99};
    map = new google.maps.Map(document.getElementById('map'), {
      center: pittsburgh,
      zoom: 10
    });
}

function initMapData(items) {
    for (var i = 1; i < items.length; i++) {

        geocode(items[i]);
        //infowindow(items[i])
    }
}

function updateMarker(item) {
}

function updateInfoWindow(item) {
}

function removeMarker(item) {
}

//turns address string to lat and long to place marker on map
function geocode(item) {
  var geocoder = new google.maps.Geocoder();
  var address = item.address + " " + item.city + ", " + item.state + " " + item.zip;

  geocoder.geocode({ 'address': address }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK){
      console.log("Geocoded ", item);
      var addressLocation = results[0].geometry.location;
      var pinImage = new google.maps.MarkerImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2%7C' + pincolor(item));
      item.marker = new google.maps.Marker({
        position: addressLocation,
        map: map,
        animation: google.maps.Animation.DROP,
        icon:pinImage
    });
    } else {
      console.log("Failed to geocode ", item);
    }
  });
}

function pincolor(item) {
  if(item.type == donorType) {
    if(item.status == notConfirmedStatus) {
      return donorNotConfirmedPinColor;
    } else {
      return donorConfirmedPinColor;
    }
  } else {
    return clientPinColor;
  }
}

function initList(itemData) {
    var htmlStr = '';
    var temp = 0;

    for (var i = 1; i < itemData.length; i++) {
        console.log(itemData[i].address);
        if (itemData[i].status == inProgressStatus) {
            var row = itemData[i];
            temp = temp + 1;
            var strTemp = ((temp % 2 == 0) ? '2' : '');

            htmlStr +=
                '<div class="section' + strTemp + '">' +
                '<div class="results">' +
                '<div class="title">Name </div>' +
                '<div class="content">' + row.name + '</div>' +
                '</div>' +
                '<div class="results">' +
                '<div class="title">Phone </div>' +
                '<div class="content">' + row.phone + '</div>' +
                '</div>' +
                '<div class="results">' +
                '<div class="title">Alt Phone </div>' +
                '<div class="content">' + row.backupPhone + '</div>' +
                '</div>' +
                '<div class="results">' +
                '<div class="title">Address </div>' +
                '<div class="content">' + row.address + '</div>' +
                '</div>' +
                '<div class="results">' +
                '<div class="title">City, State, Zip </div>' +
                '<div class="content">' + row.city + ', ' + row.state + ' ' + row.zip + '</div>' +
                '</div>' +
                '<div class="results">' +
                '<div class="title">What </div>' +
                '<div class="content">' + ((row.whatFurniture.length > 32) ? row.whatFurniture.substring(0, 32) : row.whatFurniture) + '</div>' +
                '</div>' +
                '<div class="btns"><a class="x" onclick="CancelPickupOrDelivery(' + i +');">x</a></div>' +
                '<div class="btns"><a class="done" onclick="Complete(' + i + ');">Completed</a></div>' +
                '<div class="clear"> </div>' +
                '</div>';
        }
    }

    $('#wrapper').html(htmlStr);
}

function addToList(item) {
}

function removeFromList(item) {
}
