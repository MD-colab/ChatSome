rules_version = '2';
service cloud.firestore {
  // Helper functions for readability
  // -------------------------------------------------

  // چیک کرے گا کہ data object میں gives field موجود ہے اور وہ string type کا ہے
  function isStringField(data, field) {
    return field in data && data[field] is string;
  }

  // چیک کرے گا کہ data object میں gives field موجود ہے اور وہ boolean type کا ہے
  function isBooleanField(data, field) {
    return field in data && data[field] is bool;
  }

  // چیک کرے گا کہ data object میں gives field موجود ہے اور وہ timestamp type کا ہے
  function isTimestampField(data, field) {
    return field in data && data[field] is timestamp;
  }

  // چیک کرے گا کہ data object میں gives field موجود ہے اور وہ list type کا ہے
  function isListField(data, field) {
    return field in data && data[field] is list;
  }

  // Message type validation: data میں موجود 'type' فیلڈ کا جائزہ لے کر relevant فیلڈز چیک کرے
  function isValidMessageTypeOnCreate(data) {
    // پہلے type existence اور type check
    return isStringField(data, 'type')
      && (
        // Text message
        (
          data.type == 'text'
          && isStringField(data, 'text')
          // optional: اگر other fields آ سکتے ہیں تو ensure نہ ہوں، ورنہ hasOnly بھی لگا سکتے ہیں
        )
        ||
        // Media message types
        (
          data.type in ['image','video','audio','document']
          && isStringField(data, 'mediaUrl')
          && isStringField(data, 'fileName')
        )
      );
  }

  // Update کے دوران text edit validation: existing resource.data.type == 'text'
  function canEditTextMessage(resourceData, newData, authUid) {
    // صرف sender خود اپنے text message کو edit کر سکے
    return authUid == resourceData.senderId
      && resourceData.type == 'text'
      // user صرف text اور editedAt بھیج رہا ہے
      && newData.keys().hasOnly(['text', 'editedAt'])
      && isStringField(newData, 'text')
      && isTimestampField(newData, 'editedAt');
  }

  // Update کے دوران starring validation
  function canStarUnstarMessage(newData, authUid) {
    return newData.keys().hasOnly(['starred'])
      && isBooleanField(newData, 'starred');
  }

  // Update کے دوران marking read validation
  function canMarkRead(newData, authUid) {
    return newData.keys().hasOnly(['readBy'])
      && isListField(newData, 'readBy')
      && authUid in newData.readBy;
  }

  match /databases/{database}/documents {

    // ============================
    // Users collection
    // ============================
    match /users/{userId} {
      // Authenticated users can read all user profiles
      allow read: if request.auth != null;

      // Create own profile
      allow create: if request.auth != null
                    && request.auth.uid == userId
                    // You may also enforce required fields presence here, e.g. name/email
                    ;

      // Update own profile: partial updates allowed, with type checks
      allow update: if request.auth != null
                    && request.auth.uid == userId
                    && (
                      // اگر صرف presence/status update کر رہا ہے
                      (request.resource.data.keys().hasOnly(['status', 'lastActive', 'statusMessage'])
                         && isStringField(request.resource.data, 'status')
                         && isTimestampField(request.resource.data, 'lastActive')
                         && isStringField(request.resource.data, 'statusMessage')
                      )
                      ||
                      (request.resource.data.keys().hasOnly(['status', 'lastActive'])
                         && isStringField(request.resource.data, 'status')
                         && isTimestampField(request.resource.data, 'lastActive')
                      )
                      ||
                      (request.resource.data.keys().hasOnly(['statusMessage'])
                         && isStringField(request.resource.data, 'statusMessage')
                      )
                      ||
                      // Core profile fields individually
                      (request.resource.data.keys().hasOnly(['name'])
                         && isStringField(request.resource.data, 'name')
                      )
                      ||
                      (request.resource.data.keys().hasOnly(['avatarInitial'])
                         && isStringField(request.resource.data, 'avatarInitial')
                      )
                      ||
                      (request.resource.data.keys().hasOnly(['email'])
                         && isStringField(request.resource.data, 'email')
                      )
                      ||
                      // Flexible combination of specific fields
                      (
                        request.resource.data.diff(resource.data).affectedKeys().hasAny(['name', 'email', 'avatarInitial', 'status', 'statusMessage'])
                        && (
                            // اگر key موجود ہے تو type چیک ہو
                            (!('name' in request.resource.data) || isStringField(request.resource.data, 'name'))
                            && (!('email' in request.resource.data) || isStringField(request.resource.data, 'email'))
                            && (!('avatarInitial' in request.resource.data) || isStringField(request.resource.data, 'avatarInitial'))
                            && (!('status' in request.resource.data) || isStringField(request.resource.data, 'status'))
                            && (!('statusMessage' in request.resource.data) || isStringField(request.resource.data, 'statusMessage'))
                          )
                      )
                    );
    }

    // ============================
    // Chats collection
    // ============================
    match /chats/{chatId} {
      // Read/update only if participant
      allow read, update: if request.auth != null
                          && request.auth.uid in resource.data.participants;

      // Create chat: only if current user is in participants list and exactly two participants
      allow create: if request.auth != null
                      && isListField(request.resource.data, 'participants')
                      && request.resource.data.participants.size() == 2
                      && request.auth.uid in request.resource.data.participants;

      // ============================
      // Messages subcollection
      // ============================
      match /messages/{messageId} {
        // Read only if participant in parent chat
        allow read: if request.auth != null
                       && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;

        // Create message
        allow create: if request.auth != null
                        && isStringField(request.resource.data, 'senderId')
                        && request.auth.uid == request.resource.data.senderId
                        // Participant check
                        && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants
                        // timestamp
                        && isTimestampField(request.resource.data, 'timestamp')
                        // readBy: list with exactly one element, which is sender
                        && isListField(request.resource.data, 'readBy')
                        && request.resource.data.readBy.size() == 1
                        && request.resource.data.readBy[0] == request.auth.uid
                        // starred must exist and be boolean
                        && isBooleanField(request.resource.data, 'starred')
                        // type and related fields
                        && isValidMessageTypeOnCreate(request.resource.data);

        // Update message
        allow update: if request.auth != null
                        && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants
                        && (
                          // Sender edits their own text message
                          canEditTextMessage(resource.data, request.resource.data, request.auth.uid)
                          ||
                          // Mark as read by a participant
                          canMarkRead(request.resource.data, request.auth.uid)
                          ||
                          // Star/unstar by a participant
                          canStarUnstarMessage(request.resource.data, request.auth.uid)
                        );

        // Delete message: only sender can delete their message
        allow delete: if request.auth != null
                        && isStringField(resource.data, 'senderId')
                        && request.auth.uid == resource.data.senderId
                        && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
      }
    }

  }
} 


service cloud.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload files to their specific folder in 'chat_media'
    // and read all files from 'chat_media'.
    match /chat_media/{userId}/{fileName} {
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Any authenticated user can read shared media
    }
  }
}