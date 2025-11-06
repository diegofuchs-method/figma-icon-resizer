# Batch Creation Feature - Implementation Plan

## Overview
Add ability to create multiple component sets at once by selecting multiple frames in Figma. Each frame's name becomes the icon name for its component set.

## 1. UI Changes

### Mode Toggle (After Header, Before Steps)
- Segmented button or radio buttons: "Single" | "Batch"
- Default to "Single" mode
- Changes form behavior dynamically

### Icon Name Input
- **Single mode:** Visible and required (current behavior)
- **Batch mode:** Hidden or disabled with message "Icons will use their frame names"

### Button Text
- **Single mode:** "Create component set"
- **Batch mode:** "Create component sets"

### Step 2 Description Update
- **Single mode:** Current text
- **Batch mode:** "Make sure each selected frame is named what you want the icon to be"

## 2. Logic Flow

### Single Mode (Current)
- User enters icon name
- Clicks button
- Creates 1 component set
- Shows success/error banner

### Batch Mode (New)
- User selects multiple frames (2+ required)
- Mode toggle shows "Batch"
- Icon name input is hidden
- Button is enabled (no input required)
- User clicks button
- Plugin processes each frame independently using frame names
- Shows summary at end

### Important Edge Case: Single Frame in Batch Mode
**Decision:** Option B - Validate & Block
- Require 2+ frames in batch mode
- If only 1 frame selected: Disable button, show message "Batch mode requires 2 or more frames selected"
- Guides users to use Single mode for 1 frame

## 3. Error Handling (Graceful Degradation)

When processing batch:

1. **Validate all frames first**
   - Check structure (must have group with vectors)
   - Check naming (no invalid characters)
   - Check frame count (minimum 2 for batch mode)

2. **Process each frame independently**
   - Use frame name as icon name
   - Apply validation to each name
   - Create component set for each valid frame
   - Catch errors per frame without stopping batch

3. **Collect Results**
   - ✅ Successful creations: frame names
   - ❌ Failed creations: frame name + error reason

4. **Show Summary Message**
   - Example: "Created 3 component sets. 1 failed: my-icon (invalid characters in name)"
   - All successful sets remain even if some fail

## 4. Code Changes Required

### HTML (ui.html)
- Add mode toggle (segmented button/radio)
- Add conditional CSS classes for hiding/disabling input
- Add mode-specific help text in steps
- Update button text dynamically

### JavaScript (ui.html)
- Add event listeners for mode toggle
- Toggle input visibility/disabled state based on mode
- Update button text based on mode
- Modify click handler to:
  - Detect mode (single vs batch)
  - Send appropriate data to plugin
  - Handle batch-specific error formatting

### TypeScript (code.ts)
- Add batch processing function
- Update message handler to accept mode parameter
- **Single mode:** Current behavior (use input field value as icon name)
- **Batch mode:**
  - Get all selected frames (2+ required)
  - Use frame name as icon name for each
  - Process frames sequentially
  - Collect results (successes + failures)
  - Send back summary message
- Update positioning logic:
  - Single mode: Current behavior (80px to right of selected frame)
  - Batch mode: Stack vertically 80px apart

## 5. Positioning for Batch Output

**Single Mode:**
- Current behavior: 80px to right of selected frame

**Batch Mode:**
- Stack vertically below each other
- First component set at same Y as first frame
- Each subsequent set: Y position += previous height + 80px
- All aligned to same X (start from rightmost frame position or origin)

## 6. Testing Checkpoints

- [ ] Mode toggle appears and switches between Single/Batch
- [ ] Input field hides/shows correctly based on mode
- [ ] Button text changes correctly ("Create component set" vs "Create component sets")
- [ ] Single mode still works (regression test - current functionality unchanged)
- [ ] Batch mode validates selection (requires 2+ frames)
- [ ] Batch mode processes multiple frames
- [ ] Error handling shows summary message correctly
- [ ] Vertical stacking works with correct spacing
- [ ] Modal height accommodates any error messages without forcing scroll
- [ ] Frame names are properly validated in batch mode

## 7. Sample User Flows

### Single Mode (Current)
1. Select 1 frame
2. Enter "chevron-right"
3. Click "Create component set"
4. Result: 1 component set created

### Batch Mode (New - Success)
1. Select 4 frames (named: arrow-up, arrow-down, chevron-right, chevron-left)
2. Toggle to "Batch"
3. Icon Name input hides
4. Click "Create component sets"
5. Result: 4 component sets created, stacked vertically

### Batch Mode (With Error)
1. Select 4 frames (1 has invalid character in name)
2. Toggle to "Batch"
3. Click "Create component sets"
4. Result: "Created 3 component sets. 1 failed: arrow/down (invalid characters)"

### Batch Mode (Insufficient Selection)
1. Select 1 frame
2. Toggle to "Batch"
3. Button is disabled
4. Message: "Batch mode requires 2 or more frames selected"

## Next Steps
When resuming:
1. Review this plan
2. Confirm edge case handling (single frame validation)
3. Discuss any additional modifications
4. Begin implementation with testing checkpoints
