const PARENT_LABEL_NAME = "Auto Delete"; 
const RETENTION_PERIODS = ["7", "30", "60"]; // Optional retention periods for emails

function installAddon(){
  createLabels();
  createDailyTrigger();
  Logger.log("Add on installed successfully!")
}

function deleteAddon(){
  deleteLabels();
  deleteDailyTriggers();
  Logger.log("Add on removed successfully!")
}


function createLabels() {
  // Create the parent label
  var parentLabel = GmailApp.createLabel(PARENT_LABEL_NAME);

  // Create child labels nested under the parent label
  RETENTION_PERIODS.forEach(function(childLabel) {
    GmailApp.createLabel(PARENT_LABEL_NAME + "/" + childLabel);
  });

  Logger.log('Labels created successfully!');
}

function deleteLabels() {

  // Delete child labels nested under the parent label
  RETENTION_PERIODS.forEach(function(childLabel) {
    var label = GmailApp.getUserLabelByName(parentLabelName + "/" + childLabel);
    if (label) {
      label.deleteLabel();
    }
  });

  // Delete the parent label
  var parentLabel = GmailApp.getUserLabelByName(PARENT_LABEL_NAME);
  if (parentLabel) {
    parentLabel.deleteLabel();
  }

  Logger.log('Labels deleted successfully');
}


function createDailyTrigger() {
  deleteDailyTriggers(); // Delete any existing triggers first
  ScriptApp.newTrigger('deleteOldEmails')
    .timeBased()
    .atHour(2)  // Set the hour you want the script to run (24-hour format)
    .everyDays(1)  // Run the script every day
    .create();
  Logger.log("Daily Triggers created successfully!")
}

function deleteDailyTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == 'deleteOldEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
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
