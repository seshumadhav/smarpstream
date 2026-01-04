# Regression Test Suite for SmarpStream

This document outlines the regression tests to verify all recent changes and bug fixes.

## Test Environment Setup

1. Start the server: `npm start` (or `node server/index.js` in production)
2. Open the application in a browser
3. Use two different browsers/devices for multi-user testing

## Test Categories

### 1. Chat History Tests

#### Test 1.1: Chat History for Late Joiners
**Steps:**
1. User 1 creates a session and sends 3-5 chat messages
2. User 2 joins the same session
3. Verify User 2 sees all previous messages from User 1

**Expected Result:** User 2 should see all chat messages sent before they joined

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 1.2: Chat History Persistence
**Steps:**
1. User 1 sends messages: "Hello", "How are you?", "Test message"
2. User 2 joins
3. Verify messages appear in correct order with timestamps

**Expected Result:** All messages displayed in chronological order with proper timestamps

**Status:** ✅ PASS / ❌ FAIL

---

### 2. Video Functionality Tests

#### Test 2.1: Self Video Display
**Steps:**
1. Join a session
2. Click video toggle button to enable video
3. Verify self video appears in local video panel

**Expected Result:** Self video should appear in the "You" panel

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 2.2: Remote Video Display
**Steps:**
1. User 1 joins and enables video
2. User 2 joins and enables video
3. Verify User 1 sees User 2's video
4. Verify User 2 sees User 1's video

**Expected Result:** Both users should see each other's video in the remote participant panel

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 2.3: Video Toggle Functionality
**Steps:**
1. Enable video
2. Click video toggle to disable
3. Verify video disappears
4. Click again to enable
5. Verify video reappears

**Expected Result:** Video should toggle on/off correctly

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 2.4: Video on Reconnection
**Steps:**
1. User 1 and User 2 are in a call with video enabled
2. User 2 disconnects and rejoins
3. Verify User 1 sees User 2's video after reconnection
4. Verify no frozen/black screen

**Expected Result:** Video should work correctly after reconnection, no frozen frames or black screens

**Status:** ✅ PASS / ❌ FAIL

---

### 3. Audio Functionality Tests

#### Test 3.1: Audio Toggle Functionality
**Steps:**
1. Join a session
2. Click audio toggle to enable
3. Speak into microphone
4. Verify mic icon shows audio intensity (blue fill)
5. Click to disable
6. Verify mic icon shows muted state

**Expected Result:** Audio should toggle correctly, mic icon should show intensity when enabled

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 3.2: Remote Audio Reception
**Steps:**
1. User 1 enables audio and speaks
2. User 2 verifies they can hear User 1
3. User 2 enables audio and speaks
4. User 1 verifies they can hear User 2

**Expected Result:** Both users should hear each other's audio

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 3.3: Audio Intensity Indicator
**Steps:**
1. Enable audio
2. Speak at different volumes (quiet, normal, loud)
3. Verify mic icon fill changes with audio intensity
4. Verify mic icon starts empty when muted

**Expected Result:** Mic icon should dynamically show audio intensity, starting empty when muted

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 3.4: Audio on Reconnection
**Steps:**
1. User 1 and User 2 are in a call with audio enabled
2. User 2 disconnects and rejoins
3. Verify audio works after reconnection

**Expected Result:** Audio should work correctly after reconnection

**Status:** ✅ PASS / ❌ FAIL

---

### 4. Image Upload Tests

#### Test 4.1: Mobile Image Upload
**Steps:**
1. On mobile device, join a session
2. Click upload button (📎)
3. Select an image from gallery
4. Verify image uploads and appears in chat

**Expected Result:** Image should upload successfully on mobile

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 4.2: Desktop Image Upload (First Upload)
**Steps:**
1. On desktop, join a session
2. Click upload button
3. Select an image
4. Verify image uploads successfully

**Expected Result:** First image upload should work

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 4.3: Desktop Image Upload (Second Upload)
**Steps:**
1. Upload first image (Test 4.2)
2. Immediately upload a second image
3. Verify second image uploads successfully

