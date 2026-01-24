# Preview Engine Demo

This file demonstrates the capabilities of the new PreviewService for rendering Obsidian format content.

## Features Implemented

### 1. Obsidian Wiki Links
- Valid links: [[Test Article]] (should show as valid if article exists)
- Invalid links: [[Nonexistent Article]] (should show as invalid)
- Links with aliases: [[Test Article|Custom Display Name]]

### 2. Obsidian Image Syntax
- Basic image: ![[sample-image.png]]
- Image with path: ![[screenshots/demo.jpg]]

### 3. Obsidian Highlighting
This text has ==highlighted content== that should be rendered with a yellow background.

### 4. Obsidian Tags
Content with #software #development #obsidian tags.

### 5. Obsidian Comments
This is visible text %%this comment should be hidden in preview%% and this is also visible.

### 6. Enhanced Task Lists
- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task

### 7. Obsidian Callouts
> [!NOTE]
> This is a note callout that should be styled specially.

> [!WARNING]
> This is a warning callout with different styling.

### 8. Code Blocks with Copy Button
```javascript
const previewService = new PreviewService()
const html = previewService.renderPreview(content)
console.log(html)
```

### 9. Tables with Responsive Wrapper
| Feature | Status | Notes |
|---------|--------|-------|
| Wiki Links | ✅ | Fully implemented |
| Images | ✅ | With validation |
| Highlighting | ✅ | Obsidian syntax |

### 10. External Links
Check out [Obsidian](https://obsidian.md) for more information.

## Statistics
This content should generate statistics showing:
- Word count
- Character count
- Reading time estimate
- Number of images
- Number of links

## Validation
The preview engine validates:
- Whether wiki links point to existing articles
- Whether image references point to valid image files
- Syntax errors in Obsidian format