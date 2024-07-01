
function onGmailOpen(e) {
  var card = createMainCard();
  return card;
}

function createMainCard() {
  var card = CardService.newCardBuilder();
  
  var section = CardService.newCardSection();
  
  var isEnabled = isAutoDeleteEnabled() === 'true'; // Check if enabled

  // Add the button below the switch control 

  var switchControl = CardService.newDecoratedText()
    .setTopLabel("Enable Daily Auto Deletion")
    .setSwitchControl(CardService.newSwitch()
      .setFieldName("autoDeleteEnabled")
      .setValue('true')
      .setSelected(isEnabled)
      .setOnChangeAction(CardService.newAction().setFunctionName("handleSwitchChange")));

  section.addWidget(switchControl);
  
  card.addSection(section);
  card.addSection(howToUseSection())
  // card.addSection(testAddonSection())
  card.addSection(disclaimerSection())
  
  return card.build();
}

function howToUseSection(){
  var section = CardService.newCardSection();
  section.setHeader('How to use');
  section.addWidget(CardService.newTextParagraph().setText('Auto Delete Emails add-on in Gmail automatically checks your mailbox daily at 2am GMT and deletes the emails labelled <b>Auto Delete</b>. It also lets you set custom retention periods for different types of emails; for instance, you can configure to delete Amazon order updates after 30 days whereas delete Google Security Alerts after just 7 days.<br><br><a href="https://notebook.ddeepak95.com/tools/auto-delete-emails" target="_blank">Check out this link for set up instructions</a>'));
  return section
}

function testAddonSection(){
  var section = CardService.newCardSection();
  section.setHeader('Test the add-on');
  section.addWidget(CardService.newTextParagraph().setText('You can test the add-on by adding the <b>Auto Delete</b> label to some of your unwanted emails and clicking the button below. The add-on will automatically delete the labeled emails immediately.'));
  var deleteButton = CardService.newTextButton()
    .setText("Test Add-on")
    .setOnClickAction(CardService.newAction().setFunctionName("testAddOn"));

  section.addWidget(deleteButton);
  return section
}


function disclaimerSection(){
  var section = CardService.newCardSection();
  section.setHeader('Disclaimer');
  section.addWidget(CardService.newTextParagraph().setText('The developer doesn\'t have access to any of your data and the developer is not responsible for any data loss by mistake.'));
  return section
}

function handleSwitchChange(e) {
  var formInputs = e.commonEventObject.formInputs;
  
  var isEnabled = formInputs && formInputs.hasOwnProperty('autoDeleteEnabled') ? 'true' : 'false';
  
  PropertiesService.getUserProperties().setProperty('AUTO_DELETE_ENABLED', isEnabled);
  
  if (isEnabled === 'true') {
    createDailyTrigger();
  } else {
    deleteDailyTriggers();
  }
  
  var card = createMainCard(); // Get the updated card
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card)) // Pass the Card object
    .build();
}

function isAutoDeleteEnabled() {
  var isEnabled = PropertiesService.getUserProperties().getProperty('AUTO_DELETE_ENABLED');
  return isEnabled === 'true' ? 'true' : 'false'; // Ensure default is 'false'
}

function createDailyTrigger() {
  deleteDailyTriggers(); // Delete any existing triggers first
  ScriptApp.newTrigger('deleteOldEmails')
    .timeBased()
    .atHour(2)  // Set the hour you want the script to run (24-hour format)
    .everyDays(1)  // Run the script every day
    .create();
}

function deleteDailyTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == 'deleteOldEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}


const PARENT_LABEL_NAME = "Auto Delete"; // Replace with your actual parent label name
const MAX_RUNTIME_MS = 40000; // 40 seconds
const BATCH_SIZE = 100; // Adjust as needed



function testAddOn() {
  alertInfo();
  deleteOldEmails();
}

function alertInfo(){
    var actionResponse = CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText("It might take some time to delete the emails based on the number of emails. Please refresh and check after sometime!"))
    .build();

  return actionResponse;
}

function deleteOldEmails() {
  deleteRetainedEmails();
  deleteAllEmailsWithLabel();
}


function deleteRetainedEmails() {
  var currentDate = new Date();
  
  try {
    // Get all user labels
    var allLabels = GmailApp.getUserLabels();
    
    // Filter labels to get only those that are nested under the parent label
    var nestedLabels = allLabels.filter(function(label) {
      return label.getName().startsWith(PARENT_LABEL_NAME + '/');
    });
    
    // Loop through each nested label
    nestedLabels.forEach(function(label) {
      var labelParts = label.getName().split("/");
      var thresholdDays = parseInt(labelParts.pop(), 10);
      
      // Skip label if thresholdDays is not a proper number
      if (isNaN(thresholdDays)) {
        return;
      }
      
      var threads = label.getThreads();
      
      // Process threads in batches to avoid script runtime limits
      var batchSize = 100; // Adjust batch size as needed
      for (var i = 0; i < threads.length; i += batchSize) {
        var batch = threads.slice(i, i + batchSize);
        
        // Loop through each thread in the current batch
        batch.forEach(function(thread) {
          var lastMessageDate = thread.getLastMessageDate();
          var ageInDays = (currentDate - lastMessageDate) / (1000 * 60 * 60 * 24);
          
          // Check if the email is older than the thresholdDays
          if (ageInDays > thresholdDays) {
            thread.moveToTrash();
          }
        });
      }
    });
  } catch (e) {
    console.error('An error occurred: ' + e.message);
  }
}


function deleteAllEmailsWithLabel() {
  try {
    // Get the parent label
    var parentLabel = GmailApp.getUserLabelByName(PARENT_LABEL_NAME);
    
    // Check if the parent label exists
    if (!parentLabel) {
      console.error('Label not found: ' + PARENT_LABEL_NAME);
      return;
    }
    
    // Get all threads under the parent label
    var threads = parentLabel.getThreads();
    
    // Process threads in batches to avoid script runtime limits
    var batchSize = 100; // Adjust batch size as needed
    for (var i = 0; i < threads.length; i += batchSize) {
      var batch = threads.slice(i, i + batchSize);
      
      // Loop through each thread in the current batch and move them to trash
      batch.forEach(function(thread) {
        thread.moveToTrash();
      });
    }
  } catch (e) {
    console.error('An error occurred: ' + e.message);
  }
}