**Expected Result:** Second and subsequent uploads should work correctly

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 4.4: Image Upload Error Handling
**Steps:**
1. Try to upload a file larger than 10MB
2. Verify appropriate error message appears
3. Try to upload a non-image file
4. Verify appropriate error message appears

**Expected Result:** Error messages should appear for invalid uploads

**Status:** ✅ PASS / ❌ FAIL

---

### 5. UI/UX Tests

#### Test 5.1: View Control Panel (Mobile)
**Steps:**
1. On mobile device, join a session
2. Verify VIDEO, CHAT, and Split View buttons are visible
3. Click each button and verify view changes

**Expected Result:** View control panel should be visible and functional on mobile

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 5.2: Caption Visibility
**Steps:**
1. On home page, verify caption is visible
2. Join a call
3. Verify caption is NOT visible on call page

**Expected Result:** Caption should only appear on home page, not call page

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 5.3: Panel Minimize/Maximize
**Steps:**
1. Join a call (default split view)
2. Click VIDEO button - verify video maximizes, chat minimizes
3. Click Split View button - verify both panels visible
4. Click CHAT button - verify chat maximizes, video minimizes

**Expected Result:** Panel views should toggle correctly

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 5.4: Disconnect Confirmation Dialog
**Steps:**
1. Join a call
2. Click disconnect button
3. Verify confirmation dialog appears
4. Click Cancel - verify still in call
5. Click disconnect again
6. Click Confirm - verify navigated to home

**Expected Result:** Disconnect button should show confirmation dialog before disconnecting

**Status:** ✅ PASS / ❌ FAIL

---

### 6. Reconnection Tests

#### Test 6.1: User Disconnect and Rejoin
**Steps:**
1. User 1 and User 2 are in a call
2. User 2 disconnects
3. Verify User 1 sees User 2 leave (sound notification)
4. User 2 rejoins
5. Verify User 1 sees User 2 join (sound notification)
6. Verify video/audio work correctly

**Expected Result:** Reconnection should work smoothly, no frozen video or black screens

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 6.2: Multiple Reconnections
**Steps:**
1. User 1 and User 2 are in a call
2. User 2 disconnects and rejoins 3 times
3. Verify each reconnection works correctly
4. Verify no memory leaks or duplicate video elements

**Expected Result:** Multiple reconnections should work without issues

**Status:** ✅ PASS / ❌ FAIL

---

### 7. Mobile-Specific Tests

#### Test 7.1: Mobile Layout
**Steps:**
1. Open app on mobile device
2. Verify layout is responsive
3. Verify buttons are touch-friendly (adequate size)
4. Verify chat panel scrolls correctly

**Expected Result:** Mobile layout should be responsive and usable

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 7.2: Mobile Video Display
**Steps:**
1. On mobile, join a call with video enabled
2. Verify video displays correctly (not cut off)
3. Verify video plays inline (not fullscreen)

**Expected Result:** Video should display correctly on mobile

**Status:** ✅ PASS / ❌ FAIL

---

### 8. Copy Link Tests

#### Test 8.1: Desktop Copy Link
**Steps:**
1. On desktop, join a call
2. Click copy link button
3. Paste in a text editor
4. Verify link is correct

**Expected Result:** Link should copy correctly on desktop

**Status:** ✅ PASS / ❌ FAIL

---

#### Test 8.2: Mobile Copy Link
**Steps:**
1. On mobile, join a call
2. Click copy link button
3. Paste in a text field
4. Verify link is correct

**Expected Result:** Link should copy correctly on mobile

**Status:** ✅ PASS / ❌ FAIL

---

## Test Execution Log

**Date:** _______________
**Tester:** _______________
**Environment:** Local / Production
**Browser/Device:** _______________

### Summary
- Total Tests: 25
- Passed: ___
- Failed: ___
- Pass Rate: ___%

### Failed Tests Details
(List any failed tests and error details here)

---

## Notes
- All tests should be run on both desktop and mobile browsers
- Test with Chrome, Firefox, Safari, and Edge browsers
- Test on iOS and Android devices
- Verify console for any errors during testing

